"use client";

import * as React from "react";

import type { StoredSession } from "@/lib/api/session-store";
import {
  isPirateEmbeddedEvmWallet,
  type PirateConnectedEvmWallet,
} from "@/lib/auth/privy-wallet";

export const EMBEDDED_WALLET_RECONCILE_DELAYS_MS = [0, 1_000, 3_000] as const;

export function getEmbeddedWalletReconcileKey(
  session: StoredSession | null,
  connectedWallets: PirateConnectedEvmWallet[],
): string | null {
  if (!session) return null;

  const embeddedWallet = connectedWallets.find(isPirateEmbeddedEvmWallet);
  if (!embeddedWallet) return null;

  const embeddedAddress = embeddedWallet.address.toLowerCase();
  const alreadyAttached = session.walletAttachments.some(
    (attachment) => attachment.wallet_address.toLowerCase() === embeddedAddress,
  );
  if (alreadyAttached) return null;

  return `${session.user.id}:${embeddedAddress}`;
}

export function EmbeddedWalletSessionReconciler({
  connectedWallets,
  delaysMs = EMBEDDED_WALLET_RECONCILE_DELAYS_MS,
  enabled,
  onReconcile,
  paused = false,
  session,
}: {
  connectedWallets: PirateConnectedEvmWallet[];
  delaysMs?: readonly number[];
  enabled: boolean;
  onReconcile: () => Promise<boolean>;
  paused?: boolean;
  session: StoredSession | null;
}) {
  const reconcileRef = React.useRef(onReconcile);
  const stateRef = React.useRef<{
    attempts: number;
    key: string | null;
    timeoutId: ReturnType<typeof globalThis.setTimeout> | null;
  }>({
    attempts: 0,
    key: null,
    timeoutId: null,
  });
  const [evaluation, forceEvaluation] = React.useReducer((value: number) => value + 1, 0);
  reconcileRef.current = onReconcile;

  React.useEffect(() => {
    const state = stateRef.current;
    const key = enabled
      ? getEmbeddedWalletReconcileKey(session, connectedWallets)
      : null;

    if (state.key !== key) {
      if (state.timeoutId !== null) {
        globalThis.clearTimeout(state.timeoutId);
      }
      state.key = key;
      state.attempts = 0;
      state.timeoutId = null;
    }

    if (!key || paused || state.timeoutId !== null) {
      return;
    }

    const delay = delaysMs[state.attempts];
    if (delay === undefined) {
      return;
    }

    let disposed = false;
    state.timeoutId = globalThis.setTimeout(() => {
      state.timeoutId = null;
      state.attempts += 1;
      void reconcileRef.current().finally(() => {
        if (!disposed) {
          forceEvaluation();
        }
      });
    }, delay);

    return () => {
      disposed = true;
      if (state.timeoutId !== null) {
        globalThis.clearTimeout(state.timeoutId);
        state.timeoutId = null;
      }
    };
  }, [connectedWallets, delaysMs, enabled, evaluation, paused, session]);

  React.useEffect(() => () => {
    const state = stateRef.current;
    if (state.timeoutId !== null) {
      globalThis.clearTimeout(state.timeoutId);
      state.timeoutId = null;
    }
  }, []);

  return null;
}
