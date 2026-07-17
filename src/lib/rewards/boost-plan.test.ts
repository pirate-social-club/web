import { describe, expect, test } from "bun:test";

import { boostRewardCountLabel, resolveDailyAccrualPlan, type BoostPlanLimits } from "./boost-plan";

// Mirrors the staging campaign config: min $1, max $100, max reward $1.
const limits: BoostPlanLimits = {
  maxBudgetCents: 10_000,
  maxRewardCents: 100,
  minBudgetCents: 100,
};

describe("resolveDailyAccrualPlan", () => {
  test("reward count is budget divided by the daily reward", () => {
    const plan = resolveDailyAccrualPlan("$0.10", "$25.00", limits);
    expect(plan.valid).toBe(true);
    expect(plan.model).toBe("daily_accrual");
    expect(plan.dailyRewardCents).toBe(10);
    expect(plan.budgetCents).toBe(2_500);
    expect(plan.rewardCount).toBe(250);
  });

  test("a remainder that cannot fund a whole reward is floored, never rounded up", () => {
    // $25.05 funds 250 rewards at $0.10; the stray $0.05 can never be credited
    // because credits are full-or-zero. It simply goes unspent — funding is final,
    // so the count is floored rather than inflated.
    const plan = resolveDailyAccrualPlan("$0.10", "$25.05", limits);
    expect(plan.rewardCount).toBe(250);
  });

  test("a budget that exactly covers one reward is valid", () => {
    const plan = resolveDailyAccrualPlan("$1.00", "$1.00", limits);
    expect(plan.valid).toBe(true);
    expect(plan.rewardCount).toBe(1);
  });

  test("rejects a budget that cannot cover a single daily reward", () => {
    // The server raises "Campaign budget cannot cover one daily reward".
    const plan = resolveDailyAccrualPlan("$1.00", "$0.50", limits);
    expect(plan.valid).toBe(false);
    // Below the $1 minimum is reported first, matching the server's ordering.
    expect(plan.problem).toBe("budget-below-minimum");
  });

  test("rejects a budget under the platform minimum", () => {
    const plan = resolveDailyAccrualPlan("$0.10", "$0.50", limits);
    expect(plan.valid).toBe(false);
    expect(plan.problem).toBe("budget-below-minimum");
  });

  test("rejects a budget over the platform maximum", () => {
    const plan = resolveDailyAccrualPlan("$0.10", "$250.00", limits);
    expect(plan.valid).toBe(false);
    expect(plan.problem).toBe("budget-above-maximum");
  });

  test("rejects a daily reward over the platform maximum", () => {
    const plan = resolveDailyAccrualPlan("$5.00", "$25.00", limits);
    expect(plan.valid).toBe(false);
    expect(plan.problem).toBe("daily-reward-too-large");
  });

  test("rejects missing or zero amounts", () => {
    expect(resolveDailyAccrualPlan("", "$25.00", limits).problem).toBe("daily-reward-missing");
    expect(resolveDailyAccrualPlan("$0.00", "$25.00", limits).problem).toBe("daily-reward-missing");
    expect(resolveDailyAccrualPlan("$0.10", "", limits).problem).toBe("budget-missing");
  });

  test("accepts input with or without currency decoration", () => {
    expect(resolveDailyAccrualPlan("0.10", "25", limits).rewardCount).toBe(250);
    expect(resolveDailyAccrualPlan("$0.10", "$25.00", limits).rewardCount).toBe(250);
  });
});

describe("boostRewardCountLabel", () => {
  test("pluralises and groups thousands", () => {
    expect(boostRewardCountLabel(1)).toBe("1 reward");
    expect(boostRewardCountLabel(250)).toBe("250 rewards");
    expect(boostRewardCountLabel(1_000)).toBe("1,000 rewards");
  });
});
