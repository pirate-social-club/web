import { formatUsdLabel, parseUsdInput, usdToCents } from "@/lib/formatting/currency";

/**
 * Client-side mirror of the server's reward-campaign create validation, so the
 * booster is never allowed to submit terms the API will reject. Every rule here
 * corresponds to a check in reward-campaign-service.ts (and, beneath it, to a
 * CHECK constraint in control-plane migration 0134).
 *
 * Milestones are deliberately absent: they are database-enforced to zero until
 * milestone earning ships, so the compose surface never offers them.
 *
 * ── Reward-model seam ──────────────────────────────────────────────────────
 * Everything here is the "daily_accrual" model: a uniform per-person, per-day
 * reward that accrues while people study/karaoke the song, with the ceiling
 * `rewardCount = floor(budget / dailyReward)`. A future "prize_pool" model
 * (e.g. a remix contest paying a fixed pot to top-N or judged winners) has a
 * different shape entirely and must NOT reuse this math — it gets its own
 * resolver behind the same {@link RewardModelKind} discriminant. `eligible_activity`
 * (study | karaoke | either) is a property OF the daily-accrual model, not a
 * top-level axis, precisely so prize_pool can carry its own qualification rules.
 */
export type RewardModelKind = "daily_accrual" | "prize_pool";

export interface BoostPlanLimits {
  maxBudgetCents: number;
  maxRewardCents: number;
  minBudgetCents: number;
}

export type BoostPlanProblem =
  | "daily-reward-missing"
  | "daily-reward-too-large"
  | "budget-missing"
  | "budget-below-minimum"
  | "budget-above-maximum"
  | "budget-below-one-reward";

export interface BoostPlan {
  /** Discriminant for the reward model this plan describes. */
  model: RewardModelKind;
  budgetCents: number | null;
  /** Exactly budget / reward: uniform rate, zero milestones and zero platform fee make this a ceiling, not an estimate. */
  rewardCount: number | null;
  dailyRewardCents: number | null;
  problem: BoostPlanProblem | null;
  valid: boolean;
}

/**
 * Resolve the daily-accrual plan from raw USD inputs. Sibling resolvers for
 * other {@link RewardModelKind}s live alongside this one when they ship.
 */
export function resolveDailyAccrualPlan(
  dailyRewardInput: string,
  budgetInput: string,
  limits: BoostPlanLimits,
): BoostPlan {
  const dailyRewardCents = usdToCents(parseUsdInput(dailyRewardInput));
  const budgetCents = usdToCents(parseUsdInput(budgetInput));

  const invalid = (problem: BoostPlanProblem): BoostPlan => ({
    model: "daily_accrual",
    budgetCents,
    dailyRewardCents,
    problem,
    rewardCount: null,
    valid: false,
  });

  if (!dailyRewardCents || dailyRewardCents <= 0) return invalid("daily-reward-missing");
  if (dailyRewardCents > limits.maxRewardCents) return invalid("daily-reward-too-large");
  if (!budgetCents || budgetCents <= 0) return invalid("budget-missing");
  if (budgetCents < limits.minBudgetCents) return invalid("budget-below-minimum");
  if (budgetCents > limits.maxBudgetCents) return invalid("budget-above-maximum");
  // The server rejects a budget that cannot cover a single daily reward.
  if (budgetCents < dailyRewardCents) return invalid("budget-below-one-reward");

  return {
    model: "daily_accrual",
    budgetCents,
    dailyRewardCents,
    problem: null,
    rewardCount: Math.floor(budgetCents / dailyRewardCents),
    valid: true,
  };
}

export function boostPlanProblemLabel(
  problem: BoostPlanProblem,
  limits: BoostPlanLimits,
): string {
  const min = formatUsdLabel(limits.minBudgetCents / 100) ?? "";
  const max = formatUsdLabel(limits.maxBudgetCents / 100) ?? "";
  const maxReward = formatUsdLabel(limits.maxRewardCents / 100) ?? "";

  return {
    "daily-reward-missing": "Enter a reward amount.",
    "daily-reward-too-large": `A reward can be at most ${maxReward} per person, per day.`,
    "budget-missing": "Enter a budget.",
    "budget-below-minimum": `The budget must be at least ${min}.`,
    "budget-above-maximum": `The budget can be at most ${max}.`,
    "budget-below-one-reward": "The budget must cover at least one reward.",
  }[problem];
}

/** "Up to N rewards" — never a bare count, because zero is possible if nobody practises. */
export function boostRewardCountLabel(rewardCount: number): string {
  return rewardCount === 1 ? "1 reward" : `${rewardCount.toLocaleString("en")} rewards`;
}
