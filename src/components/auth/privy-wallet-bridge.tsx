"use client";

import * as React from "react";
import { useWallets } from "@privy-io/react-auth";

import {
  normalizePirateConnectedEvmWallet,
  type PirateConnectedEvmWallet,
} from "@/lib/auth/privy-wallet";

export interface PrivyWalletBridgeProps {
  onWalletsChange?: (wallets: PirateConnectedEvmWallet[]) => void;
  onWalletsReadyChange?: (ready: boolean) => void;
}

function getWalletSnapshot(wallets: PirateConnectedEvmWallet[]): string {
  return JSON.stringify(
    wallets.map((wallet) => ({
      address: wallet.address,
      id: wallet.id ?? null,
      walletClientType: wallet.walletClientType ?? null,
    })),
  );
}

export function PrivyWalletBridge({
  onWalletsChange,
  onWalletsReadyChange,
}: PrivyWalletBridgeProps) {
  const { ready, wallets } = useWallets();
  const onWalletsChangeRef = React.useRef(onWalletsChange);
  const onWalletsReadyChangeRef = React.useRef(onWalletsReadyChange);
  const lastReadyRef = React.useRef<boolean | null>(null);
  const lastWalletSnapshotRef = React.useRef<string | null>(null);

  const normalizedWallets = React.useMemo(
    () => wallets
      .map((wallet) => normalizePirateConnectedEvmWallet(wallet))
      .filter((wallet): wallet is PirateConnectedEvmWallet => wallet !== null),
    [wallets],
  );
  const walletSnapshot = React.useMemo(
    () => getWalletSnapshot(normalizedWallets),
    [normalizedWallets],
  );

  React.useEffect(() => {
    onWalletsChangeRef.current = onWalletsChange;
  }, [onWalletsChange]);

  React.useEffect(() => {
    onWalletsReadyChangeRef.current = onWalletsReadyChange;
  }, [onWalletsReadyChange]);

  React.useEffect(() => {
    if (lastReadyRef.current === ready) {
      return;
    }

    lastReadyRef.current = ready;
    onWalletsReadyChangeRef.current?.(ready);
  }, [onWalletsReadyChange, ready]);

  React.useEffect(() => {
    if (lastWalletSnapshotRef.current === walletSnapshot) {
      return;
    }

    lastWalletSnapshotRef.current = walletSnapshot;
    onWalletsChangeRef.current?.(normalizedWallets);
  }, [normalizedWallets, walletSnapshot]);

  React.useEffect(() => (
    () => {
      onWalletsReadyChangeRef.current?.(false);
      onWalletsChangeRef.current?.([]);
    }
  ), []);

  return null;
}
