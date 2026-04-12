export type PiratePublicRuntimeEnv = {
  VITE_IPFS_GATEWAY_URL: string;
  VITE_PIRATE_API_BASE_URL: string;
  VITE_PRIVY_APP_ID: string;
};

function normalizeValue(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function readWindowRuntimeEnv(): Partial<PiratePublicRuntimeEnv> {
  if (typeof window === "undefined") {
    return {};
  }

  return window.__PIRATE_ENV__ ?? {};
}

function readGlobalRuntimeEnv(): Partial<PiratePublicRuntimeEnv> {
  return globalThis.__PIRATE_ENV__ ?? {};
}

function readProcessRuntimeEnv(): Partial<PiratePublicRuntimeEnv> {
  if (typeof process === "undefined") {
    return {};
  }

  return {
    VITE_IPFS_GATEWAY_URL: normalizeValue(process.env.VITE_IPFS_GATEWAY_URL),
    VITE_PIRATE_API_BASE_URL: normalizeValue(process.env.VITE_PIRATE_API_BASE_URL),
    VITE_PRIVY_APP_ID: normalizeValue(process.env.VITE_PRIVY_APP_ID),
  };
}

function readViteRuntimeEnv(): PiratePublicRuntimeEnv {
  return {
    VITE_IPFS_GATEWAY_URL: normalizeValue(import.meta.env.VITE_IPFS_GATEWAY_URL),
    VITE_PIRATE_API_BASE_URL: normalizeValue(import.meta.env.VITE_PIRATE_API_BASE_URL),
    VITE_PRIVY_APP_ID: normalizeValue(import.meta.env.VITE_PRIVY_APP_ID),
  };
}

function resolveValue(
  key: keyof PiratePublicRuntimeEnv,
  ...sources: Array<Partial<PiratePublicRuntimeEnv>>
): string {
  for (const source of sources) {
    const value = normalizeValue(source[key]);
    if (value) {
      return value;
    }
  }

  return "";
}

export function readPublicRuntimeEnv(): PiratePublicRuntimeEnv {
  const windowEnv = readWindowRuntimeEnv();
  const globalEnv = readGlobalRuntimeEnv();
  const viteEnv = readViteRuntimeEnv();
  const processEnv = readProcessRuntimeEnv();

  return {
    VITE_IPFS_GATEWAY_URL: resolveValue(
      "VITE_IPFS_GATEWAY_URL",
      windowEnv,
      globalEnv,
      viteEnv,
      processEnv,
    ),
    VITE_PIRATE_API_BASE_URL: resolveValue(
      "VITE_PIRATE_API_BASE_URL",
      windowEnv,
      globalEnv,
      viteEnv,
      processEnv,
    ),
    VITE_PRIVY_APP_ID: resolveValue(
      "VITE_PRIVY_APP_ID",
      windowEnv,
      globalEnv,
      viteEnv,
      processEnv,
    ),
  };
}
