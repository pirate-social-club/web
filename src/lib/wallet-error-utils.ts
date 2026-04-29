const WALLET_REJECTION_PATTERNS = [
  /\buser rejected\b/i,
  /\buser denied\b/i,
  /\brejected the request\b/i,
  /\brejected the transaction\b/i,
  /\btransaction rejected\b/i,
  /\btransaction cancelled\b/i,
  /\btransaction canceled\b/i,
];

const WALLET_DIAGNOSTIC_MARKERS = [
  "Contract Call:",
  "Request Arguments:",
  "Docs:",
  "Details:",
  "Version:",
];

function readErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message.trim();
  }

  if (typeof error === "string") {
    return error.trim();
  }

  return "";
}

function stripWalletDiagnostics(message: string): string {
  let sanitized = message;

  for (const marker of WALLET_DIAGNOSTIC_MARKERS) {
    const index = sanitized.indexOf(marker);
    if (index >= 0) {
      sanitized = sanitized.slice(0, index).trim();
    }
  }

  return sanitized;
}

export function getWalletTransactionErrorMessage(error: unknown, fallback: string): string {
  const message = readErrorMessage(error);
  if (!message) {
    return fallback;
  }

  if (WALLET_REJECTION_PATTERNS.some((pattern) => pattern.test(message))) {
    return "Transaction cancelled.";
  }

  const sanitized = stripWalletDiagnostics(message);
  if (!sanitized) {
    return fallback;
  }

  if (sanitized.length > 180) {
    return fallback;
  }

  return sanitized;
}
