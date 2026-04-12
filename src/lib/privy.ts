import type { PrivyClientConfig } from "@privy-io/react-auth";

import { readPublicRuntimeEnv } from "@/lib/public-runtime-env";

const PRIVY_CONFIG = {
  appearance: {
    accentColor: "#f97316" as const,
    theme: "dark" as const,
    showWalletLoginFirst: true,
  },
  embeddedWallets: {
    ethereum: {
      createOnLogin: "users-without-wallets" as const,
    },
    showWalletUIs: false,
  },
  loginMethods: ["wallet", "email", "google", "twitter"],
} satisfies PrivyClientConfig;

export function getPrivyAppId() {
  const appId = readPublicRuntimeEnv().VITE_PRIVY_APP_ID;
  return appId || null;
}

export function isPrivyConfigured() {
  return Boolean(getPrivyAppId());
}

export function createPrivyConfig(): PrivyClientConfig {
  return PRIVY_CONFIG;
}
