"use client";

import type { StoredSession } from "@/lib/api/session-store";
import type { ApiClient } from "@/lib/api/client";
import type { PirateConnectedEvmWallet } from "@/lib/auth/privy-wallet";
import { logger } from "@/lib/logger";
import { normalizeEthereumAddress, shortAddress } from "./chat-addressing";
import { rememberResolvedChatTarget, resolveChatPeerMetadata, resolveChatTarget, type ResolvedChatTarget } from "./chat-targets";
import type { ChatConversation, ChatMessageRecord } from "./chat-types";
import {
  conversationCache,
  ensureXmtpClient,
  getAllowedConsentStates,
  withTimeout,
  type XmtpClientCache,
} from "./chat-xmtp-support";

const XMTP_LOOKUP_TIMEOUT_MS = 10_000;
const XMTP_DM_TIMEOUT_MS = 10_000;
const XMTP_SYNC_STALE_MS = 30_000;
const CHAT_METADATA_TIMEOUT_MS = 3_000;

const lastSyncAtByClient = new WeakMap<object, number>();

type ResolvedDmPeer = {
  peerAddress: `0x${string}` | null;
  peerInboxId: string | null;
};

type CanonicalDmRecord = {
  createdAtMs: number;
  dm: any;
  messageCount: number;
  peer: ResolvedDmPeer;
};

async function describeDm(dm: any, client: any) {
  const peerInboxId = typeof dm?.peerInboxId === "function"
    ? await dm.peerInboxId().catch(() => null)
    : typeof dm?.peerInboxId === "string"
      ? dm.peerInboxId
      : null;
  const members = typeof dm?.members === "function"
    ? await dm.members().catch(() => [])
    : [];

  return {
    members: Array.isArray(members)
      ? members.map((member) => ({
          accountIdentifiers: Array.isArray(member?.accountIdentifiers)
            ? member.accountIdentifiers.map((identifier: any) => ({
                identifier: typeof identifier?.identifier === "string" ? identifier.identifier : null,
                identifierKind: identifier?.identifierKind ?? null,
              }))
            : [],
          inboxId: typeof member?.inboxId === "string" ? member.inboxId : null,
          isSelf: typeof member?.inboxId === "string" ? member.inboxId === client?.inboxId : false,
        }))
      : [],
    membersJson: Array.isArray(members)
      ? JSON.stringify(members.map((member) => ({
          accountIdentifiers: Array.isArray(member?.accountIdentifiers)
            ? member.accountIdentifiers.map((identifier: any) => ({
                identifier: typeof identifier?.identifier === "string" ? identifier.identifier : null,
                identifierKind: identifier?.identifierKind ?? null,
              }))
            : [],
          inboxId: typeof member?.inboxId === "string" ? member.inboxId : null,
          isSelf: typeof member?.inboxId === "string" ? member.inboxId === client?.inboxId : false,
        })))
      : "[]",
    peerInboxId: typeof peerInboxId === "string" ? peerInboxId : null,
  };
}

function summarizeDm(dm: any) {
  return {
    createdAt: dm?.createdAt ?? null,
    id: typeof dm?.id === "string" ? dm.id : null,
    peerAddress: typeof dm?.peerAddress === "string" ? dm.peerAddress : null,
    peerInboxId: typeof dm?.peerInboxId === "string" ? dm.peerInboxId : null,
  };
}

function textContent(message: any): string | null {
  if (typeof message?.content === "string" && message.content.trim()) return message.content;
  if (typeof message?.fallback === "string" && message.fallback.trim()) return message.fallback;
  return null;
}

function messageTime(message: any): number {
  const timestamp = new Date(message?.sentAt).getTime();
  return Number.isFinite(timestamp) ? timestamp : 0;
}

function ethereumAddressFromIdentifiers(identifiers: readonly { identifier?: unknown }[] | undefined): `0x${string}` | null {
  if (!identifiers) return null;
  for (const identifier of identifiers) {
    const normalized = normalizeEthereumAddress(String(identifier?.identifier ?? ""));
    if (normalized) return normalized;
  }
  return null;
}

