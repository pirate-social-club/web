export type AssetAmountParseError = "invalid" | "precision";

export type AssetAmountParseResult =
  | { ok: true; atomic: string }
  | { ok: false; error: AssetAmountParseError };

const DECIMAL_AMOUNT = /^(?:0|[1-9]\d*)(?:\.(\d+))?$/;
const ATOMIC_AMOUNT = /^(?:0|[1-9]\d*)$/;

function validDecimals(decimals: number): boolean {
  return Number.isInteger(decimals) && decimals >= 0;
}

/**
 * Converts a human-entered decimal amount to an exact atomic-unit integer string.
 *
 * This deliberately does not pass through a JavaScript number: 18-decimal assets and uint256
 * values exceed Number's safe range. Excess fractional precision is rejected rather than rounded
 * or truncated.
 */
export function parseAssetAmount(value: string, decimals: number): AssetAmountParseResult {
  if (!validDecimals(decimals)) return { ok: false, error: "invalid" };

  const normalized = value.trim();
  const match = DECIMAL_AMOUNT.exec(normalized);
  if (!match) return { ok: false, error: "invalid" };

  const fraction = match[1] ?? "";
  if (fraction.length > decimals) return { ok: false, error: "precision" };

  const [whole = "0"] = normalized.split(".");
  const fractionalAtomic = fraction.padEnd(decimals, "0");
  const atomic = BigInt(`${whole}${fractionalAtomic}`).toString();
  return atomic === "0"
    ? { ok: false, error: "invalid" }
    : { ok: true, atomic };
}

/** Formats an atomic-unit integer string without losing precision or emitting exponent notation. */
export function formatAssetAmount(atomic: string, decimals: number): string | null {
  if (!validDecimals(decimals) || !ATOMIC_AMOUNT.test(atomic)) return null;

  const canonical = BigInt(atomic).toString();
  if (decimals === 0) return canonical;

  const padded = canonical.padStart(decimals + 1, "0");
  const whole = padded.slice(0, -decimals);
  const fraction = padded.slice(-decimals).replace(/0+$/, "");
  return fraction.length > 0 ? `${whole}.${fraction}` : whole;
}
