export type AtomicAmountProblem =
  | "missing"
  | "invalid"
  | "too_precise"
  | "zero";

export type AtomicAmountParseResult =
  | { atomic: string; ok: true }
  | { ok: false; problem: AtomicAmountProblem };

function validDecimals(decimals: number): boolean {
  return Number.isSafeInteger(decimals) && decimals >= 0 && decimals <= 36;
}

/**
 * Converts a decimal token amount directly to digit-only atomic units.
 * Deliberately never converts the amount through Number: token inputs may carry up to 36 decimals.
 */
export function parseAtomicAmountInput(value: string, decimals: number): AtomicAmountParseResult {
  if (!validDecimals(decimals)) return { ok: false, problem: "invalid" };
  const normalized = value.trim();
  if (!normalized) return { ok: false, problem: "missing" };
  if (!/^\d+(?:\.\d+)?$/u.test(normalized)) return { ok: false, problem: "invalid" };

  const [whole, fraction = ""] = normalized.split(".");
  if (fraction.length > decimals) return { ok: false, problem: "too_precise" };
  const atomic = `${whole}${fraction.padEnd(decimals, "0")}`.replace(/^0+(?=\d)/u, "");
  if (!/[1-9]/u.test(atomic)) return { ok: false, problem: "zero" };
  return { atomic, ok: true };
}

export function atomicAmountProblemLabel(problem: AtomicAmountProblem, decimals: number): string {
  return {
    invalid: "Enter a valid token amount.",
    missing: "Enter an amount.",
    too_precise: `Use no more than ${decimals} decimal places.`,
    zero: "Enter an amount greater than zero.",
  }[problem];
}
