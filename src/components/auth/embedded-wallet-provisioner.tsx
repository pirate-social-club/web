"use client";

import * as React from "react";

import type { StoredSession } from "@/lib/api/session-store";
import {
  isPirateEmbeddedEvmWallet,
  type PirateConnectedEvmWallet,
} from "@/lib/auth/privy-wallet";

// Bounded retry schedule for provisioning a Privy embedded wallet for an authenticated user
// who has none. Privy's createOnLogin handles future logins; this covers already-authenticated
// wallet-less users (and the gap where createOnLogin only affects future login events).
export const EMBEDDED_WALLET_PROVISION_DELAYS_MS = [0, 2_000, 5_000] as const;

// Returns a stable guard key (the Pirate user id) when this authenticated user has NO embedded
// wallet and provisioning should be attempted; null otherwise. One attempt set per user; resets
// only when the user changes / logs out, or once an embedded wallet exists.
export function getEmbeddedWalletProvisionKey(
  session: StoredSession | null,
  connectedWallets: PirateConnectedEvmWallet[],
): string | null {
  if (!session) return null;
  if (connectedWallets.some(isPirateEmbeddedEvmWallet)) return null;
  return session.user.id;
}

export function EmbeddedWalletProvisioner({
  connectedWallets,
  delaysMs = EMBEDDED_WALLET_PROVISION_DELAYS_MS,
  enabled,
  onProvision,
  paused = false,
  session,
}: {
  connectedWallets: PirateConnectedEvmWallet[];
  delaysMs?: readonly number[];
  enabled: boolean;
  onProvision: () => Promise<boolean>;
  paused?: boolean;
  session: StoredSession | null;
}) {
  const provisionRef = React.useRef(onProvision);
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
  provisionRef.current = onProvision;

  React.useEffect(() => {
    const state = stateRef.current;
    const key = enabled
      ? getEmbeddedWalletProvisionKey(session, connectedWallets)
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
      void provisionRef.current().finally(() => {
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