async function resolveDmPeer(dm: any, client: any): Promise<ResolvedDmPeer> {
  const directPeerAddress = normalizeEthereumAddress(String(dm?.peerAddress ?? ""));
  const directPeerInboxId = typeof dm?.peerInboxId === "string" ? dm.peerInboxId : null;
  if (directPeerAddress || directPeerInboxId) {
    return {
      peerAddress: directPeerAddress,
      peerInboxId: directPeerInboxId,
    };
  }

  const resolvedPeerInboxId = typeof dm?.peerInboxId === "function"
    ? await dm.peerInboxId().catch(() => null)
    : null;
  const members = typeof dm?.members === "function"
    ? await dm.members().catch(() => [])
    : [];
  const peerMember = Array.isArray(members)
    ? members.find((member) => member?.inboxId && member.inboxId !== client?.inboxId)
    : null;

  return {
    peerAddress: ethereumAddressFromIdentifiers(peerMember?.accountIdentifiers),
    peerInboxId: (typeof resolvedPeerInboxId === "string" && resolvedPeerInboxId)
      || (typeof peerMember?.inboxId === "string" ? peerMember.inboxId : null),
  };
}

function fallbackConversationTitle(peer: ResolvedDmPeer, dm: any): string {
  if (peer.peerAddress) return shortAddress(peer.peerAddress);
  if (peer.peerInboxId) return peer.peerInboxId;
  return String(dm?.id ?? "XMTP chat");
}

function dmCreatedAtMs(dm: any): number {
  const createdAt = dm?.createdAt instanceof Date ? dm.createdAt.getTime() : NaN;
  if (Number.isFinite(createdAt)) return createdAt;

  const createdAtNs = dm?.createdAtNs;
  if (typeof createdAtNs === "bigint") {
    return Number(createdAtNs / 1_000_000n);
  }

  return Number.MAX_SAFE_INTEGER;
}

function uniqueDmsById(dms: readonly any[]): any[] {
  const byId = new Map<string, any>();
  for (const dm of dms) {
    const id = typeof dm?.id === "string" ? dm.id : null;
    if (!id || byId.has(id)) continue;
    byId.set(id, dm);
  }
  return [...byId.values()];
}

async function buildCanonicalDmRecord(client: any, dm: any): Promise<CanonicalDmRecord> {
  await dm.sync?.();
  const [messages, peer] = await Promise.all([
    dm.messages().catch(() => []),
    resolveDmPeer(dm, client),
  ]);

  return {
    createdAtMs: dmCreatedAtMs(dm),
    dm,
    messageCount: Array.isArray(messages) ? messages.length : 0,
    peer,
  };
}

async function listDuplicateDmCandidates(dm: any): Promise<any[]> {
  if (typeof dm?.duplicateDms !== "function") {
    return [];
  }

  return await dm.duplicateDms().catch(() => []);
}

function chooseCanonicalDmRecord(records: readonly CanonicalDmRecord[]): CanonicalDmRecord | null {
  if (records.length === 0) return null;
  return [...records].sort((left, right) => {
    if (right.messageCount !== left.messageCount) {
      return right.messageCount - left.messageCount;
    }
    if (left.createdAtMs !== right.createdAtMs) {
      return left.createdAtMs - right.createdAtMs;
    }
    return String(left.dm?.id ?? "").localeCompare(String(right.dm?.id ?? ""));
  })[0] ?? null;
}

function rememberCanonicalDmAliases(canonicalDm: any, candidates: readonly any[]) {
  const canonicalId = typeof canonicalDm?.id === "string" ? canonicalDm.id : null;
  if (!canonicalId) return;

  conversationCache.set(canonicalId, canonicalDm);
  for (const candidate of candidates) {
    const id = typeof candidate?.id === "string" ? candidate.id : null;
    if (!id) continue;
    conversationCache.set(id, canonicalDm);
  }
}

async function resolveCanonicalDmFromCandidates(
  client: any,
  candidates: readonly any[],
  reason: string,
): Promise<CanonicalDmRecord | null> {
  const uniqueCandidates = uniqueDmsById(candidates);
  if (uniqueCandidates.length === 0) return null;

  const records = await Promise.all(uniqueCandidates.map((dm) => buildCanonicalDmRecord(client, dm)));
  const canonical = chooseCanonicalDmRecord(records);
  if (!canonical) return null;

  rememberCanonicalDmAliases(canonical.dm, uniqueCandidates);
  logger.info("[chat:xmtp] conversations:canonical-dm", {
    candidates: records.map((record) => ({
      conversationId: typeof record.dm?.id === "string" ? record.dm.id : null,
      createdAtMs: record.createdAtMs,
      messageCount: record.messageCount,
      peerAddress: record.peer.peerAddress,
      peerInboxId: record.peer.peerInboxId,
    })),
    chosenConversationId: typeof canonical.dm?.id === "string" ? canonical.dm.id : null,
    chosenMessageCount: canonical.messageCount,
    peerInboxId: canonical.peer.peerInboxId,
    reason,
  });
  return canonical;
}

