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
