import type { HomeFeedResponse } from "@pirate/api-contracts";

interface HomeVideoFeedBootstrapResult {
  ok: boolean;
  response?: HomeFeedResponse;
}

interface HomeVideoFeedBootstrap {
  authenticated: boolean;
  locale: string;
  promise: Promise<HomeVideoFeedBootstrapResult>;
}

declare global {
  interface Window {
    __pirateHomeVideoFeedBootstrap?: HomeVideoFeedBootstrap;
  }
}

export function consumeHomeVideoFeedBootstrap(input: {
  authenticated: boolean;
  locale: string;
}): Promise<HomeFeedResponse> | null {
  if (typeof window === "undefined") return null;
  const bootstrap = window.__pirateHomeVideoFeedBootstrap;
  delete window.__pirateHomeVideoFeedBootstrap;
  if (
    !bootstrap
    || bootstrap.authenticated !== input.authenticated
    || bootstrap.locale !== input.locale
  ) {
    return null;
  }

  return bootstrap.promise.then((result) => {
    if (!result.ok || !result.response) {
      throw new Error("Pre-hydration video feed request failed");
    }
    return result.response;
  });
}
