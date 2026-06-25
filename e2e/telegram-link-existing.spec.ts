import { expect, test, type Page, type Route } from "@playwright/test";

import {
  createMockStoredSession,
  mockCommunityId,
  mockJoinEligibility,
} from "./fixtures/auth-session";
import { installStoredSession } from "./fixtures/session";

declare global {
  interface Window {
    __telegramOpenedLinks?: string[];
    __telegramReadyCalled?: boolean;
    __telegramExpandCalled?: boolean;
    Telegram?: {
      WebApp?: {
        expand?: () => void;
        initData?: string;
        initDataUnsafe?: {
          start_param?: string;
        };
        openLink?: (url: string, options?: Record<string, unknown>) => void;
        ready?: () => void;
      };
    };
  }
}

const pirateApiPattern = /https?:\/\/(?:api-staging\.pirate\.sc|api\.pirate\.sc|127\.0\.0\.1:8787)\/.*/u;
const telegramInitData = [
  "query_id=e2e",
  `user=${encodeURIComponent(JSON.stringify({
    id: 424242,
    first_name: "Nino",
    username: "nino_e2e",
  }))}`,
  `auth_date=${Math.floor(Date.now() / 1000)}`,
  "hash=e2e",
].join("&");

function jsonResponse(body: unknown, status = 200) {
  return {
    body: JSON.stringify(body),
    contentType: "application/json",
    status,
  };
}

async function installTelegramMiniAppStub(page: Page): Promise<void> {
  await page.addInitScript(({ initData, startParam }) => {
    window.__telegramOpenedLinks = [];
    window.Telegram = {
      WebApp: {
        initData,
        initDataUnsafe: {
          start_param: startParam,
        },
        ready: () => {
          window.__telegramReadyCalled = true;
        },
        expand: () => {
          window.__telegramExpandCalled = true;
        },
        openLink: (url: string) => {
          window.__telegramOpenedLinks?.push(url);
        },
      },
    };
  }, {
    initData: telegramInitData,
    startParam: `verify_${mockCommunityId}`,
  });
}

async function installTelegramLinkApiMocks(page: Page, calls: {
  linkIntentBodies: unknown[];
}): Promise<void> {
  const session = createMockStoredSession();
  await page.route(pirateApiPattern, async (route: Route) => {
    const request = route.request();
    const url = new URL(request.url());
    const method = request.method().toUpperCase();
    const path = url.pathname;

    if (method === "POST" && path === "/analytics/events") {
      await route.fulfill({ status: 204 });
      return;
    }

    if (method === "POST" && path === "/telegram/session/auto-exchange") {
      await route.fulfill(jsonResponse({
        access_token: session.accessToken,
        community: mockCommunityId,
        eligibility: {
          ...mockJoinEligibility,
          joinable_now: false,
          missing_capabilities: ["unique_human"],
          suggested_verification_provider: "self",
          status: "verification_required",
        },
        onboarding: session.onboarding,
        profile: session.profile,
        user: session.user,
        wallet_attachments: session.walletAttachments,
      }));
      return;
    }

    if (method === "POST" && path === "/verification-sessions") {
      await route.fulfill(jsonResponse({
        id: "ver_e2e_self",
        launch: {
          self_app: {
            app_name: "Pirate",
            chain_id: 42220,
            disclosures: {},
            endpoint: "https://api.pirate.sc/verification-sessions/ver_e2e_self/self-callback",
            endpoint_type: "https",
            scope: "community_join",
            session_id: "ss_e2e_self",
            user_defined_data: "{\"verification_session_id\":\"ver_e2e_self\"}",
            user_id: "00000000-0000-4000-8000-000000000001",
            user_id_type: "uuid",
            version: 2,
          },
        },
        object: "verification_session",
        provider: "self",
        requested_capabilities: ["unique_human"],
        status: "pending",
        verification_intent: "community_join",
      }));
      return;
    }

    if (method === "POST" && path === "/telegram/link-intents") {
      calls.linkIntentBodies.push(request.postDataJSON());
      await route.fulfill(jsonResponse({
        id: "tli_e2e",
        object: "telegram_link_intent",
        community: {
          id: mockCommunityId,
          display_name: "E2E Community",
        },
        status: "pending",
        expires_at: Math.floor(Date.now() / 1000) + 15 * 60,
        telegram_user_id: "424242",
        telegram_user: {
          username: "nino_e2e",
          first_name: "Nino",
          last_name: null,
          photo_url: null,
        },
        web_url: "https://pirate.sc/tg/link-existing?token=tglink_e2e",
      }));
      return;
    }

    await route.fulfill(jsonResponse({
      code: "e2e_unhandled_api_route",
      message: `Unhandled E2E API fixture for ${method} ${path}`,
    }, 501));
  });
}

