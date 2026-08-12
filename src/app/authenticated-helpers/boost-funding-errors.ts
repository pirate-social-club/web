import { ApiError } from "@/lib/api/client";
import { getErrorMessage } from "@/lib/error-utils";

type BoostFundingErrorKind =
  | "wrong-network"
  | "user-rejected"
  | "wallet-unavailable"
  | "insufficient-usdc"
  | "insufficient-gas"
  | "rpc-failure"
  | "unknown";

function rawErrorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  return typeof error === "string" ? error : "";
}

/** Convert wallet and transport internals into stable, actionable categories. */
export function classifyBoostFundingError(error: unknown): BoostFundingErrorKind {
  const message = rawErrorMessage(error);
  if (/current chain of the wallet/i.test(message) && /target chain for the transaction/i.test(message)) {
    return "wrong-network";
  }
  if (/user (rejected|denied)|rejected the (request|transaction)/i.test(message)) {
    return "user-rejected";
  }
  if (/insufficient funds|gas \s*\*|intrinsic gas/i.test(message)) {
    return "insufficient-gas";
  }
  if (/insufficient|exceeds (the )?balance/i.test(message)) {
    return "insufficient-usdc";
  }
  if (/no (connected|available) wallet|wallet (is )?(not connected|unavailable|disconnected)|ethereum provider is not available/i.test(message)) {
    return "wallet-unavailable";
  }
  if (/failed to fetch|fetch failed|network error|timed? ?out|econn(reset|refused)|http request failed|\b50[23]\b|rate limit/i.test(message)) {
    return "rpc-failure";
  }
  return "unknown";
}

interface BoostFundingErrorContext {
  networkLabel?: string;
  /** A submitted transfer must be checked, never sent again. */
  submitted?: boolean;
}

export function boostFundingErrorMessage(
  error: unknown,
  fallback: string,
  context: BoostFundingErrorContext = {},
): string {
  switch (classifyBoostFundingError(error)) {
    case "wrong-network":
      return `Switch your wallet to ${context.networkLabel ?? "the required network"}, then try again. No payment was sent.`;
    case "user-rejected":
      return "You canceled the payment in your wallet. No payment was sent.";
    case "wallet-unavailable":
      return "Your wallet is not connected. Reconnect your Pirate Wallet, then try again. No payment was sent.";
    case "insufficient-usdc":
      return "Your wallet does not have enough USDC to fund this bounty. No payment was sent.";
    case "insufficient-gas":
      return "Your wallet does not have enough ETH for network fees. No payment was sent.";
    case "rpc-failure":
      return context.submitted
        ? "The network did not respond after your transfer was sent. Check status; do not send again."
        : "The network did not respond. No payment was sent; try again.";
    default:
      return error instanceof ApiError ? getErrorMessage(error, fallback) : fallback;
  }
}
