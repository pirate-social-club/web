"use client";

import type { StoredSession } from "@/lib/api/session-store";
import type { ApiClient } from "@/lib/api/client";
import type { PirateConnectedEvmWallet } from "@/lib/auth/privy-wallet";
import { logger } from "@/lib/logger";
import { rememberResolvedChatTarget, resolveChatPeerMetadata, resolveChatTarget } from "./chat-targets";
import type { ChatConversation, ChatMessageRecord } from "./chat-types";
import {
  conversationCache,
  ensureXmtpClient,
  fallbackArray,
  warnXmtpFallback,
  withTimeout,
  type XmtpClientCache,
  type XmtpDm,
  type XmtpMessage,
} from "./chat-xmtp-support";
import {
  conversationFromDm,
  conversationIdOf,
  messageTime,
  summarizeDm,
  textContent,
  uniqueDmsById,
} from "./chat-xmtp-formatting";
import {
  describeDm,
  findConversationById,
  inboxIdForAddress,
  listDuplicateDmCandidates,
  listDms,
  rememberCanonicalDmAliases,
  resolveCanonicalDmForPeerInbox,
  resolveCanonicalDmFromCandidates,
  resolveDmPeer,
  type DmMessageRecord,
} from "./chat-xmtp-dm";

const XMTP_DM_TIMEOUT_MS = 10_000;
const CHAT_METADATA_TIMEOUT_MS = 3_000;

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

  const dedupedCandidates = new Map<string, DmMessageRecord>();
  for (const record of rawRecords) {
    const candidateDms = uniqueDmsById([record.dm, ...record.duplicateDms]);
    for (const candidateDm of candidateDms) {
      const candidateId = typeof candidateDm?.id === "string" ? candidateDm.id : null;
      if (!candidateId || dedupedCandidates.has(candidateId)) continue;

      const candidateRecord = candidateId === String(record.dm?.id)
        ? { dm: record.dm, messages: record.messages, peer: record.peer }
        : {
            dm: candidateDm,
            messages: await fallbackArray<XmtpMessage>(candidateDm.messages(), "dm:messages:failed", {
              conversationId: candidateId,
            }),
            peer: await resolveDmPeer(candidateDm, client),
          };
      dedupedCandidates.set(candidateId, candidateRecord);
    }
  }

  const grouped = new Map<string, DmMessageRecord[]>();
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
        messages: await fallbackArray<XmtpMessage>(canonical.dm.messages(), "dm:messages:failed", {
          conversationId: conversationIdOf(canonical.dm),
        }),
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
        ).catch((error) => {
          warnXmtpFallback("peer-metadata:failed", error, { peerAddress });
          return null;
        })
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
  const rawMessages = await dm.messages();
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
      ).catch((error) => {
        warnXmtpFallback("peer-metadata:failed", error, { conversationId, peerAddress });
        return null;
      })
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

  const existing = await withTimeout<XmtpDm | null>(
    client.conversations.getDmByInboxId(inboxId),
    XMTP_DM_TIMEOUT_MS,
    "Timed out opening that XMTP conversation.",
  );
  const canonicalExisting = await resolveCanonicalDmForPeerInbox(client, module, inboxId, {
    reason: "open-conversation-target:before-create",
    seedDm: existing,
  });
  const dm = canonicalExisting?.dm ?? await withTimeout<XmtpDm>(
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
  rememberCanonicalDmAliases(resolvedDm, [existing, dm].filter((candidate): candidate is XmtpDm => Boolean(candidate)));

  return conversationFromDm(resolvedDm, { peerAddress: target.address, peerInboxId: inboxId }, target);
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
  const messages = await resolvedDm.messages();
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
