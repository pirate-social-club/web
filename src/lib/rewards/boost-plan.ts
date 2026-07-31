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
 *
 * ── Nationality payout tiers (dark) ────────────────────────────────────────
 * Optional `payoutTiers` mirror the Phase-1 contract fields (`payout_tiers` /
 * `default_amount_cents`). The Phase-2 controller may persist them only when
 * both the local preview flag and the server's `draft_only` capability agree;
 * funding remains blocked. Budget
 * math is conservative by design — loss bounds assume the MAXIMUM tier amount
 * per claim, never a blend — so a tiered `rewardCount` is a guaranteed floor
 * ("at least N rewards") rather than the untiered ceiling ("up to N rewards").
 */
type RewardModelKind = "daily_accrual" | "prize_pool";

/** Bounded tier count, mirroring the Phase-1 schema cap. */
export const MAX_PAYOUT_TIERS = 10;

export interface BoostPayoutTier {
  /** ISO-3166 alpha-3 nationality codes — what Self/ZKPassport proofs attest. */
  nationalities: string[];
  /** Parsed tier amount; null while the creator's amount input is empty/unparseable. */
  amountCents: number | null;
}

export interface BoostPlanLimits {
  maxBudgetCents: number;
  maxRewardCents: number;
  minBudgetCents: number;
  /**
   * Staging cashout minimum applied to each tier amount. Optional because the
   * capabilities payload has no `min_reward_cents` until Phase 1 lands; when
   * absent, only the > 0 floor is enforced.
   */
  minRewardCents?: number;
}

export type BoostPlanProblem =
  | "daily-reward-missing"
  | "daily-reward-too-large"
  | "tier-count-exceeded"
  | "tier-country-missing"
  | "tier-country-duplicated"
  | "tier-amount-missing"
  | "tier-amount-too-large"
  | "tier-amount-below-minimum"
  | "budget-missing"
  | "budget-below-minimum"
  | "budget-above-maximum"
  | "budget-below-one-reward";

export interface BoostPlan {
  /** Discriminant for the reward model this plan describes. */
  model: RewardModelKind;
  budgetCents: number | null;
  /**
   * Largest amount a single claim can pay: the daily reward, or the top tier
   * when tiers are configured. All worst-case math keys off this, never a blend.
   */
  maxClaimCents: number | null;
  /**
   * With tiers: exactly floor(budget / maxClaim) — a guaranteed floor, since
   * every claim pays at most maxClaim. Without tiers: the uniform-rate ceiling
   * (zero milestones and zero platform fee make it exact, not an estimate).
   */
  rewardCount: number | null;
  dailyRewardCents: number | null;
  problem: BoostPlanProblem | null;
  /** True when at least one payout tier is configured. */
  tiered: boolean;
  valid: boolean;
}

/**
 * Resolve the daily-accrual plan from raw USD inputs. Sibling resolvers for
 * other {@link RewardModelKind}s live alongside this one when they ship.
 * `payoutTiers` is the gated nationality-tier preview; omitting it yields
 * exactly the pre-tier behavior.
 */
export function resolveDailyAccrualPlan(
  dailyRewardInput: string,
  budgetInput: string,
  limits: BoostPlanLimits,
  payoutTiers?: BoostPayoutTier[],
): BoostPlan {
  const dailyRewardCents = usdToCents(parseUsdInput(dailyRewardInput));
  const budgetCents = usdToCents(parseUsdInput(budgetInput));
  const tiers = payoutTiers ?? [];
  const tiered = tiers.length > 0;

  const invalid = (problem: BoostPlanProblem): BoostPlan => ({
    model: "daily_accrual",
    budgetCents,
    dailyRewardCents,
    maxClaimCents: null,
    problem,
    rewardCount: null,
    tiered,
    valid: false,
  });

  if (!dailyRewardCents || dailyRewardCents <= 0) return invalid("daily-reward-missing");
  if (dailyRewardCents > limits.maxRewardCents) return invalid("daily-reward-too-large");

  if (tiered) {
    if (tiers.length > MAX_PAYOUT_TIERS) return invalid("tier-count-exceeded");
    const claimed = new Set<string>();
    for (const tier of tiers) {
      if (tier.nationalities.length === 0) return invalid("tier-country-missing");
      for (const nationality of tier.nationalities) {
        const code = nationality.trim().toUpperCase();
        if (claimed.has(code)) return invalid("tier-country-duplicated");
        claimed.add(code);
      }
    }
    for (const tier of tiers) {
      if (!tier.amountCents || tier.amountCents <= 0) return invalid("tier-amount-missing");
      if (tier.amountCents > limits.maxRewardCents) return invalid("tier-amount-too-large");
      if (limits.minRewardCents != null && tier.amountCents < limits.minRewardCents) {
        return invalid("tier-amount-below-minimum");
      }
    }
  }

  // The worst case per claim is the largest configured amount — the default
  // daily reward or the top tier, whichever pays more.
  const maxClaimCents = Math.max(dailyRewardCents, ...tiers.map((tier) => tier.amountCents ?? 0));

  if (!budgetCents || budgetCents <= 0) return invalid("budget-missing");
  if (budgetCents < limits.minBudgetCents) return invalid("budget-below-minimum");
  if (budgetCents > limits.maxBudgetCents) return invalid("budget-above-maximum");
  // The server rejects a budget that cannot cover a single worst-case claim.
  if (budgetCents < maxClaimCents) return invalid("budget-below-one-reward");

  return {
    model: "daily_accrual",
    budgetCents,
    dailyRewardCents,
    maxClaimCents,
    problem: null,
    rewardCount: Math.floor(budgetCents / maxClaimCents),
    tiered,
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
  const minReward = limits.minRewardCents != null
    ? formatUsdLabel(limits.minRewardCents / 100) ?? ""
    : "";

  return {
    "daily-reward-missing": "Enter a reward amount.",
    "daily-reward-too-large": `A reward can be at most ${maxReward} per person, per day.`,
    "tier-count-exceeded": `You can add at most ${MAX_PAYOUT_TIERS} tiers.`,
    "tier-country-missing": "Choose at least one country for every tier.",
    "tier-country-duplicated": "Each country can appear in only one tier.",
    "tier-amount-missing": "Enter an amount for every tier.",
    "tier-amount-too-large": `A tier amount can be at most ${maxReward} per person, per day.`,
    "tier-amount-below-minimum": `A tier amount must be at least ${minReward}.`,
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
