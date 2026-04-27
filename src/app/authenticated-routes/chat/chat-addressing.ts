"use client";

const ETHEREUM_ADDRESS_PATTERN = /^0x[a-fA-F0-9]{40}$/;
const HANDLE_PATTERN = /^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.(?:pirate|eth)$/i;

export function normalizeEthereumAddress(value: string): `0x${string}` | null {
  const trimmed = value.trim();
  return ETHEREUM_ADDRESS_PATTERN.test(trimmed) ? (trimmed.toLowerCase() as `0x${string}`) : null;
}

export function normalizeChatTarget(value: string): string | null {
  const trimmed = value.trim().replace(/^@/, "");
  if (!trimmed) return null;
  const address = normalizeEthereumAddress(trimmed);
  if (address) return address;
  if (HANDLE_PATTERN.test(trimmed)) return trimmed.toLowerCase();
  return null;
}

export function isChatTarget(value: string): boolean {
  return normalizeChatTarget(value) !== null;
}

export function shortAddress(address: `0x${string}`): string {
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

export function buildChatListPath(): string {
  return "/chat";
}

export function buildNewChatPath(): string {
  return "/chat/new";
}

export function buildChatConversationPath(conversationId: string): string {
  return `/chat/c/${encodeURIComponent(conversationId)}`;
}

export function buildChatTargetPath(target: string, options: { initialMessage?: string } = {}): string {
  const path = `/chat/to/${encodeURIComponent(target)}`;
  const initialMessage = options.initialMessage?.trim();
  if (!initialMessage) return path;

  const params = new URLSearchParams({ message: initialMessage });
  return `${path}?${params.toString()}`;
}
