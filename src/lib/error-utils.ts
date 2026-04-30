const UNHELPFUL_NETWORK_ERRORS = new Set([
  "failed to fetch",
  "networkerror when attempting to fetch resource.",
  "networkerror when attempting to fetch resource",
  "the internet connection appears to be offline.",
  "the internet connection appears to be offline",
  "load failed",
  "network request failed",
  "unable to connect",
  "fetch failed",
  "typeerror: failed to fetch",
  "typeerror: networkerror when attempting to fetch resource.",
  "typeerror: networkerror when attempting to fetch resource",
  "typeerror: load failed",
]);

function isUnhelpfulNetworkError(message: string): boolean {
  return UNHELPFUL_NETWORK_ERRORS.has(message.trim().toLowerCase());
}

export function getErrorMessage(error: unknown, fallback: string): string {
  if (error instanceof Error && error.message.trim()) {
    if (isUnhelpfulNetworkError(error.message)) {
      return fallback;
    }
    return error.message;
  }

  if (typeof error === "string" && error.trim()) {
    if (isUnhelpfulNetworkError(error)) {
      return fallback;
    }
    return error;
  }

  return fallback;
}