async function resolveCanonicalDmForPeerInbox(
  client: any,
  module: any,
  peerInboxId: string,
  options: { reason: string; seedDm?: any | null; listedDms?: readonly any[] } ,
): Promise<CanonicalDmRecord | null> {
  const seedCluster = options.seedDm
    ? await listDuplicateDmCandidates(options.seedDm)
    : [];
  const sourceDms = options.listedDms ? [...options.listedDms] : await listDms(client, module);
  const matchingListedDms: any[] = [];

  for (const dm of sourceDms) {
    const peer = await resolveDmPeer(dm, client);
    if (peer.peerInboxId === peerInboxId) {
      matchingListedDms.push(dm);
    }
  }

  return resolveCanonicalDmFromCandidates(
    client,
    [options.seedDm, ...seedCluster, ...matchingListedDms].filter(Boolean),
    options.reason,
  );
}

function conversationFromDm(
  dm: any,
  peer: ResolvedDmPeer,
  target?: ResolvedChatTarget | null,
  last?: any,
): ChatConversation {
  const peerAddress = peer.peerAddress ?? target?.address ?? null;
  const fallbackTitle = peerAddress ? shortAddress(peerAddress) : fallbackConversationTitle(peer, dm);
  return {
    avatarUrl: target?.avatarUrl,
    id: String(dm.id),
    peerAddress: peerAddress ?? undefined,
    preview: textContent(last) ?? "Encrypted conversation",
    profileHref: target?.profileHref,
    targetLabel: target?.handle,
    title: target?.title ?? target?.handle ?? fallbackTitle,
    transport: "xmtp",
    unreadCount: 0,
    updatedAt: last ? messageTime(last) : Date.now(),
  };
}

async function syncAllIfStale(client: any, module: any, force = false): Promise<void> {
  const key = client as object;
  const lastSyncAt = lastSyncAtByClient.get(key) ?? 0;
  if (!force && Date.now() - lastSyncAt < XMTP_SYNC_STALE_MS) return;
  logger.info("[chat:xmtp] conversations:sync:start", {
    force,
    inboxId: typeof client?.inboxId === "string" ? client.inboxId : null,
    installationId: typeof client?.installationId === "string" ? client.installationId : null,
    staleForMs: Date.now() - lastSyncAt,
    topic: client?.conversations?.topic ?? null,
  });
  await client.conversations.syncAll(getAllowedConsentStates(module));
  lastSyncAtByClient.set(key, Date.now());
  logger.info("[chat:xmtp] conversations:sync:success", {
    force,
    inboxId: typeof client?.inboxId === "string" ? client.inboxId : null,
    installationId: typeof client?.installationId === "string" ? client.installationId : null,
    topic: client?.conversations?.topic ?? null,
  });
}

async function listDms(client: any, module: any): Promise<any[]> {
  await syncAllIfStale(client, module);
  const dms = await client.conversations.listDms({
    consentStates: getAllowedConsentStates(module),
  }) as any[];
  logger.info("[chat:xmtp] conversations:list-dms", {
    count: dms.length,
    inboxId: typeof client?.inboxId === "string" ? client.inboxId : null,
    installationId: typeof client?.installationId === "string" ? client.installationId : null,
    rows: dms.map(summarizeDm),
  });
  return dms;
}

