"use client";

type TelegramWebAppBridge = {
  openLink?: (url: string, options?: Record<string, unknown>) => void;
};

export function openExternalHref(href: string): void {
  if (typeof window === "undefined") {
    return;
  }

  const telegramWebApp = (window as Window & {
    Telegram?: { WebApp?: TelegramWebAppBridge };
  }).Telegram?.WebApp;
  if (telegramWebApp?.openLink) {
    telegramWebApp.openLink(href, { try_instant_view: false });
    return;
  }

  const opened = typeof window.open === "function"
    ? window.open(href, "_blank", "noopener,noreferrer")
    : null;
  if (!opened) {
    window.location.href = href;
  }
}
