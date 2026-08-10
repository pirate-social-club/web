import { describe, expect, test } from "bun:test";

import {
  boostPlanProblemLabel,
  boostRewardCountLabel,
  MAX_PAYOUT_TIERS,
  resolveDailyAccrualPlan,
  type BoostPayoutTier,
} from "./boost-plan";
import type { BoostPlanLimits } from "./boost-plan";

// Mirrors the staging campaign config: min $1, max $100, max reward $1.
const limits: BoostPlanLimits = {
  maxBudgetCents: 10_000,
  maxRewardCents: 100,
  minBudgetCents: 100,
};

// Tier-preview limits: max reward $5, staging cashout minimum $0.25.
const tieredLimits: BoostPlanLimits = {
  maxBudgetCents: 10_000,
  maxRewardCents: 500,
  minBudgetCents: 100,
  minRewardCents: 25,
};

function tier(amountCents: number | null, ...nationalities: string[]): BoostPayoutTier {
  return { amountCents, nationalities };
}

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

describe("resolveDailyAccrualPlan with nationality payout tiers (dark)", () => {
  test("omitting tiers keeps the pre-tier behavior exactly", () => {
    const plan = resolveDailyAccrualPlan("$0.10", "$25.00", limits);
    expect(plan.tiered).toBe(false);
    expect(plan.maxClaimCents).toBe(10);
    expect(plan.rewardCount).toBe(250);
  });

  test("an empty tier list is untiered, not an error", () => {
    const plan = resolveDailyAccrualPlan("$0.10", "$25.00", limits, []);
    expect(plan.tiered).toBe(false);
    expect(plan.valid).toBe(true);
    expect(plan.rewardCount).toBe(250);
  });

  test("reward count assumes the maximum tier amount per claim, never a blend", () => {
    // $25 budget, $1 default, tiers $5 (US) and $0.50 (VN): the worst case is
    // every claim matching the $5 tier, so only 5 rewards are guaranteed.
    const plan = resolveDailyAccrualPlan("$1.00", "$25.00", tieredLimits, [
      tier(500, "USA"),
      tier(50, "VNM"),
    ]);
    expect(plan.valid).toBe(true);
    expect(plan.tiered).toBe(true);
    expect(plan.maxClaimCents).toBe(500);
    expect(plan.rewardCount).toBe(5);
  });

  test("a tier below the default does not change the worst case", () => {
    const plan = resolveDailyAccrualPlan("$1.00", "$25.00", tieredLimits, [tier(50, "VNM")]);
    expect(plan.valid).toBe(true);
    expect(plan.maxClaimCents).toBe(100);
    expect(plan.rewardCount).toBe(25);
  });

  test("the budget must cover one top-tier claim", () => {
    const plan = resolveDailyAccrualPlan("$1.00", "$3.00", tieredLimits, [tier(500, "USA")]);
    expect(plan.valid).toBe(false);
    expect(plan.problem).toBe("budget-below-one-reward");
  });

  test("rejects a country claimed by two tiers, case-insensitively", () => {
    expect(
      resolveDailyAccrualPlan("$1.00", "$25.00", tieredLimits, [
        tier(500, "USA"),
        tier(50, "VNM", "USA"),
      ]).problem,
    ).toBe("tier-country-duplicated");
    expect(
      resolveDailyAccrualPlan("$1.00", "$25.00", tieredLimits, [
        tier(500, "usa"),
        tier(50, "USA"),
      ]).problem,
    ).toBe("tier-country-duplicated");
  });

  test("rejects a tier without a nationality", () => {
    const plan = resolveDailyAccrualPlan("1.00", "10.00", tieredLimits, [
      { nationalities: [], amountCents: 500 },
    ]);
    expect(plan.problem).toBe("tier-country-missing");
  });

  test("rejects more tiers than the schema cap", () => {
    const tiers = Array.from({ length: MAX_PAYOUT_TIERS + 1 }, (_, index) =>
      tier(50, `T${index.toString().padStart(2, "0")}`));
    expect(resolveDailyAccrualPlan("$1.00", "$25.00", tieredLimits, tiers).problem).toBe(
      "tier-count-exceeded",
    );
  });

  test("rejects a tier without an amount", () => {
    expect(
      resolveDailyAccrualPlan("$1.00", "$25.00", tieredLimits, [tier(null, "USA")]).problem,
    ).toBe("tier-amount-missing");
    expect(
      resolveDailyAccrualPlan("$1.00", "$25.00", tieredLimits, [tier(0, "USA")]).problem,
    ).toBe("tier-amount-missing");
  });

  test("rejects a tier amount over the reward cap", () => {
    expect(
      resolveDailyAccrualPlan("$1.00", "$25.00", tieredLimits, [tier(600, "USA")]).problem,
    ).toBe("tier-amount-too-large");
  });

  test("rejects a tier amount under the cashout minimum when one is configured", () => {
    expect(
      resolveDailyAccrualPlan("$1.00", "$25.00", tieredLimits, [tier(10, "VNM")]).problem,
    ).toBe("tier-amount-below-minimum");
    // Without a configured minimum there is no floor beyond > 0.
    expect(
      resolveDailyAccrualPlan("$1.00", "$25.00", {
        maxBudgetCents: 10_000,
        maxRewardCents: 500,
        minBudgetCents: 100,
      }, [tier(10, "VNM")]).valid,
    ).toBe(true);
  });

  test("tier problems surface before budget problems", () => {
    // Duplicate country AND an impossible budget: the tier defect is reported.
    const plan = resolveDailyAccrualPlan("$1.00", "", tieredLimits, [
      tier(500, "USA"),
      tier(50, "USA"),
    ]);
    expect(plan.problem).toBe("tier-country-duplicated");
  });
});

describe("boostPlanProblemLabel for tier problems", () => {
  test("labels reference the configured limits", () => {
    expect(boostPlanProblemLabel("tier-count-exceeded", tieredLimits)).toBe(
      `You can add at most ${MAX_PAYOUT_TIERS} tiers.`,
    );
    expect(boostPlanProblemLabel("tier-country-duplicated", tieredLimits)).toBe(
      "Each country can appear in only one tier.",
    );
    expect(boostPlanProblemLabel("tier-amount-missing", tieredLimits)).toBe(
      "Enter an amount for every tier.",
    );
    expect(boostPlanProblemLabel("tier-amount-too-large", tieredLimits)).toContain("$5.00");
    expect(boostPlanProblemLabel("tier-amount-below-minimum", tieredLimits)).toContain("$0.25");
  });
});

describe("boostRewardCountLabel", () => {
  test("pluralises and groups thousands", () => {
    expect(boostRewardCountLabel(1)).toBe("1 completion");
    expect(boostRewardCountLabel(250)).toBe("250 completions");
    expect(boostRewardCountLabel(1_000)).toBe("1,000 completions");
  });
});
