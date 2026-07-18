import type { HandleUpgradeQuoteResponse } from "@/lib/api/client-api-types";

export function normalizeGlobalHandleStem(value: string): string {
  const trimmed = value.trim().replace(/\.pirate$/iu, "").toLowerCase();
  if (/^[\x00-\x7F]+$/u.test(trimmed)) return trimmed;

  try {
    return new URL(`https://${trimmed}.pirate`).hostname.split(".")[0] ?? trimmed;
  } catch {
    return trimmed;
  }
}

export function isValidGlobalHandleCandidate(value: string): boolean {
  const label = normalizeGlobalHandleStem(value);
  if (label.length < 3 || label.length > 30) return false;
  return /^[a-z0-9]+(?:-[a-z0-9]+)*$/u.test(label) || /^xn--[a-z0-9-]+$/u.test(label);
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
