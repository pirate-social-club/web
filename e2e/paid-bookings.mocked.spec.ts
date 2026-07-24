import { expect, test, type Page } from "@playwright/test";

import { installAuthenticatedApiMocks, installMockSession } from "./fixtures/api-mocks";
import {
  createPaidBookingMockState,
  installPaidBookingApiMocks,
  type PaidBookingMockState,
} from "./fixtures/booking-mocks";
import { expectNoBrowserError } from "./fixtures/e2e-helpers";

// Tier-1 mocked-browser E2E for the paid-1:1-bookings UI journey. This proves the app SURFACES the
// booking flow and wires the right API calls — NOT money movement or media (that needs live-staging +
// a human two-device A/V check). The booking UI has no data-testids, so selectors are role + visible
// text (English copy from src/locales/generated.ts). Runs against deployed staging like the other
// mocked specs: E2E_BASE_URL=https://staging.pirate.sc bun run test:e2e.

async function installBookingFixture(page: Page, overrides: Partial<PaidBookingMockState> = {}): Promise<PaidBookingMockState> {
  await installAuthenticatedApiMocks(page);
  await installMockSession(page);
  const state = createPaidBookingMockState(overrides);
  await installPaidBookingApiMocks(page, state);
  return state;
}

const HOST = "usr_host_e2e";
const SLOT_QUERY = "start=2099-01-05T10:00:00.000Z&end=2099-01-05T10:30:00.000Z&price=5000";
function bookingPaymentForResume() {
  return {
    payment_intent_id: "bpi_hold_resumed_e2e",
    version: 2,
    chain_id: 84532,
    token_address: "0x036cbd53842c5426634e7929541ec2318f3dcf7e",
    token_decimals: 6,
    token_symbol: "USDC",
    recipient_address: "0xbba024600cba5f375afdcec401f7dccb3d515829",
    amount_atomic: "50000000",
    gross_cents: 5000,
    quote_expires_at: "2099-01-05T10:15:00.000Z",
    hold_expires_at: "2099-01-05T10:15:00.000Z",
    wallet_attachment_required: true,
  };
}

