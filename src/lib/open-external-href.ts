"use client";

type TelegramWebAppBridge = {
  openLink?: (url: string, options?: Record<string, unknown>) => void;
};

export function openExternalHref(href: string, options: {
  preferBrowserWindow?: boolean;
} = {}): void {
  if (typeof window === "undefined") {
    return;
  }

  try {
    const baseHref = typeof window.location?.href === "string"
      ? window.location.href
      : "https://pirate.sc/";
    const url = new URL(href, baseHref);
    if (url.protocol !== "https:" && url.protocol !== "http:") {
      return;
    }
  } catch {
    return;
  }

  if (options.preferBrowserWindow && typeof window.open === "function") {
    const opened = window.open(href, "_blank", "noopener,noreferrer");
    if (opened) {
      return;
    }
  }

  const telegramWebApp = (window as Window & {
    Telegram?: { WebApp?: TelegramWebAppBridge };
  }).Telegram?.WebApp;
  if (telegramWebApp?.openLink) {
    telegramWebApp.openLink(href, { try_browser: true, try_instant_view: false });
    return;
  }

  const opened = typeof window.open === "function"
    ? window.open(href, "_blank", "noopener,noreferrer")
    : null;
  if (!opened) {
    window.location.href = href;
  }
}
