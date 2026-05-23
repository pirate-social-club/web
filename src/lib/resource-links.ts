export type ResourceLinkId =
  | "advertise"
  | "blog"
  | "account-deletion"
  | "child-safety"
  | "terms-of-service"
  | "privacy-policy"
  | "source-github"
  | "source-freedom-browser"
  | "source-radicle-api"
  | "source-radicle-contracts"
  | "source-radicle-web";

export interface ResolveResourceHrefOptions {
  preferNativeRadicle?: boolean;
}

const RADICLE_REPOSITORIES = {
  api: {
    explorerNode: "iris.radicle.xyz",
    rid: "z2g5M6jqfcwzJobizqRbNCakDsdpU",
  },
  contracts: {
    explorerNode: "radicle.jarg.io",
    rid: "zWrB9TTk3sZ5SfSPv5Z8gbq5sbvb",
  },
  web: {
    explorerNode: "iris.radicle.xyz",
    rid: "z3qZx2qJDkjxfjBSPwRva4DutYJTh",
  },
} as const;

type RadicleRepositoryKey = keyof typeof RADICLE_REPOSITORIES;

interface FreedomBrowserWindow extends Window {
  electronAPI?: unknown;
  ethereum?: {
    isFreedomBrowser?: boolean;
    request?: unknown;
  };
  freedomBrowser?: {
    isFreedomBrowser?: boolean;
  };
  swarm?: {
    isFreedomBrowser?: boolean;
  };
  freedomAPI?: unknown;
  internalPages?: unknown;
  nodeConfig?: unknown;
  radicle?: unknown;
  wallet?: unknown;
}

export type FreedomBrowserDetectionSnapshot = {
  detected: boolean;
  explicitFreedomBrowserMarker: boolean;
  ethereumIsFreedomBrowser: boolean;
  ethereumPresent: boolean;
  ethereumRequestPresent: boolean;
  freedomApiPresent: boolean;
  freedomShellBridgePresent: boolean;
  hasWindow: boolean;
  swarmIsFreedomBrowser: boolean;
  swarmPresent: boolean;
  userAgent: string | null;
};

export function getFreedomBrowserDetectionSnapshot(): FreedomBrowserDetectionSnapshot {
  if (typeof window === "undefined") {
    return {
      detected: false,
      explicitFreedomBrowserMarker: false,
      ethereumIsFreedomBrowser: false,
      ethereumPresent: false,
      ethereumRequestPresent: false,
      freedomApiPresent: false,
      freedomShellBridgePresent: false,
      hasWindow: false,
      swarmIsFreedomBrowser: false,
      swarmPresent: false,
      userAgent: null,
    };
  }

  const freedomWindow = window as FreedomBrowserWindow;
  const ethereumPresent = Boolean(freedomWindow.ethereum);
  const swarmPresent = Boolean(freedomWindow.swarm);
  const explicitFreedomBrowserMarker = freedomWindow.freedomBrowser?.isFreedomBrowser === true;
  const ethereumIsFreedomBrowser = freedomWindow.ethereum?.isFreedomBrowser === true;
  const swarmIsFreedomBrowser = freedomWindow.swarm?.isFreedomBrowser === true;
  const freedomShellBridgePresent = Boolean(
    freedomWindow.electronAPI
    && freedomWindow.internalPages
    && freedomWindow.nodeConfig,
  );

  return {
    detected: explicitFreedomBrowserMarker
      || ethereumIsFreedomBrowser
      || swarmIsFreedomBrowser
      || freedomShellBridgePresent,
    explicitFreedomBrowserMarker,
    ethereumIsFreedomBrowser,
    ethereumPresent,
    ethereumRequestPresent: typeof freedomWindow.ethereum?.request === "function",
    freedomApiPresent: Boolean(freedomWindow.freedomAPI),
    freedomShellBridgePresent,
    hasWindow: true,
    swarmIsFreedomBrowser,
    swarmPresent,
    userAgent: freedomWindow.navigator?.userAgent ?? null,
  };
}

function resolveRadicleRepositoryHref(
  repository: RadicleRepositoryKey,
  options: ResolveResourceHrefOptions,
): string {
  const { explorerNode, rid } = RADICLE_REPOSITORIES[repository];
  if (options.preferNativeRadicle) {
    return `rad://${rid}`;
  }

  return `https://app.radicle.xyz/nodes/${explorerNode}/rad:${rid}`;
}

export function prefersNativeRadicleLinks(): boolean {
  return getFreedomBrowserDetectionSnapshot().detected;
}

export function resolveResourceHref(
  id: string,
  options: ResolveResourceHrefOptions = {},
): string | null {
  switch (id as ResourceLinkId) {
    case "advertise":
      return null;
    case "blog":
      return "https://blog.pirate.sc";
    case "account-deletion":
      return "/delete-account";
    case "child-safety":
      return "/child-safety";
    case "source-github":
      return "https://github.com/pirate";
    case "source-freedom-browser":
      return "https://github.com/pirate-social-club/freedom-browser/releases";
    case "source-radicle-api":
      return resolveRadicleRepositoryHref("api", options);
    case "source-radicle-contracts":
      return resolveRadicleRepositoryHref("contracts", options);
    case "source-radicle-web":
      return resolveRadicleRepositoryHref("web", options);
    case "terms-of-service":
      return "/terms";
    case "privacy-policy":
      return "/privacy";
    default:
      return null;
  }
}
