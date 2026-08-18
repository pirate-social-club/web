import { getRequestEvent } from "@solidjs/web";
import { createContext, useContext } from "solid-js";
import type { HostSurface } from "@pirate/web-platform";
import type { UiDirection, UiLocaleCode } from "./ui-locale-core";
import type { PublicVideoFeedPage } from "./api/public-feed";
import type { PublicProfileLoadResult } from "./api/public-profile";

export type { HostSurface } from "@pirate/web-platform";

export interface HostContextValue {
  surface: HostSurface;
  communitySlug: string | null;
  importedRoot: boolean;
  forwardingMetadataPresent: boolean;
}

const defaultHostContext: HostContextValue = {
  surface: "canonical",
  communitySlug: null,
  importedRoot: false,
  forwardingMetadataPresent: false,
};

declare module "@solidjs/web" {
  interface RequestEventLocals {
    hostContext?: HostContextValue;
    cspNonce?: string;
    bindingResult?: string;
    routeStatus?: number;
    responseStatus?: number;
    responseRedirect?: string;
    responseCacheControl?: string;
    responseVary?: string;
    seamHost?: HostSurface;
    apiOrigin?: string;
    /** Origin derived only after the request host passes the perimeter classifier. */
    canonicalOrigin?: string;
    apiFeedResult?: { ok: boolean; itemCount: number };
    publicVideoFeed?: PublicVideoFeedPage;
    profilePreload?: Promise<PublicProfileLoadResult>;
    profileResult?: PublicProfileLoadResult;
    uiLocale?: UiLocaleCode;
    uiDirection?: UiDirection;
  }
}

export const HostContext = createContext<HostContextValue>(defaultHostContext);

export function readHostContext(): HostContextValue {
  const serverContext = getRequestEvent()?.locals?.hostContext;
  if (serverContext) return serverContext;

  if (typeof document !== "undefined") {
    const root = document.documentElement.dataset;
    const surface = root.hostSurface;
    return {
      surface: surface === "sovereign-app" || surface === "sovereign-apex" ? surface : "canonical",
      communitySlug: root.communitySlug || null,
      importedRoot: root.importedRoot === "1",
      forwardingMetadataPresent: root.forwardingMetadata === "1",
    };
  }

  return defaultHostContext;
}

export function createHostContext(): HostContextValue {
  return useContext(HostContext);
}

/** Compatibility alias for routes not yet migrated to create-style accessors. */
export const useHostContext = createHostContext;
