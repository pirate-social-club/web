"use client";

import * as React from "react";

type PrivyProviderProps = {
  children: React.ReactNode;
};

type UsePrivyResult = {
  ready: boolean;
  authenticated: boolean;
  login: (() => void) | null;
  getAccessToken: () => Promise<string | null>;
};

type UseWalletsResult = {
  ready: boolean;
  wallets: never[];
};

type UseModalStatusResult = {
  isOpen: boolean;
};

type UseAuthorizationSignatureResult = {
  generateAuthorizationSignature: () => Promise<{ signature: string }>;
};

type UseIdentityTokenResult = {
  identityToken: string | null;
};

type UseMigrateWalletsResult = {
  migrate: () => Promise<void>;
};

// TODO(auth, 2026-07-31): SSR compatibility shim owned by Web Auth.
// Remove when Privy SSR-safe imports are isolated behind the app auth boundary.
export function PrivyProvider({ children }: PrivyProviderProps) {
  return <>{children}</>;
}

export function usePrivy(): UsePrivyResult {
  return {
    ready: false,
    authenticated: false,
    login: null,
    getAccessToken: async () => null,
  };
}

export function useWallets(): UseWalletsResult {
  return {
    ready: false,
    wallets: [],
  };
}

export function useModalStatus(): UseModalStatusResult {
  return {
    isOpen: false,
  };
}

export function useAuthorizationSignature(): UseAuthorizationSignatureResult {
  return {
    generateAuthorizationSignature: async () => ({ signature: "" }),
  };
}

export function useIdentityToken(): UseIdentityTokenResult {
  return {
    identityToken: null,
  };
}

export function useMigrateWallets(): UseMigrateWalletsResult {
  return {
    migrate: async () => {},
  };
}
