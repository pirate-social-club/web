"use client";

import * as React from "react";

type BadgeNavigator = Navigator & {
  clearAppBadge?: () => Promise<void>;
  setAppBadge?: (contents?: number) => Promise<void>;
};

function normalizeCount(count: number): number {
  if (!Number.isFinite(count)) return 0;
  return Math.max(0, Math.floor(count));
}

async function updateAppBadge(count: number): Promise<void> {
  if (typeof navigator === "undefined") return;

  const badgeNavigator = navigator as BadgeNavigator;
  if (!badgeNavigator.setAppBadge || !badgeNavigator.clearAppBadge) return;

  try {
    if (count > 0) {
      await badgeNavigator.setAppBadge(count);
    } else {
      await badgeNavigator.clearAppBadge();
    }
  } catch {
    // Unsupported or blocked badge surfaces should not affect the app shell.
  }
}

export function useNotificationBadges(count: number): void {
  const normalizedCount = normalizeCount(count);

  React.useEffect(() => {
    return () => {
      void updateAppBadge(0);
    };
  }, []);

  React.useEffect(() => {
    void updateAppBadge(normalizedCount);
  }, [normalizedCount]);
}
