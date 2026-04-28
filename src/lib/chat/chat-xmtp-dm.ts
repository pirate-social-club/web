"use client";

import { logger } from "@/lib/logger";
import { normalizeEthereumAddress } from "./chat-addressing";
import {
  conversationCache,
  ensureXmtpClient,
  fallbackArray,
  fallbackNull,
  getAllowedConsentStates,
  withTimeout,
  type XmtpClient,
  type XmtpDm,
  type XmtpMember,
  type XmtpMessage,
  type XmtpModule,
} from "./chat-xmtp-support";
import {
  chooseCanonicalDmRecord,
  conversationIdOf,
  dmCreatedAtMs,
  ethereumAddressFromIdentifiers,
  summarizeDm,
  uniqueDmsById,
} from "./chat-xmtp-formatting";

export type ResolvedDmPeer = {
  peerAddress: `0x${string}` | null;
  peerInboxId: string | null;
};

export type CanonicalDmRecord = {
  createdAtMs: number;
  dm: XmtpDm;
  messageCount: number;
  peer: ResolvedDmPeer;
};

export type DmMessageRecord = {
  dm: XmtpDm;
  messages: XmtpMessage[];
  peer: ResolvedDmPeer;
};

const XMTP_SYNC_STALE_MS = 30_000;
const lastSyncAtByClient = new WeakMap<object, number>();

function normalizeMemberForLog(member: XmtpMember, client: XmtpClient) {
  return {
    accountIdentifiers: Array.isArray(member.accountIdentifiers)
      ? member.accountIdentifiers.map((identifier) => ({
          identifier: typeof identifier.identifier === "string" ? identifier.identifier : null,
          identifierKind: identifier.identifierKind ?? null,
        }))
      : [],
    inboxId: typeof member.inboxId === "string" ? member.inboxId : null,
    isSelf: typeof member.inboxId === "string" ? member.inboxId === client.inboxId : false,
  };
}

export async function describeDm(dm: XmtpDm, client: XmtpClient) {
  const peerInboxId = typeof dm?.peerInboxId === "function"
    ? await fallbackNull<string | null>(dm.peerInboxId(), "dm:peer-inbox-id:failed", {
        conversationId: conversationIdOf(dm),
      })
    : typeof dm?.peerInboxId === "string"
      ? dm.peerInboxId
      : null;
  const members = typeof dm?.members === "function"
    ? await fallbackArray<XmtpMember>(dm.members(), "dm:members:failed", {
        conversationId: conversationIdOf(dm),
      })
    : [];
  const membersForLog = members.map((member) => normalizeMemberForLog(member, client));

  return {
    members: membersForLog,
    membersJson: JSON.stringify(membersForLog),
    peerInboxId: typeof peerInboxId === "string" ? peerInboxId : null,
  };
}

