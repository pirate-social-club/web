import { expect, test, type Page } from "@playwright/test";

import { installAuthenticatedApiMocks, installMockSession } from "./fixtures/api-mocks";
import { expectNoBrowserError } from "./fixtures/e2e-helpers";
import { createRewardMockState, installRewardApiMocks, type RewardMockState } from "./fixtures/reward-mocks";

async function installRewardFixture(page: Page, overrides: Partial<RewardMockState> = {}): Promise<RewardMockState> {
  await installAuthenticatedApiMocks(page);
  await installMockSession(page);
  const state = createRewardMockState(overrides);
  await installRewardApiMocks(page, state);
  return state;
}

async function openAndConfirmCashout(page: Page): Promise<void> {
  const claim = page.getByRole("button", { name: "Claim" }).filter({ visible: true }).last();
  await expect(claim).toBeVisible({ timeout: 30_000 });
  await expect(claim).toBeEnabled();
  await claim.click();
  await page.getByRole("button", { name: "Continue" }).click();
  await page.getByRole("button", { name: "Confirm claim" }).click();
}

test.describe("reward cashouts (mocked API)", () => {
  test("renders rewards and a confirmed cashout using the server recipient", async ({ page }) => {
    const state = await installRewardFixture(page);
    await page.goto("/wallet");

    await expect(page.getByText("Rewards").filter({ visible: true }).first()).toBeVisible({ timeout: 30_000 });
    await expect(page.getByText("$1.20").filter({ visible: true }).first()).toBeVisible();
    await openAndConfirmCashout(page);

    const claimSheet = page.getByLabel("Claim rewards");
    await expect(claimSheet.getByText("Claim complete", { exact: true })).toBeVisible();
    await expect(claimSheet.getByText("1.20 testnet USDC was sent to 0x9000...0009.", { exact: true })).toBeVisible();
    expect(state.cashoutKeys).toHaveLength(1);
    await expectNoBrowserError(page);
  });

  test("renders the authoritative failed status and failure reason", async ({ page }) => {
    await installRewardFixture(page, {
      payout: {
        id: "rpe_browser_failed",
        amount_cents: 120,
        recipient_address: "0x9000000000000000000000000000000000000009",
        status: "failed",
        settlement_ref: null,
        failure_reason: "Transfer replaced before confirmation.",
      },
    });
    await page.goto("/wallet");
    await openAndConfirmCashout(page);

    const claimSheet = page.getByLabel("Claim rewards");
    await expect(claimSheet.getByText("Transfer failed", { exact: true })).toBeVisible();
    await expect(claimSheet.getByText("Transfer replaced before confirmation.", { exact: true })).toBeVisible();
    await expect(page.getByText("Pending")).toHaveCount(0);
  });

  test("reuses one idempotency key after an ambiguous network failure", async ({ page }) => {
    const state = await installRewardFixture(page, { failFirstCashoutRequest: true });
    await page.goto("/wallet");
    await openAndConfirmCashout(page);
    const claimSheet = page.getByLabel("Claim rewards");
    await expect(claimSheet.getByText("Transfer failed", { exact: true })).toBeVisible();
    await claimSheet.getByRole("button", { name: "Close", exact: true }).first().click();

    await openAndConfirmCashout(page);
    await expect(page.getByLabel("Claim rewards").getByText("Claim complete", { exact: true })).toBeVisible();
    expect(state.cashoutKeys).toHaveLength(2);
    expect(state.cashoutKeys[1]).toBe(state.cashoutKeys[0]);
  });

  test("manually refreshes a submitted payout and reaches confirmation", async ({ page }) => {
    const state = await installRewardFixture(page, {
      payout: {
        id: "rpe_browser_submitted",
        amount_cents: 120,
        recipient_address: "0x9000000000000000000000000000000000000009",
        status: "submitted",
        settlement_ref: "0xbrowserrewardpending",
        failure_reason: null,
      },
      submittedReadsBeforeTerminal: 1,
    });
    await page.goto("/wallet");
    await openAndConfirmCashout(page);

    await expect(page.getByRole("button", { name: "Check status" })).toBeVisible();
    await expect.poll(() => state.statusReads).toBeGreaterThanOrEqual(1);
    await page.getByRole("button", { name: "Check status" }).click();
    await expect(page.getByLabel("Claim rewards").getByText("Claim complete", { exact: true })).toBeVisible();
    expect(state.statusReads).toBeGreaterThanOrEqual(2);
  });

  test("rehydrates an in-flight payout from the summary after reload", async ({ page }) => {
    const submitted = {
      id: "rpe_browser_recovered",
      amount_cents: 100,
      recipient_address: "0x8000000000000000000000000000000000000008",
      status: "submitted" as const,
      settlement_ref: "0xbrowserrecovering",
      failure_reason: null,
    };
    const state = await installRewardFixture(page, {
      balanceCents: 120,
      latestInFlight: submitted,
      payout: submitted,
      submittedReadsBeforeTerminal: 1,
    });
    await page.goto("/wallet");

    await expect(page.getByRole("button", { name: "Pending" })).toBeVisible({ timeout: 30_000 });
    await page.reload();
    await expect.poll(() => state.statusReads, { timeout: 10_000 }).toBeGreaterThanOrEqual(2);
    await expect(page.getByRole("button", { name: "Pending" })).toHaveCount(0);
    await expect.poll(() => page.evaluate(() => window.localStorage.getItem("pirate_rewards_cashout_attempt"))).toBeNull();
    await expectNoBrowserError(page);
  });
});
