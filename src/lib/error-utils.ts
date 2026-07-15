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

// Duck-typed to avoid importing ApiError (client.ts imports this module).
// Only unexpected server failures get a visible reference: expected 4xx
// rejections carry meaningful copy of their own, and the reference is what
// lets a user report (especially from mobile, with no DevTools) be matched
// to server logs by request id.
function unexpectedFailureReference(error: unknown): string | null {
  if (!(error instanceof Error)) {
    return null;
  }
  const status = (error as { status?: unknown }).status;
  const requestId = (error as { requestId?: unknown }).requestId;
  if (typeof status !== "number" || status < 500) {
    return null;
  }
  return typeof requestId === "string" && requestId.trim() ? requestId.trim() : null;
}

export function getErrorMessage(error: unknown, fallback: string): string {
  if (error instanceof Error && error.message.trim()) {
    if (isUnhelpfulNetworkError(error.message)) {
      return fallback;
    }
    const reference = unexpectedFailureReference(error);
    return reference ? `${error.message} (ref: ${reference})` : error.message;
  }

  if (typeof error === "string" && error.trim()) {
    if (isUnhelpfulNetworkError(error)) {
      return fallback;
    }
    return error;
  }

  return fallback;
}
