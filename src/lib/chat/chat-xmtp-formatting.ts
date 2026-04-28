"use client";

import { normalizeEthereumAddress, shortAddress } from "./chat-addressing";
import type { ResolvedChatTarget } from "./chat-targets";
import type { ChatConversation } from "./chat-types";
import type { XmtpDm, XmtpMessage } from "./chat-xmtp-support";

export function conversationIdOf(dm: XmtpDm): string | null {
  return typeof dm.id === "string" ? dm.id : null;
}

export function summarizeDm(dm: XmtpDm) {
  return {
    createdAt: dm?.createdAt ?? null,
    id: typeof dm?.id === "string" ? dm.id : null,
    peerAddress: typeof dm?.peerAddress === "string" ? dm.peerAddress : null,
    peerInboxId: typeof dm?.peerInboxId === "string" ? dm.peerInboxId : null,
  };
}

export function textContent(message: XmtpMessage | null | undefined): string | null {
  if (typeof message?.content === "string" && message.content.trim()) return message.content;
  if (typeof message?.fallback === "string" && message.fallback.trim()) return message.fallback;
  return null;
}

export function messageTime(message: XmtpMessage): number {
  const sentAt = message.sentAt;
  if (!(typeof sentAt === "string" || typeof sentAt === "number" || sentAt instanceof Date)) {
    return 0;
  }
  const timestamp = new Date(sentAt).getTime();
  return Number.isFinite(timestamp) ? timestamp : 0;
}

export function ethereumAddressFromIdentifiers(
  identifiers: readonly { identifier?: unknown }[] | undefined,
): `0x${string}` | null {
  if (!identifiers) return null;
  for (const identifier of identifiers) {
    const normalized = normalizeEthereumAddress(String(identifier?.identifier ?? ""));
    if (normalized) return normalized;
  }
  return null;
}

export function fallbackConversationTitle(peer: { peerAddress: `0x${string}` | null; peerInboxId: string | null }, dm: XmtpDm): string {
  if (peer.peerAddress) return shortAddress(peer.peerAddress);
  if (peer.peerInboxId) return peer.peerInboxId;
  return String(dm?.id ?? "XMTP chat");
}

export function dmCreatedAtMs(dm: XmtpDm): number {
  const createdAt = dm?.createdAt instanceof Date ? dm.createdAt.getTime() : NaN;
  if (Number.isFinite(createdAt)) return createdAt;

  const createdAtNs = dm?.createdAtNs;
  if (typeof createdAtNs === "bigint") {
    return Number(createdAtNs / 1_000_000n);
  }

  return Number.MAX_SAFE_INTEGER;
}

export function uniqueDmsById(dms: readonly XmtpDm[]): XmtpDm[] {
  const byId = new Map<string, XmtpDm>();
  for (const dm of dms) {
    const id = typeof dm?.id === "string" ? dm.id : null;
    if (!id || byId.has(id)) continue;
    byId.set(id, dm);
  }
  return [...byId.values()];
}

type CanonicalDmRecord = {
  createdAtMs: number;
  dm: XmtpDm;
  messageCount: number;
  peer: { peerAddress: `0x${string}` | null; peerInboxId: string | null };
};

export function chooseCanonicalDmRecord(records: readonly CanonicalDmRecord[]): CanonicalDmRecord | null {
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

export function conversationFromDm(
  dm: XmtpDm,
  peer: { peerAddress: `0x${string}` | null; peerInboxId: string | null },
  target?: ResolvedChatTarget | null,
  last?: XmtpMessage,
): ChatConversation {
  const peerAddress = peer.peerAddress ?? target?.address ?? null;
  const fallbackTitle = peerAddress ? shortAddress(peerAddress) : fallbackConversationTitle(peer, dm);
  return {
    avatarSeed: target?.avatarSeed ?? peerAddress ?? undefined,
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
