export function isAndroidUserAgent(userAgent: string | null | undefined): boolean {
  return /\bAndroid\b/i.test(userAgent ?? "");
}

export function isAppleMobileUserAgent(userAgent: string | null | undefined): boolean {
  return /\b(iPhone|iPad|iPod)\b/i.test(userAgent ?? "");
}

export type MobileDeviceDetectionInput = {
  coarsePointer?: boolean | null;
  hoverNone?: boolean | null;
  maxTouchPoints?: number | null;
  platform?: string | null;
  userAgent?: string | null;
  userAgentDataMobile?: boolean | null;
};

export function isMobileDevice(input: MobileDeviceDetectionInput): boolean {
  const userAgent = input.userAgent ?? "";
  if (isAndroidUserAgent(userAgent) || isAppleMobileUserAgent(userAgent)) {
    return true;
  }

  if (input.userAgentDataMobile === true) {
    return true;
  }

  const maxTouchPoints = input.maxTouchPoints ?? 0;
  const platform = input.platform ?? "";
  const isMacLike = /\bMac/i.test(platform) || /\bMacintosh\b/i.test(userAgent);
  if (isMacLike && maxTouchPoints > 1) {
    return true;
  }

  return input.coarsePointer === true && input.hoverNone === true;
}

function readUserAgentDataMobile(navigatorLike: Navigator): boolean | null {
  const withUserAgentData = navigatorLike as Navigator & {
    userAgentData?: { mobile?: boolean };
  };
  return withUserAgentData.userAgentData?.mobile ?? null;
}

function readMediaQuery(query: string): boolean | null {
  if (typeof window === "undefined" || typeof window.matchMedia !== "function") {
    return null;
  }
  return window.matchMedia(query).matches;
}

export function isMobileDeviceRuntime(): boolean {
  if (typeof navigator === "undefined") {
    return false;
  }

  return isMobileDevice({
    coarsePointer: readMediaQuery("(pointer: coarse)"),
    hoverNone: readMediaQuery("(hover: none)"),
    maxTouchPoints: navigator.maxTouchPoints,
    platform: navigator.platform,
    userAgent: navigator.userAgent,
    userAgentDataMobile: readUserAgentDataMobile(navigator),
  });
}

export function isAndroidRuntime(): boolean {
  if (typeof navigator === "undefined") {
    return false;
  }
  return isAndroidUserAgent(navigator.userAgent);
}
