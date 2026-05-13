import type { Page } from "@playwright/test";
import type { SessionExchangeResponse } from "@pirate/api-contracts";

export const sessionStorageKey = "pirate_session";

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