async function findConversationById(client: any, module: any, conversationId: string): Promise<any | null> {
  if (conversationCache.has(conversationId)) {
    const cached = conversationCache.get(conversationId) ?? null;
    if (cached) return cached;
  }

  await syncAllIfStale(client, module, true);

  if (typeof client.conversations.getConversationById === "function") {
    const byId = await client.conversations.getConversationById(conversationId).catch(() => null);
    if (byId) {
      const peer = await resolveDmPeer(byId, client);
      const canonical = peer.peerInboxId
        ? await resolveCanonicalDmForPeerInbox(client, module, peer.peerInboxId, {
            reason: "find-conversation-by-id:getConversationById",
            seedDm: byId,
          })
        : null;
      const resolved = canonical?.dm ?? byId;
      rememberCanonicalDmAliases(resolved, [byId]);
      return resolved;
    }
  }

  const dms = await listDms(client, module);
  const found = dms.find((dm) => String(dm?.id) === conversationId) ?? null;
  if (!found) return null;

  const peer = await resolveDmPeer(found, client);
  const canonical = peer.peerInboxId
    ? await resolveCanonicalDmForPeerInbox(client, module, peer.peerInboxId, {
        listedDms: dms,
        reason: "find-conversation-by-id:list-dms",
        seedDm: found,
      })
    : null;
  const resolved = canonical?.dm ?? found;
  rememberCanonicalDmAliases(resolved, [found]);
  return resolved;
}

async function inboxIdForAddress(client: any, module: any, address: `0x${string}`): Promise<string | null> {
  const inboxId = await withTimeout(
    client.fetchInboxIdByIdentifier({
      identifier: address,
      identifierKind: module.IdentifierKind.Ethereum,
    }),
    XMTP_LOOKUP_TIMEOUT_MS,
    "Timed out looking up that XMTP inbox.",
  );
  return typeof inboxId === "string" && inboxId.trim() ? inboxId : null;
}

export async function publishChatInboxId(api: ApiClient, inboxId: string | null | undefined): Promise<void> {
  const normalizedInboxId = typeof inboxId === "string" ? inboxId.trim() : "";
  if (!normalizedInboxId) return;
  await api.profiles.publishXmtpInboxId(normalizedInboxId);
}

export async function registerChat(
  session: StoredSession,
  signerWallet: PirateConnectedEvmWallet,
  cache: XmtpClientCache,
): Promise<string | null> {
  const { client } = await ensureXmtpClient(session, { allowRegistration: true, cache, signerWallet });
  return typeof client.inboxId === "string" && client.inboxId.trim() ? client.inboxId.trim() : null;
}

export async function loadConversations(
  session: StoredSession,
  signerWallet: PirateConnectedEvmWallet,
  cache: XmtpClientCache,
  api?: ApiClient,
): Promise<ChatConversation[]> {
  const { client, module } = await ensureXmtpClient(session, { allowRegistration: false, cache, signerWallet });
  const dms = await listDms(client, module);
  const rawRecords = await Promise.all(dms.map(async (dm) => {
    conversationCache.set(String(dm.id), dm);
    await dm.sync?.();
    const [messages, peer, dmDescription, duplicateDms] = await Promise.all([
      dm.messages(),
      resolveDmPeer(dm, client),
      describeDm(dm, client),
      listDuplicateDmCandidates(dm),
    ]);
    logger.info("[chat:xmtp] conversations:dm:messages", {
      conversationId: String(dm.id),
      duplicateConversationIds: duplicateDms
        .map((candidate) => (typeof candidate?.id === "string" ? candidate.id : null))
        .filter(Boolean),
      lastMessageId: messages[messages.length - 1]?.id ?? null,
      messageCount: messages.length,
      members: dmDescription.members,
      membersJson: dmDescription.membersJson,
      resolvedDmPeerInboxId: dmDescription.peerInboxId,
      resolvedPeerAddress: peer.peerAddress,
      resolvedPeerInboxId: peer.peerInboxId,
      ...summarizeDm(dm),
    });
    return { dm, duplicateDms, messages, peer };
  }));

  const dedupedCandidates = new Map<string, { dm: any; messages: any[]; peer: ResolvedDmPeer }>();
  for (const record of rawRecords) {
    const candidateDms = uniqueDmsById([record.dm, ...record.duplicateDms]);
    for (const candidateDm of candidateDms) {
      const candidateId = typeof candidateDm?.id === "string" ? candidateDm.id : null;
      if (!candidateId || dedupedCandidates.has(candidateId)) continue;

      const candidateRecord = candidateId === String(record.dm?.id)
        ? { dm: record.dm, messages: record.messages, peer: record.peer }
        : {
            dm: candidateDm,
            messages: await candidateDm.messages().catch(() => []),
            peer: await resolveDmPeer(candidateDm, client),
          };
      dedupedCandidates.set(candidateId, candidateRecord);
    }
  }

  const grouped = new Map<string, Array<{ dm: any; messages: any[]; peer: ResolvedDmPeer }>>();
  for (const record of dedupedCandidates.values()) {
    const key = record.peer.peerInboxId ?? String(record.dm.id);
    const existing = grouped.get(key);
    if (existing) {
      existing.push(record);
    } else {
      grouped.set(key, [record]);
    }
  }

  const canonicalRecords = await Promise.all([...grouped.entries()].map(async ([key, records]) => {
    if (records.length === 1) {
      return records[0] ?? null;
    }

    const canonical = await resolveCanonicalDmFromCandidates(
      client,
      records.map((record) => record.dm),
      `load-conversations:${key}`,
    );
    if (!canonical) return records[0] ?? null;

    return records.find((record) => String(record.dm?.id) === String(canonical.dm?.id))
      ?? {
        dm: canonical.dm,
        messages: await canonical.dm.messages().catch(() => []),
        peer: canonical.peer,
      };
  }));

  const rows = await Promise.all(canonicalRecords.filter(Boolean).map(async (record) => {
    const last = record.messages[record.messages.length - 1];
    const peerAddress = record.peer.peerAddress;
    const target = peerAddress
      ? await withTimeout(
          resolveChatPeerMetadata(peerAddress, api),
          CHAT_METADATA_TIMEOUT_MS,
          "Timed out resolving chat metadata.",
        ).catch(() => null)
      : null;
    return conversationFromDm(record.dm, record.peer, target, last);
  }));
  logger.info("[chat:xmtp] conversations:load-complete", {
    count: rows.length,
    inboxId: typeof client?.inboxId === "string" ? client.inboxId : null,
    installationId: typeof client?.installationId === "string" ? client.installationId : null,
    rows: rows.map((row) => ({
      id: row.id,
      peerAddress: row.peerAddress,
      preview: row.preview,
      title: row.title,
      updatedAt: row.updatedAt,
    })),
  });
  return rows.sort((left, right) => right.updatedAt - left.updatedAt);
}

