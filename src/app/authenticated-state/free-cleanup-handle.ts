import type { HandleUpgradeQuoteResponse } from "@/lib/api/client-api-types";

export const FREE_CLEANUP_RENAME_REASON = "Eligible for free cleanup rename";

function normalizeHandleLabel(value: string): string {
  return value.trim().replace(/\.pirate$/iu, "").toLowerCase();
}

export function isFreeCleanupHandleQuote(input: {
  cleanupRenameAvailable: boolean;
  label: string;
  quote: HandleUpgradeQuoteResponse | null | undefined;
}): boolean {
  if (!input.cleanupRenameAvailable) return false;
  const label = normalizeHandleLabel(input.label);
  if (label.length < 8) return false;
  const quote = input.quote;
  if (!quote?.eligible) return false;
  if (quote.tier !== "standard") return false;
  if ((quote.price_cents ?? 0) > 0) return false;
  const pricingTier = quote.pricing_tier;
  if (pricingTier !== "base" && pricingTier !== "discounted") return false;
  return true;
}
