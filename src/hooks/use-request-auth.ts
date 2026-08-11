"use client";

import * as React from "react";

import { usePiratePrivyRuntime } from "@/components/auth/privy-provider";
import { toast } from "@/components/primitives/sonner";
import { isCanonicalAuthOrigin, buildCanonicalAuthUrl } from "@/lib/auth-origin";

/**
 * Reusable "prompt sign-in" action. On the canonical origin it opens the Privy login modal; on a
 * non-canonical mirror it toasts a link back to pirate.sc; if Privy isn't ready it surfaces the load
 * error. Mirrors the inline pattern used by the post / live-ticket / study CTAs so booking surfaces
 * don't each reimplement authRuntime.connect + canonical-origin handling.
 */
export function useRequestAuth(): (message: string) => void {
  const authRuntime = usePiratePrivyRuntime();
  const authConnect = authRuntime.connect;
  const authLoadError = authRuntime.loadError;
  return React.useCallback((message: string) => {
    if (!isCanonicalAuthOrigin()) {
      const canonicalUrl = buildCanonicalAuthUrl();
      toast.error(message, { action: { label: "Open in Pirate", onClick: () => { window.location.href = canonicalUrl; } } });
      return;
    }
    if (authConnect) {
      authConnect();
      return;
    }
    toast.error(authLoadError ?? message);
  }, [authConnect, authLoadError]);
}