export async function resolveDmPeer(dm: XmtpDm, client: XmtpClient): Promise<ResolvedDmPeer> {
  const directPeerAddress = normalizeEthereumAddress(String(dm?.peerAddress ?? ""));
  const directPeerInboxId = typeof dm?.peerInboxId === "string" ? dm.peerInboxId : null;
  if (directPeerAddress || directPeerInboxId) {
    return {
      peerAddress: directPeerAddress,
      peerInboxId: directPeerInboxId,
    };
  }

  const resolvedPeerInboxId = typeof dm?.peerInboxId === "function"
    ? await fallbackNull<string | null>(dm.peerInboxId(), "dm:peer-inbox-id:failed", {
        conversationId: conversationIdOf(dm),
      })
    : null;
  const members = typeof dm?.members === "function"
    ? await fallbackArray<XmtpMember>(dm.members(), "dm:members:failed", {
        conversationId: conversationIdOf(dm),
      })
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

export async function buildCanonicalDmRecord(client: XmtpClient, dm: XmtpDm): Promise<CanonicalDmRecord> {
  await dm.sync?.();
  const [messages, peer] = await Promise.all([
    fallbackArray<XmtpMessage>(dm.messages(), "dm:messages:failed", {
      conversationId: conversationIdOf(dm),
    }),
    resolveDmPeer(dm, client),
  ]);

  return {
    createdAtMs: dmCreatedAtMs(dm),
    dm,
    messageCount: Array.isArray(messages) ? messages.length : 0,
    peer,
  };
}

export async function listDuplicateDmCandidates(dm: XmtpDm): Promise<XmtpDm[]> {
  if (typeof dm?.duplicateDms !== "function") {
    return [];
  }

  return await fallbackArray<XmtpDm>(dm.duplicateDms(), "dm:duplicates:failed", {
    conversationId: conversationIdOf(dm),
  });
}

export function rememberCanonicalDmAliases(canonicalDm: XmtpDm, candidates: readonly XmtpDm[]) {
  const canonicalId = typeof canonicalDm?.id === "string" ? canonicalDm.id : null;
  if (!canonicalId) return;

  conversationCache.set(canonicalId, canonicalDm);
  for (const candidate of candidates) {
    const id = typeof candidate?.id === "string" ? candidate.id : null;
    if (!id) continue;
    conversationCache.set(id, canonicalDm);
  }
}

export async function resolveCanonicalDmFromCandidates(
  client: XmtpClient,
  candidates: readonly XmtpDm[],
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
      conversationId: conversationIdOf(record.dm),
      createdAtMs: record.createdAtMs,
      messageCount: record.messageCount,
      peerAddress: record.peer.peerAddress,
      peerInboxId: record.peer.peerInboxId,
    })),
    chosenConversationId: conversationIdOf(canonical.dm),
    chosenMessageCount: canonical.messageCount,
    peerInboxId: canonical.peer.peerInboxId,
    reason,
  });
  return canonical;
}

export async function resolveCanonicalDmForPeerInbox(
  client: XmtpClient,
  module: XmtpModule,
  peerInboxId: string,
  options: { reason: string; seedDm?: XmtpDm | null; listedDms?: readonly XmtpDm[] },
): Promise<CanonicalDmRecord | null> {
  const seedCluster = options.seedDm
    ? await listDuplicateDmCandidates(options.seedDm)
    : [];
  const sourceDms = options.listedDms ? [...options.listedDms] : await listDms(client, module);
  const matchingListedDms: XmtpDm[] = [];

  for (const dm of sourceDms) {
    const peer = await resolveDmPeer(dm, client);
    if (peer.peerInboxId === peerInboxId) {
      matchingListedDms.push(dm);
    }
  }

  return resolveCanonicalDmFromCandidates(
    client,
    [options.seedDm, ...seedCluster, ...matchingListedDms].filter((dm): dm is XmtpDm => Boolean(dm)),
    options.reason,
  );
}

export async function syncAllIfStale(client: XmtpClient, module: XmtpModule, force = false): Promise<void> {
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

export async function listDms(client: XmtpClient, module: XmtpModule): Promise<XmtpDm[]> {
  await syncAllIfStale(client, module);
  const dms = await client.conversations.listDms({
    consentStates: getAllowedConsentStates(module),
  });
  logger.info("[chat:xmtp] conversations:list-dms", {
    count: dms.length,
    inboxId: typeof client?.inboxId === "string" ? client.inboxId : null,
    installationId: typeof client?.installationId === "string" ? client.installationId : null,
    rows: dms.map(summarizeDm),
  });
  return dms;
}

export async function findConversationById(
  client: XmtpClient,
  module: XmtpModule,
  conversationId: string,
): Promise<XmtpDm | null> {
  if (conversationCache.has(conversationId)) {
    const cached = conversationCache.get(conversationId) ?? null;
    if (cached) return cached;
  }

  await syncAllIfStale(client, module, true);

  if (typeof client.conversations.getConversationById === "function") {
    const byId = await fallbackNull<XmtpDm | null>(
      client.conversations.getConversationById(conversationId),
      "conversation:get-by-id:failed",
      { conversationId },
    );
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

export async function inboxIdForAddress(
  client: XmtpClient,
  module: XmtpModule,
  address: `0x${string}`,
): Promise<string | null> {
  const inboxId = await withTimeout(
    client.fetchInboxIdByIdentifier({
      identifier: address,
      identifierKind: module.IdentifierKind.Ethereum,
    }),
    10_000,
    "Timed out looking up that XMTP inbox.",
  );
  return typeof inboxId === "string" && inboxId.trim() ? inboxId : null;
}