export async function loadConversationMessages(
  session: StoredSession,
  conversationId: string,
  signerWallet: PirateConnectedEvmWallet,
  cache: XmtpClientCache,
  api?: ApiClient,
): Promise<{ conversation: ChatConversation | null; messages: ChatMessageRecord[] }> {
  const { client, module } = await ensureXmtpClient(session, { allowRegistration: false, cache, signerWallet });
  const dm = await findConversationById(client, module, conversationId);
  if (!dm) return { conversation: null, messages: [] };

  await dm.sync?.();
  const rawMessages = await dm.messages() as any[];
  const peer = await resolveDmPeer(dm, client);
  const dmDescription = await describeDm(dm, client);
  logger.info("[chat:xmtp] conversation:load", {
    conversationId,
    inboxId: typeof client?.inboxId === "string" ? client.inboxId : null,
    installationId: typeof client?.installationId === "string" ? client.installationId : null,
    messageCount: rawMessages.length,
    members: dmDescription.members,
    membersJson: dmDescription.membersJson,
    resolvedDmPeerInboxId: dmDescription.peerInboxId,
    resolvedPeerAddress: peer.peerAddress,
    resolvedPeerInboxId: peer.peerInboxId,
    ...summarizeDm(dm),
  });
  const peerAddress = peer.peerAddress;
  const target = peerAddress
    ? await withTimeout(
        resolveChatPeerMetadata(peerAddress, api),
        CHAT_METADATA_TIMEOUT_MS,
        "Timed out resolving chat metadata.",
      ).catch(() => null)
    : null;
  const messages = rawMessages.flatMap((message) => {
    const content = textContent(message);
    if (!content) return [];
    return [{
      content,
      conversationId: String(dm.id),
      createdAt: messageTime(message),
      id: String(message?.id ?? `${dm.id}-${messageTime(message)}`),
      sender: message?.senderInboxId === client.inboxId ? "user" as const : "peer" as const,
    }];
  });
  return {
    conversation: conversationFromDm(dm, peer, target, rawMessages[rawMessages.length - 1]),
    messages,
  };
}

