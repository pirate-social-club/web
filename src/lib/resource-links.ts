export type ResourceLinkId =
  | "advertise"
  | "blog"
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
  swarm?: {
    isFreedomBrowser?: boolean;
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
  if (typeof window === "undefined") return false;
  return (window as FreedomBrowserWindow).swarm?.isFreedomBrowser === true;
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
    case "source-github":
      return "https://github.com/pirate";
    case "source-freedom-browser":
      return "https://github.com/pirate-social-club/freedom-browser";
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
