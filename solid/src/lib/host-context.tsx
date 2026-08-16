import { getRequestEvent } from "@solidjs/web";
import { createContext, useContext } from "solid-js";
import type { HostSurface } from "@pirate/web-platform";
import type { UiDirection, UiLocaleCode } from "./ui-locale-core";
import type { PublicVideoFeedPage } from "./api/public-feed";


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
    seamHost?: HostSurface;
    apiOrigin?: string;
    apiFeedResult?: { ok: boolean; itemCount: number };
    publicVideoFeed?: PublicVideoFeedPage;
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