export async function openConversationTarget(
  api: ApiClient,
  session: StoredSession,
  targetInput: string,
  signerWallet: PirateConnectedEvmWallet,
  cache: XmtpClientCache,
): Promise<ChatConversation> {
  const target = await resolveChatTarget(api, targetInput);
  rememberResolvedChatTarget(target);
  const { client, module, walletAddress } = await ensureXmtpClient(session, { allowRegistration: true, cache, signerWallet });
  logger.info("[chat:xmtp] conversation:open:start", {
    selfWalletAddress: walletAddress,
    targetAddress: target.address,
    targetInput,
  });
  if (target.address.toLowerCase() === walletAddress.toLowerCase()) {
    throw new Error("You cannot message your own wallet.");
  }

  const inboxId = await inboxIdForAddress(client, module, target.address);
  logger.info("[chat:xmtp] conversation:open:target-inbox", {
    inboxId,
    targetAddress: target.address,
  });
  if (!inboxId) {
    throw new Error("No XMTP inbox was found for that target.");
  }

  const existing = await withTimeout<any | null>(
    client.conversations.getDmByInboxId(inboxId),
    XMTP_DM_TIMEOUT_MS,
    "Timed out opening that XMTP conversation.",
  );
  const canonicalExisting = await resolveCanonicalDmForPeerInbox(client, module, inboxId, {
    reason: "open-conversation-target:before-create",
    seedDm: existing,
  });
  const dm = canonicalExisting?.dm ?? await withTimeout<any>(
    client.conversations.createDm(inboxId),
    XMTP_DM_TIMEOUT_MS,
    "Timed out creating that XMTP conversation.",
  );
  const canonicalDm = await resolveCanonicalDmForPeerInbox(client, module, inboxId, {
    reason: canonicalExisting ? "open-conversation-target:canonical-existing" : "open-conversation-target:after-create",
    seedDm: dm,
  });
  const resolvedDm = canonicalDm?.dm ?? dm;
  const dmDescription = await describeDm(resolvedDm, client);
  logger.info("[chat:xmtp] conversation:open:resolved", {
    created: !canonicalExisting,
    inboxId,
    members: dmDescription.members,
    membersJson: dmDescription.membersJson,
    resolvedDmPeerInboxId: dmDescription.peerInboxId,
    ...summarizeDm(resolvedDm),
  });
  rememberCanonicalDmAliases(resolvedDm, [existing, dm].filter(Boolean));

  return conversationFromDm(resolvedDm, { peerAddress: target.address, peerInboxId: inboxId }, target, null);
}

export async function sendMessage(
  session: StoredSession,
  conversationId: string,
  content: string,
  signerWallet: PirateConnectedEvmWallet,
  cache: XmtpClientCache,
): Promise<ChatMessageRecord[]> {
  const { client, module } = await ensureXmtpClient(session, { allowRegistration: false, cache, signerWallet });
  const dm = await findConversationById(client, module, conversationId);
  if (!dm) throw new Error("Conversation not found.");
  const peer = await resolveDmPeer(dm, client);
  const canonical = peer.peerInboxId
    ? await resolveCanonicalDmForPeerInbox(client, module, peer.peerInboxId, {
        reason: "send-message",
        seedDm: dm,
      })
    : null;
  const resolvedDm = canonical?.dm ?? dm;
  const dmDescription = await describeDm(resolvedDm, client);
  logger.info("[chat:xmtp] conversation:send:start", {
    contentLength: content.length,
    canonicalConversationId: typeof resolvedDm?.id === "string" ? resolvedDm.id : null,
    conversationId,
    members: dmDescription.members,
    membersJson: dmDescription.membersJson,
    resolvedDmPeerInboxId: dmDescription.peerInboxId,
    ...summarizeDm(resolvedDm),
  });
  await resolvedDm.sendText(content);
  await resolvedDm.sync?.();
  const messages = await resolvedDm.messages() as any[];
  const syncedDescription = await describeDm(resolvedDm, client);
  logger.info("[chat:xmtp] conversation:send:success", {
    contentLength: content.length,
    canonicalConversationId: typeof resolvedDm?.id === "string" ? resolvedDm.id : null,
    conversationId,
    messageCount: messages.length,
    members: syncedDescription.members,
    membersJson: syncedDescription.membersJson,
    resolvedDmPeerInboxId: syncedDescription.peerInboxId,
    ...summarizeDm(resolvedDm),
  });
  return messages.flatMap((message) => {
    const text = textContent(message);
    if (!text) return [];
    return [{
      content: text,
      conversationId: String(resolvedDm.id),
      createdAt: messageTime(message),
      id: String(message?.id ?? `${resolvedDm.id}-${messageTime(message)}`),
      sender: message?.senderInboxId === client.inboxId ? "user" as const : "peer" as const,
    }];
  });
}
