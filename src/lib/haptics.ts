"use client";

type HapticPattern = number | readonly number[];

const HAPTIC_PATTERNS = {
  comment: 8,
  follow: 10,
  light: 12,
  navigation: 10,
  success: [14, 28, 18],
  warning: [20, 36, 20],
} as const;

function supportsHaptics(): boolean {
  if (typeof window === "undefined") return false;
  if (typeof navigator === "undefined" || typeof navigator.vibrate !== "function") return false;
  if (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) return false;

  return window.navigator.maxTouchPoints > 0 || window.matchMedia?.("(pointer: coarse)").matches === true;
}

function triggerHaptic(pattern: HapticPattern): void {
  if (!supportsHaptics()) return;

  try {
    navigator.vibrate(typeof pattern === "number" ? pattern : [...pattern]);
  } catch {
    // Ignore unsupported vibration errors on mobile browsers.
  }
}

export function triggerNavigationTapHaptic(): void {
  triggerHaptic(HAPTIC_PATTERNS.navigation);
}

export function triggerLikeToggleHaptic(nextLiked: boolean): void {
  triggerHaptic(nextLiked ? HAPTIC_PATTERNS.light : HAPTIC_PATTERNS.navigation);
}

export function triggerShareSuccessHaptic(): void {
  triggerHaptic(HAPTIC_PATTERNS.light);
}

export function triggerCommentTapHaptic(): void {
  triggerHaptic(HAPTIC_PATTERNS.comment);
}