test.describe("paid bookings UI (mocked API)", () => {
  test("Settings surfaces a Bookings entry that opens /settings/bookings", async ({ page }) => {
    await installBookingFixture(page);
    await page.goto("/settings");
    const entry = page.getByRole("button", { name: "Bookings" });
    await expect(entry).toBeVisible({ timeout: 30_000 });
    await entry.click();
    await expect(page).toHaveURL(/\/settings\/bookings$/u);
    await expect(page.getByRole("heading", { name: "Booking settings" })).toBeVisible();
    await expectNoBrowserError(page);
  });

  test("/settings/bookings renders the setup controls", async ({ page }) => {
    await installBookingFixture(page);
    await page.goto("/settings/bookings");
    await expect(page.getByText("Paid 1:1 bookings")).toBeVisible({ timeout: 30_000 });
    await expect(page.locator("#booking-timezone")).toBeVisible();
    await expect(page.locator("#booking-duration")).toBeVisible();
    await expect(page.locator("#booking-price")).toBeVisible();
    await expect(page.getByRole("switch", { name: "Bookable" })).toBeVisible();
    await expectNoBrowserError(page);
  });

  test("editing the base price autosaves via POST /host-bookings/me/profile", async ({ page }) => {
    const state = await installBookingFixture(page);
    await page.goto("/settings/bookings");
    const price = page.locator("#booking-price");
    await expect(price).toBeVisible({ timeout: 30_000 });
    await price.fill("80");
    await expect
      .poll(() => state.captured.filter((c) => c.method === "POST" && c.path.endsWith("/host-bookings/me/profile")).length, { timeout: 10_000 })
      .toBeGreaterThan(0);
    await expectNoBrowserError(page);
  });

  test("the Bookable toggle publishes availability", async ({ page }) => {
    const state = await installBookingFixture(page, { isPublished: false, isBookable: false });
    await page.goto("/settings/bookings");
    const toggle = page.getByRole("switch", { name: "Bookable" });
    await expect(toggle).toBeVisible({ timeout: 30_000 });
    await expect(toggle).toBeEnabled();
    await toggle.click();
    await expect
      .poll(() => state.captured.some((c) => c.path.endsWith("/host-bookings/me/profile/publish")), { timeout: 10_000 })
      .toBe(true);
    await expectNoBrowserError(page);
  });

  test("Settings → Profile also renders the booking setup section", async ({ page }) => {
    await installBookingFixture(page);
    await page.goto("/settings/profile");
    await expect(page.getByText("Paid 1:1 bookings")).toBeVisible({ timeout: 30_000 });
    await expectNoBrowserError(page);
  });

  test("public /book/:host lists an available slot that links to checkout", async ({ page }) => {
    await installBookingFixture(page);
    await page.goto(`/book/${HOST}`);
    await expect(page.getByRole("heading", { name: "Book a session" })).toBeVisible({ timeout: 30_000 });
    const slot = page.getByRole("button", { name: /USDC/u }).first();
    await expect(slot).toBeVisible();
    await slot.click();
    await expect(page).toHaveURL(new RegExp(`/book/${HOST}/checkout\\?`, "u"));
    await expectNoBrowserError(page);
  });

  test("checkout requests a hold and a Base-Sepolia (testnet) quote without charging", async ({ page }) => {
    const state = await installBookingFixture(page);
    const holdResp = page.waitForResponse((r) => /\/bookings\/hosts\/[^/]+\/holds/u.test(r.url()) && r.request().method() === "POST");
    const quoteResp = page.waitForResponse((r) => /\/bookings\/holds\/[^/]+\/quote/u.test(r.url()) && r.request().method() === "POST");
    await page.goto(`/book/${HOST}/checkout?${SLOT_QUERY}`);
    await expect(page.getByRole("heading", { name: "Confirm booking" })).toBeVisible({ timeout: 30_000 });

    expect((await holdResp).status()).toBe(201);
    const quote = ((await (await quoteResp).json()) as { quote: { gross_cents: number; payment: { chain_id: number; amount_atomic: string } } }).quote;
    // The checkout fetched a TESTNET (Base Sepolia = 84532) quote for the expected amount — never mainnet.
    expect(quote.payment.chain_id).toBe(84532);
    expect(quote.gross_cents).toBe(5000);
    expect(quote.payment.amount_atomic).toBe("50000000"); // 50.00 USDC in 6dp atomic units
    // We must NOT have moved money — confirm is never called in the smoke.
    expect(state.captured.some((c) => c.path.endsWith("/confirm"))).toBe(false);
  });

  // Regression guard for the first-render expiry race (fixed in booking-checkout-route.tsx: the
  // countdown is now derived synchronously from the quote expiry instead of a mount-seeded 0, so a fresh
  // quote no longer trips the `quoted && countdown === 0` guard and flip to "expired"). The checkout must
  // reach the payable summary + pay button, and must NOT show the expired copy.
  test("checkout renders the quote summary and pay button without prematurely expiring", async ({ page }) => {
    await installBookingFixture(page);
    await page.goto(`/book/${HOST}/checkout?${SLOT_QUERY}`);
    await expect(page.getByText("Total", { exact: true })).toBeVisible({ timeout: 30_000 });
    await expect(page.getByText("50.00 USDC").first()).toBeVisible();
    await expect(page.getByRole("button", { name: /^Pay .*USDC/u })).toBeVisible();
    await expect(page.getByText(/hold expired/iu)).toHaveCount(0);
    await expectNoBrowserError(page);
  });

  test("checkout resumes a server-recorded payment without creating another hold", async ({ page }) => {
    const resumedBookingId = "booking_resumed_e2e";
    const state = await installBookingFixture(page, {
      resumedBookingId,
      pendingPaymentIntents: [{
        hold_id: "hold_resumed_e2e",
        payment_intent_id: "bpi_hold_resumed_e2e",
        intent_status: "verifying",
        resume_state: "confirmable",
        claimed_tx_ref: "0xserverstored",
        wallet_attachment_id: "wal_mock_primary",
        payment: bookingPaymentForResume(),
        quote_expires_at: "2099-01-05T10:15:00.000Z",
        hold_expires_at: "2099-01-05T10:15:00.000Z",
        host_user_id: HOST,
        slot_start_utc: "2099-01-05T10:00:00.000Z",
        slot_end_utc: "2099-01-05T10:30:00.000Z",
        booking_id: null,
      }],
    });
    await page.goto(`/book/${HOST}/checkout?${SLOT_QUERY}`);
    await expect(page.getByText("Booking confirmed. Your session is reserved and you will receive details shortly."))
      .toBeVisible({ timeout: 30_000 });

    const confirmation = state.captured.find((request) => request.path.endsWith("/hold_resumed_e2e/confirm"));
    expect(confirmation?.body).toEqual({
      funding_tx_ref: "0xserverstored",
      wallet_attachment_id: "wal_mock_primary",
    });
    expect(state.captured.some((request) => /\/bookings\/hosts\/[^/]+\/holds$/u.test(request.path))).toBe(false);
    await expectNoBrowserError(page);
  });

  test("management renders the approved counterparty card", async ({ page }) => {
    await installBookingFixture(page);
    await page.goto("/bookings?role=booker");
    await expect(page.getByRole("heading", { name: "Bookings" })).toBeVisible({ timeout: 30_000 });
    await expect(page.getByText("tutor.pirate")).toBeVisible();
    await expect(page.getByText("50.00 USDC")).toBeVisible();
    await expect(page.getByRole("button", { name: "Cancel booking" })).toBeVisible();
    await expectNoBrowserError(page);
  });

  test("cancellation previews terms and sends the acknowledged refund amount", async ({ page }) => {
    const state = await installBookingFixture(page);
    await page.goto("/bookings?role=booker");
    await page.getByRole("button", { name: "Cancel booking" }).click();
    await expect(page.getByRole("dialog")).toBeVisible();
    await expect(page.getByText("50.00 USDC").first()).toBeVisible();
    await page.getByRole("button", { name: "Confirm cancellation" }).click();
    await expect.poll(() => state.managementBookingCancelled).toBe(true);
    const cancel = state.captured.find((request) => request.path.endsWith("/booking_management_e2e/cancel"));
    expect(cancel?.body).toEqual({ expected_refund_cents: 5000 });
    await expectNoBrowserError(page);
  });
});
