"use client";

import * as React from "react";

import { trackAnalyticsEvent } from "@/lib/analytics";
import { markPromoInstalled } from "@/lib/pwa/pwa-install-storage";

interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[];
  readonly userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>;
  prompt(): Promise<void>;
}

export type PwaPromptOutcome = "accepted" | "dismissed" | null;

export type PwaInstallPromptState =
  | { kind: "unknown" }
  | { kind: "unavailable" }
  | { kind: "deferred"; event: BeforeInstallPromptEvent }
  | { kind: "ios_manual" }
  | { kind: "installed" };

let capturedEvent: BeforeInstallPromptEvent | null = null;
let globalInstalled = false;
let globalListeners = new Set<() => void>();
let lastPromptSurface = "unknown";

function emit() {
  for (const listener of globalListeners) {
    listener();
  }
}

function isStandalone(): boolean {
  if (typeof window === "undefined") return false;
  if (typeof window.matchMedia !== "function") return false;
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    // iOS Safari
    ("standalone" in navigator && (navigator as Navigator & { standalone?: boolean }).standalone === true)
  );
}

function isIOS(): boolean {
  if (typeof navigator === "undefined" || typeof navigator.userAgent !== "string") return false;
  if (/iPad|iPhone|iPod/.test(navigator.userAgent)) return true;
  if (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1) return true;
  return false;
}

function resolveInitialState(): PwaInstallPromptState {
  if (typeof window === "undefined") return { kind: "unknown" };
  if (isStandalone()) return { kind: "installed" };
  if (capturedEvent) return { kind: "deferred", event: capturedEvent };
  if (isIOS()) return { kind: "ios_manual" };
  return { kind: "unknown" };
}

function initGlobalListeners() {
  if (typeof window === "undefined") return;

  const onBeforeInstallPrompt = (e: Event) => {
    e.preventDefault();
    capturedEvent = e as BeforeInstallPromptEvent;
    emit();
  };

  const onAppInstalled = () => {
    capturedEvent = null;
    globalInstalled = true;
    markPromoInstalled();
    trackAnalyticsEvent({
      eventName: "pwa_installed",
      properties: { surface: lastPromptSurface },
    });
    emit();
  };

  window.addEventListener("beforeinstallprompt", onBeforeInstallPrompt);
  window.addEventListener("appinstalled", onAppInstalled);

  // If already standalone on load
  if (isStandalone()) {
    globalInstalled = true;
  }

  return () => {
    window.removeEventListener("beforeinstallprompt", onBeforeInstallPrompt);
    window.removeEventListener("appinstalled", onAppInstalled);
  };
}

let cleanupInit: (() => void) | null = null;

function ensureInit() {
  if (!cleanupInit) {
    cleanupInit = initGlobalListeners() ?? null;
  }
}

export interface UsePwaInstallPromptResult {
  state: PwaInstallPromptState;
  isInstalled: boolean;
  canPrompt: boolean;
  isIOS: boolean;
  promptOutcome: PwaPromptOutcome;
  promptInstall: (surface?: string) => Promise<PwaPromptOutcome>;
  promptInstallIOS: (surface?: string) => void;
}

export function usePwaInstallPrompt(): UsePwaInstallPromptResult {
  const [state, setState] = React.useState<PwaInstallPromptState>(resolveInitialState);
  const [promptOutcome, setPromptOutcome] = React.useState<PwaPromptOutcome>(null);

  React.useEffect(() => {
    ensureInit();
    const listener = () => {
      setState(resolveInitialState());
    };
    globalListeners.add(listener);
    return () => {
      globalListeners.delete(listener);
    };
  }, []);

  const promptInstall = React.useCallback(async (surface = "unknown"): Promise<PwaPromptOutcome> => {
    if (state.kind !== "deferred") return null;
    lastPromptSurface = surface;
    try {
      await state.event.prompt();
      const result = await state.event.userChoice;
      const outcome = result.outcome as PwaPromptOutcome;
      capturedEvent = null;
      setPromptOutcome(outcome);
      setState(resolveInitialState());
      emit();
      if (outcome === "accepted") {
        trackAnalyticsEvent({
          eventName: "pwa_install_prompt_accepted",
          properties: { surface },
        });
      } else if (outcome === "dismissed") {
        trackAnalyticsEvent({
          eventName: "pwa_install_prompt_dismissed",
          properties: { surface },
        });
      }
      return result.outcome as PwaPromptOutcome;
    } catch {
      capturedEvent = null;
      setPromptOutcome("dismissed");
      setState(resolveInitialState());
      emit();
      trackAnalyticsEvent({
        eventName: "pwa_install_prompt_dismissed",
        properties: { surface },
      });
      return "dismissed";
    }
  }, [state]);

  const promptInstallIOS = React.useCallback((surface = "unknown"): void => {
    trackAnalyticsEvent({
      eventName: "pwa_install_prompt_opened",
      properties: { surface, platform: "ios_manual" },
    });
  }, []);

  return {
    state,
    isInstalled: globalInstalled || state.kind === "installed",
    canPrompt: state.kind === "deferred" || state.kind === "ios_manual",
    isIOS: isIOS(),
    promptOutcome,
    promptInstall,
    promptInstallIOS,
  };
}
