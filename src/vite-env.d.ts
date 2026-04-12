/// <reference types="vite/client" />

declare module "/@vite/client";

interface PiratePublicRuntimeEnv {
  readonly VITE_IPFS_GATEWAY_URL?: string;
  readonly VITE_PIRATE_API_BASE_URL?: string;
  readonly VITE_PRIVY_APP_ID?: string;
}

interface ImportMetaEnv {
  readonly VITE_IPFS_GATEWAY_URL?: string;
  readonly VITE_PIRATE_API_BASE_URL?: string;
  readonly VITE_PRIVY_APP_ID?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

interface Window {
  __PIRATE_ENV__?: PiratePublicRuntimeEnv;
}

declare var __PIRATE_ENV__: PiratePublicRuntimeEnv | undefined;