function telegramLinkIntentResource(input?: {
  csrfToken?: string;
  status?: "pending" | "completed";
}) {
  return {
    id: "tli_e2e",
    object: "telegram_link_intent",
    community: {
      id: mockCommunityId,
      display_name: "E2E Community",
    },
    status: input?.status ?? "pending",
    expires_at: Math.floor(Date.now() / 1000) + 15 * 60,
    telegram_user_id: "424242",
    telegram_user: {
      username: "nino_e2e",
      first_name: "Nino",
      last_name: null,
      photo_url: null,
    },
    ...(input?.csrfToken ? { csrf_token: input.csrfToken } : {}),
  };
}

async function installWebConfirmationApiMocks(page: Page, calls: {
  completeCsrfHeaders: Array<string | null>;
}): Promise<void> {
  const session = createMockStoredSession();
  await page.route(pirateApiPattern, async (route: Route) => {
    const request = route.request();
    const url = new URL(request.url());
    const method = request.method().toUpperCase();
    const path = url.pathname;

    if (method === "POST" && path === "/analytics/events") {
      await route.fulfill({ status: 204 });
      return;
    }

    if (method === "GET" && path === "/users/me") {
      await route.fulfill(jsonResponse(session.user));
      return;
    }

    if (method === "GET" && path === "/profiles/me") {
      await route.fulfill(jsonResponse(session.profile));
      return;
    }

    if (method === "GET" && path === "/onboarding/status") {
      await route.fulfill(jsonResponse(session.onboarding));
      return;
    }

    if (method === "GET" && path === "/notifications/summary") {
      await route.fulfill(jsonResponse({
        has_unread: false,
        open_task_count: 0,
        unread_activity_count: 0,
      }));
      return;
    }

    if (method === "GET" && path === "/telegram/link-intents/tglink_e2e") {
      await route.fulfill(jsonResponse(telegramLinkIntentResource({ csrfToken: "tlcsrf_e2e" })));
      return;
    }

    if (method === "POST" && path === "/telegram/link-intents/tglink_e2e/complete") {
      calls.completeCsrfHeaders.push(request.headers()["x-csrf-token"] ?? null);
      await route.fulfill(jsonResponse(telegramLinkIntentResource({ status: "completed" })));
      return;
    }

    await route.fulfill(jsonResponse({ items: [], next_cursor: null }));
  });
}

test.describe("Telegram existing-account link flow", () => {
  test("creates a link intent from the Self ready screen and opens the returned web URL", async ({ page }) => {
    const calls = { linkIntentBodies: [] as unknown[] };
    await installTelegramMiniAppStub(page);
    await installTelegramLinkApiMocks(page, calls);

    await page.goto(`/tg/verify/${mockCommunityId}`);

    const linkExisting = page.getByRole("button", {
      name: /already verified on pirate\? link telegram to your existing account/i,
    });
    await expect(linkExisting).toBeVisible({ timeout: 30_000 });

    await linkExisting.click();

    await expect.poll(() => calls.linkIntentBodies.length).toBe(1);
    expect(calls.linkIntentBodies[0]).toEqual({
      community_id: mockCommunityId,
      init_data: telegramInitData,
    });
    await expect.poll(() =>
      page.evaluate(() => window.__telegramOpenedLinks?.[0] ?? null)
    ).toBe("https://pirate.sc/tg/link-existing?token=tglink_e2e");
  });

  test("completes a web-authenticated link with the intent CSRF token", async ({ page }) => {
    const session = createMockStoredSession();
    const calls = { completeCsrfHeaders: [] as Array<string | null> };
    await installStoredSession(page, session);
    await installWebConfirmationApiMocks(page, calls);

    await page.goto("/tg/link-existing?token=tglink_e2e");

    await expect(page.getByText("@nino_e2e")).toBeVisible({ timeout: 30_000 });
    await page.getByRole("button", { name: /^link telegram$/i }).click();

    await expect.poll(() => calls.completeCsrfHeaders).toEqual(["tlcsrf_e2e"]);
    await expect(page.getByText("Telegram is linked to this Pirate account. Return to Telegram and send /start.")).toBeVisible();
  });
});
