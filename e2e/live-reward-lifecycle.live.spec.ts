import { expect, test } from "@playwright/test";

const apiBaseURL = process.env.E2E_API_BASE_URL ?? "https://api-staging.pirate.sc";

function requiredEnv(name: string): string {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`${name} is required for live rewards lifecycle E2E`);
  return value;
}

test.describe("live rewards lifecycle", () => {
  test("reconciles a funded qualification and proves replay stability", async ({ request }) => {
    test.skip(
      process.env.E2E_LIVE_REWARDS_LIFECYCLE !== "true",
      "Set E2E_LIVE_REWARDS_LIFECYCLE=true and provide the staging reward fixture variables to run this live proof.",
    );

    const operatorToken = requiredEnv("E2E_REWARDS_OPERATOR_TOKEN");
    const campaignId = requiredEnv("E2E_REWARDS_CAMPAIGN_ID");
    const userId = requiredEnv("E2E_REWARDS_USER_ID");
    const passes = Number(process.env.E2E_REWARDS_RECONCILE_PASSES ?? "3");
    expect(Number.isSafeInteger(passes) && passes >= 1 && passes <= 5).toBe(true);

    const response = await request.post(`${apiBaseURL}/operator/reward_campaigns/rehearsal`, {
      headers: {
        accept: "application/json",
        authorization: operatorToken.startsWith("Operator ") ? operatorToken : `Operator ${operatorToken}`,
      },
      data: { campaign_id: campaignId, user_id: userId, passes },
    });
    expect(response.status(), await response.text()).toBe(200);
    const body = await response.json() as {
      before: { campaign: { fundedCents: number } };
      after_pass: { campaign: { creditedCents: number }; rewardEvents: number };
      replay: { campaign: { creditedCents: number }; rewardEvents: number };
    };

    expect(body.before.campaign.fundedCents).toBeGreaterThan(0);
    expect(body.after_pass.campaign.creditedCents).toBeGreaterThan(0);
    expect(body.after_pass.rewardEvents).toBeGreaterThan(0);
    expect(body.replay).toEqual(body.after_pass);
  });

  test("reuses one cashout idempotency key", async ({ request }) => {
    test.skip(
      process.env.E2E_LIVE_REWARDS_LIFECYCLE !== "true"
      || !process.env.E2E_REWARDS_ACCESS_TOKEN?.trim()
      || !process.env.E2E_REWARDS_CASHOUT_CENTS?.trim(),
      "Provide the live rewards lifecycle flag, user access token, and cashout amount to run this money-path proof.",
    );

    const accessToken = requiredEnv("E2E_REWARDS_ACCESS_TOKEN");
    const amountCents = Number(requiredEnv("E2E_REWARDS_CASHOUT_CENTS"));
    expect(Number.isSafeInteger(amountCents) && amountCents > 0).toBe(true);
    const idempotencyKey = `live-rewards-lifecycle:${Date.now()}`;
    const init = {
      headers: { accept: "application/json", authorization: `Bearer ${accessToken}` },
      data: { amount_cents: amountCents, idempotency_key: idempotencyKey },
    };
    const first = await request.post(`${apiBaseURL}/me/rewards/cashouts`, init);
    expect(first.status(), await first.text()).toBe(202);
    const firstBody = await first.json() as { payout: { id: string } };
    const replay = await request.post(`${apiBaseURL}/me/rewards/cashouts`, init);
    expect(replay.status(), await replay.text()).toBe(202);
    const replayBody = await replay.json() as { payout: { id: string } };
    expect(replayBody.payout.id).toBe(firstBody.payout.id);
  });
});
