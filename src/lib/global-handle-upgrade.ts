import type { HandleUpgradeQuoteResponse } from "@/lib/api/client-api-types";

export function normalizeGlobalHandleStem(value: string): string {
  return value.trim().replace(/\.pirate$/iu, "").toLowerCase();
}

export function isCurrentGlobalHandleCandidate(value: string, currentHandle: string): boolean {
  const candidate = normalizeGlobalHandleStem(value);
  return candidate.length > 0 && candidate === normalizeGlobalHandleStem(currentHandle);
}

export function isFreeCleanupHandleQuote(input: {
  cleanupRenameAvailable: boolean;
  label: string;
  quote: HandleUpgradeQuoteResponse | null;
}): boolean {
  const label = normalizeGlobalHandleStem(input.label);
  const pricingTier = input.quote?.pricing_tier;
  return Boolean(
    input.cleanupRenameAvailable
    && input.quote?.eligible
    && input.quote.price_cents === 0
    && (pricingTier === "base" || pricingTier === "discounted")
    && input.quote.tier === "standard"
    && label.length >= 8,
  );
}
