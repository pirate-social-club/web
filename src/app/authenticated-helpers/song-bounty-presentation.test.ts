import { describe, expect, test } from "bun:test";

import type { RewardCampaign } from "@pirate/api-contracts";

import { deriveSongBountyPresentation } from "./song-bounty-presentation";

function campaign(activity: "study" | "karaoke" | "either", status: RewardCampaign["status"] = "active"): RewardCampaign {
  return {
    id: `rcp_${activity}`,
    object: "reward_campaign",
    rewarder: "usr_rewarder",
    community: "cmt_song",
    post: "pst_song",
    song_artifact_bundle: "sab_song",
    song_owner: "usr_owner",
    reward_identity_provider: "very",
    status,
    eligible_activity: activity,
    min_score_bps: 7000,
    daily_reward_cents: 40,
    default_amount_cents: 40,
    max_claim_cents: 40,
    payout_tiers: [],
    milestone_7_cents: 0,
    milestone_30_cents: 0,
    reward_period_cap_cents: 40,
    budget_cents: 1000,
    funded_cents: 1000,
    reserved_cents: 0,
    credited_cents: 0,
    paid_cents: 0,
    refunded_cents: 0,
    remaining_cents: 1000,
    starts_at: 0,
    ends_at: 2_000_000_000,
    funding_tx_hash: null,
    created: 0,
  };
}

const capabilities = { eligible_activities: ["study", "karaoke"] as const };

describe("deriveSongBountyPresentation", () => {
  test("keeps Study and Karaoke occupancy independent", () => {
    const study = campaign("study");
    const presentation = deriveSongBountyPresentation({
      campaign: study,
      campaigns: { study, karaoke: null },
      campaignAcceptsTopUp: true,
      campaignAcceptsTopUpByObjective: { study: true, karaoke: false },
      campaignResolved: true,
      canBrowseBounties: true,
      capabilities,
      thirdPartyBlocked: false,
    });

    expect(presentation.slots).toMatchObject([
      { objective: "study", status: "active", canFund: true, canCreate: false },
      { objective: "karaoke", status: "empty", canFund: false, canCreate: true },
    ]);
  });

  test("legacy Either occupies both slots while remaining one campaign", () => {
    const legacy = campaign("either");
    const presentation = deriveSongBountyPresentation({
      campaign: legacy,
      campaigns: { study: legacy, karaoke: legacy },
      campaignAcceptsTopUp: true,
      campaignAcceptsTopUpByObjective: { study: true, karaoke: true },
      campaignResolved: true,
      canBrowseBounties: true,
      capabilities,
      thirdPartyBlocked: false,
    });

    expect(presentation.legacyEither?.status).toBe("active");
    expect(presentation.slots).toMatchObject([
      { objective: "study", status: "active", canCreate: false },
      { objective: "karaoke", status: "active", canCreate: false },
    ]);
  });
});
