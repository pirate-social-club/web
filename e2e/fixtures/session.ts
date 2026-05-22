import type { Page } from "@playwright/test";
import type { SessionExchangeResponse } from "@pirate/api-contracts";

export const sessionStorageKey = "pirate_session";
export const e2eConnectedWalletStorageKey = "pirate:e2e:connected-wallet:v1";
export const e2eCheckoutTxRefStorageKey = "pirate:e2e:checkout-tx-ref:v1";

export type StoredSession = {
  accessToken: string;
  user: SessionExchangeResponse["user"];
  profile: SessionExchangeResponse["profile"];
  onboarding: SessionExchangeResponse["onboarding"];
  walletAttachments: SessionExchangeResponse["wallet_attachments"];
  storedAt: string;
};

export function createStoredSessionFromExchange(response: SessionExchangeResponse): StoredSession {
  return {
    accessToken: response.access_token,
    onboarding: response.onboarding,
    profile: response.profile,
    storedAt: new Date().toISOString(),
    user: response.user,
    walletAttachments: response.wallet_attachments,
  };
}

export async function installStoredSession(page: Page, session: StoredSession): Promise<void> {
  await page.addInitScript(({ key, storedSession }) => {
    window.localStorage.setItem(key, JSON.stringify(storedSession));
  }, {
    key: sessionStorageKey,
    storedSession: session,
  });
}

export async function installLocalE2eWallet(page: Page, input: {
  address: string;
  checkoutTxRef: string;
}): Promise<void> {
  await page.addInitScript(({ address, checkoutKey, checkoutTxRef, walletKey }) => {
    window.localStorage.setItem(checkoutKey, checkoutTxRef);
    window.localStorage.setItem(walletKey, address);
  }, {
    address: input.address,
    checkoutKey: e2eCheckoutTxRefStorageKey,
    checkoutTxRef: input.checkoutTxRef,
    walletKey: e2eConnectedWalletStorageKey,
  });
}
