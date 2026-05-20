export function isAndroidUserAgent(userAgent: string | null | undefined): boolean {
  return /\bAndroid\b/i.test(userAgent ?? "");
}

export function isAndroidRuntime(): boolean {
  if (typeof navigator === "undefined") {
    return false;
  }
  return isAndroidUserAgent(navigator.userAgent);
}
