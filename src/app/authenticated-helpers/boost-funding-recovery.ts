import type { RewardCampaignFundingQuote } from "@pirate/api-contracts";

const CAMPAIGN_STORAGE_PREFIX = "pirate_reward_campaign:";
const PENDING_FUNDING_STORAGE_PREFIX = "pirate_reward_pending_funding:";
const TERMINAL_FUNDING_STORAGE_PREFIX = "pirate_reward_terminal_funding:";
const CREATE_KEY_STORAGE_PREFIX = "pirate_reward_create_key:";
const QUOTE_KEY_STORAGE_PREFIX = "pirate_reward_quote_key:";

export const TERMINAL_FUNDING_CODES = new Set([
  "funding_failed",
  "funding_operator_incident",
  "funding_refund_pending",
  "funding_quote_expired",
  "funding_confirmed_after_quote_expiry",
  "funding_quote_already_claimed",
  "one_live",
  "conflict",
  "funding_transaction_already_consumed",
  "funding_transaction_mismatch",
]);

interface PendingFunding {
  campaignId: string;
  quote: RewardCampaignFundingQuote;
  transactionHash: string | null;
}

export interface TerminalFunding {
  campaignId: string;
  code: string;
  fundingId?: string;
  message: string;
  quoteId: string;
  transactionHash: string;
}

export function boostIdempotencyKey(prefix: string): string {
  return `${prefix}_${globalThis.crypto?.randomUUID?.() ?? `${Date.now()}_${Math.random().toString(16).slice(2)}`}`;
}

export function campaignStorageKey(communityId: string, postId: string): string {
  return `${CAMPAIGN_STORAGE_PREFIX}${communityId}:${postId}`;
}

export function pendingFundingStorageKey(communityId: string, postId: string): string {
  return `${PENDING_FUNDING_STORAGE_PREFIX}${communityId}:${postId}`;
}

export function terminalFundingStorageKey(communityId: string, postId: string): string {
  return `${TERMINAL_FUNDING_STORAGE_PREFIX}${communityId}:${postId}`;
}

export function requestKey(storageKey: string, prefix: string): string {
  const existing = globalThis.localStorage?.getItem(storageKey);
  if (existing) return existing;
  const created = boostIdempotencyKey(prefix);
  globalThis.localStorage?.setItem(storageKey, created);
  return created;
}

export function createRequestStorageKey(communityId: string, postId: string): string {
  return `${CREATE_KEY_STORAGE_PREFIX}${communityId}:${postId}`;
}

export function quoteRequestStorageKey(campaignId: string): string {
  return `${QUOTE_KEY_STORAGE_PREFIX}${campaignId}`;
}

export function readTerminalFunding(communityId: string, postId: string): TerminalFunding | null {
  try {
    const value = globalThis.localStorage?.getItem(terminalFundingStorageKey(communityId, postId));
    return value ? JSON.parse(value) as TerminalFunding : null;
  } catch {
    return null;
  }
}

export function readPendingFunding(communityId: string, postId: string): PendingFunding | null {
  try {
    const value = globalThis.localStorage?.getItem(pendingFundingStorageKey(communityId, postId));
    return value ? JSON.parse(value) as PendingFunding : null;
  } catch {
    return null;
  }
}

export function writePendingFunding(communityId: string, postId: string, pending: PendingFunding): void {
  globalThis.localStorage?.setItem(pendingFundingStorageKey(communityId, postId), JSON.stringify(pending));
}

export function terminalFundingMessage(code: string): string {
  if (code === "funding_failed") {
    return "This transaction failed on-chain. No funds were received. Start a new funding attempt.";
  }
  if (code === "funding_operator_incident") {
    return "Funding needs support review. Do not send again.";
  }
  if (code === "funding_refund_pending") {
    return "Funds were received, but the campaign was not activated. A refund is pending; do not send again.";
  }
  if (code === "funding_refunded" || code === "funding_quote_already_claimed") {
    return "Funding was refunded or already entered refund handling. The campaign was not activated.";
  }
  if (code === "funding_transaction_already_consumed" || code === "funding_transaction_mismatch") {
    return "This transaction could not fund this campaign. Support review is required; do not send again.";
  }
  return "Funds were received, but the campaign was not activated. Refund or support review is required; do not send again.";
}
