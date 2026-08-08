import { describe, expect, test } from "bun:test";
import type { Community, JoinEligibility } from "@pirate/api-contracts";

import {
  buildCommunityPreviewSidebar,
  buildCommunitySidebar,
  buildCommunitySidebarGateItems,
  buildCommunitySidebarRequirements,
  getCommunityActionLabel,
} from "@/app/authenticated-helpers/community-sidebar-helpers";

function balanceCommunity(minAmountAtomic: string, assetId = "eip155:1/slip44:60"): Community {
  return {
    id: "cmt_balance",
    object: "community",
    display_name: "Balance Club",
    membership_mode: "gated",
    default_age_gate_policy: "none",
    gate_policy: {
      version: 1,
      expression: {
        op: "gate",
        gate: { type: "asset_balance", asset_id: assetId, min_amount_atomic: minAmountAtomic },
      },
    },
    donation_policy_mode: "none",
    donation_partner: null,
    reference_links: [],
    rules: [],
    created: Date.parse("2026-07-17T00:00:00.000Z"),
  } as Community;
}

function flatOrCommunity(defaultAgeGatePolicy: "none" | "18_plus" = "none"): Community {
  return {
    id: "cmt_flat_or",
    object: "community",
    display_name: "Flat OR Club",
    membership_mode: "gated",
    default_age_gate_policy: defaultAgeGatePolicy,
    gate_policy: {
      version: 1,
      expression: {
        op: "or",
        children: [
          { op: "gate", gate: { type: "unique_human", provider: "very" } },
          { op: "gate", gate: { type: "altcha_pow" } },
        ],
      },
    },
    donation_policy_mode: "none",
    donation_partner: null,
    reference_links: [],
    rules: [],
    created: Date.parse("2026-07-17T00:00:00.000Z"),
  } as Community;
}

describe("buildCommunitySidebar", () => {
  test("shows row-level OR markers for a flat OR gate policy", () => {
    expect(buildCommunitySidebar(flatOrCommunity()).showFlatGateOrMarkers).toBe(true);
  });

  test("hides row-level OR markers when the required default age row is injected", () => {
    const sidebar = buildCommunitySidebar(flatOrCommunity("18_plus"));

    expect(sidebar.gates?.[0]?.gateType).toBe("age_over_18");
    expect(sidebar.showFlatGateOrMarkers).toBe(false);
  });

  test("preserves mixed operators from the authenticated gate policy", () => {
    const sidebar = buildCommunitySidebar({
      id: "cmt_authenticated",
      object: "community",
      display_name: "Authenticated Club",
      membership_mode: "gated",
      default_age_gate_policy: "none",
      gate_policy: {
        version: 1,
        expression: {
          op: "and",
          children: [
            { op: "gate", gate: { type: "unique_human", provider: "self" } },
            {
              op: "or",
              children: [
                { op: "gate", gate: { type: "unique_human", provider: "very" } },
                { op: "gate", gate: { type: "altcha_pow" } },
              ],
            },
          ],
        },
      },
      donation_policy_mode: "none",
      donation_partner: null,
      reference_links: [],
      rules: [],
      created: Date.parse("2026-07-10T00:00:00.000Z"),
    } as Community);

    expect(sidebar.requirementsMode).toBe("all");
    expect(sidebar.gateExpressionLabel).toBe("Self.xyz ID proof and (Palm scan or Proof of work)");
    expect(sidebar.showFlatGateOrMarkers).toBe(false);
  });

  test("renders a balance requirement using asset display metadata from eligibility", () => {
    // The community payload carries only raw atoms; symbol and decimals arrive
    // on the API-built summaries in the eligibility readout.
    const sidebar = buildCommunitySidebar(balanceCommunity("500000000000000000"), null, {
      membership_gate_summaries: [{
        gate_type: "asset_balance",
        asset_id: "eip155:1/slip44:60",
        min_amount_atomic: "500000000000000000",
        asset_symbol: "ETH",
        asset_decimals: 18,
      }],
    } as JoinEligibility);

    expect(sidebar.requirements).toEqual(["At least 0.5 ETH"]);
  });

  test("degrades to a vaguer balance label rather than guessing a scale", () => {
    // Without decimals an atomic integer cannot be scaled. Rendering it raw
    // would claim a member needs 500000000000000000 ETH.
    const sidebar = buildCommunitySidebar(balanceCommunity("500000000000000000"));

    expect(sidebar.requirements).toEqual(["Token balance required"]);
  });
});

describe("buildCommunitySidebarRequirements", () => {
  test("localizes nationality requirements for Arabic", () => {
    expect(buildCommunitySidebarRequirements({
      locale: "ar",
      gateSummaries: [{ gate_type: "nationality", required_value: "PS" }],
    })).toEqual(["جنسية فلسطين"]);
  });

  test("localizes common verification labels for Arabic", () => {
    expect(buildCommunitySidebarRequirements({
      locale: "ar",
      defaultAgeGatePolicy: "18_plus",
      gateSummaries: [
        { gate_type: "unique_human", accepted_providers: ["very"], required_value: null },
        { gate_type: "wallet_score", required_value: null, minimum_score: 20 },
      ],
    })).toEqual(["18+", "فحص راحة اليد", "درجة Passport.xyz 20+"]);
  });

  test("scales balance amounts by each asset's own decimals", () => {
    expect(buildCommunitySidebarRequirements({
      gateSummaries: [
        // 18-decimal native asset.
        { gate_type: "asset_balance", asset_id: "eip155:1/slip44:60", min_amount_atomic: "500000000000000000", asset_symbol: "ETH", asset_decimals: 18 },
        // 6-decimal token: the same digits would be wildly wrong at 18.
        { gate_type: "asset_balance", asset_id: "eip155:1/erc20:0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48", min_amount_atomic: "10000000", asset_symbol: "USDC", asset_decimals: 6 },
      ],
    })).toEqual(["At least 0.5 ETH", "At least 10 USDC"]);
  });

  test("renders large balances exactly rather than in exponent notation", () => {
    expect(buildCommunitySidebarRequirements({
      gateSummaries: [{
        gate_type: "asset_balance",
        asset_id: "eip155:1/slip44:60",
        min_amount_atomic: "1000000000000000000000000",
        asset_symbol: "ETH",
        asset_decimals: 18,
      }],
    })).toEqual(["At least 1000000 ETH"]);
  });

  test("localizes balance requirements", () => {
    const gateSummaries = [{
      gate_type: "asset_balance" as const,
      asset_id: "eip155:1/slip44:60",
      min_amount_atomic: "500000000000000000",
      asset_symbol: "ETH",
      asset_decimals: 18,
    }];
    expect(buildCommunitySidebarRequirements({ locale: "ar", gateSummaries })).toEqual(["0.5 ETH على الأقل"]);
    expect(buildCommunitySidebarRequirements({ locale: "zh", gateSummaries })).toEqual(["至少 0.5 ETH"]);
  });

  test("names unique human requirements by accepted provider", () => {
    expect(buildCommunitySidebarRequirements({
      gateSummaries: [{ gate_type: "unique_human", accepted_providers: ["very"] }],
    })).toEqual(["Palm scan"]);

    expect(buildCommunitySidebarRequirements({
      gateSummaries: [{ gate_type: "unique_human", accepted_providers: ["self"] }],
    })).toEqual(["Self.xyz ID proof"]);

    expect(buildCommunitySidebarRequirements({
      gateSummaries: [{ gate_type: "unique_human", accepted_providers: ["self", "very"] }],
    })).toEqual(["Human proof"]);

    expect(buildCommunitySidebarRequirements({
      gateSummaries: [{ gate_type: "unique_human", accepted_providers: ["zkpassport"] }],
    })).toEqual(["ZKPassport proof"]);
  });

  test("falls back to English labels when locale is omitted", () => {
    expect(buildCommunitySidebarRequirements({
      gateSummaries: [{ gate_type: "nationality", required_value: "PS" }],
    })).toEqual(["Palestine nationality"]);
  });

  test("renders ethereum nft requirement labels", () => {
    expect(buildCommunitySidebarRequirements({
      gateSummaries: [{ gate_type: "erc721_holding", contract_address: "0x1111111111111111111111111111111111111111" }],
    })).toEqual(["1 Ethereum NFT from 0x1111...1111"]);

    expect(buildCommunitySidebarRequirements({
      gateSummaries: [{
        gate_type: "erc721_holding",
        contract_address: "0x1111111111111111111111111111111111111111",
        min_quantity: 10,
      }],
    })).toEqual(["10 Ethereum NFTs from 0x1111...1111"]);
  });

  test("includes proof-of-work in visible policy labels", () => {
    expect(buildCommunitySidebarRequirements({
      gateSummaries: [
        { gate_type: "unique_human", accepted_providers: ["very"] },
        { gate_type: "altcha_pow" },
      ],
    })).toEqual(["Palm scan", "Proof of work"]);
  });
});

describe("asset balance sidebar presentation", () => {
  const summary = {
    gate_type: "asset_balance" as const,
    asset_id: "eip155:1/slip44:60",
    min_amount_atomic: "500000000000000000",
    asset_symbol: "ETH",
    asset_decimals: 18,
  };

  function eligibility(): JoinEligibility {
    return {
      status: "verification_required",
      failure_reason: "asset_balance_too_low",
      membership_gate_summaries: [summary],
      gate_evaluation: {
        required_action_set: {
          kind: "set",
          mode: "all",
          items: [{
            kind: "action",
            capability: "asset_balance",
            asset_id: summary.asset_id,
            required_amount_atomic: summary.min_amount_atomic,
            current_amount_atomic: "200000000000000000",
            shortfall_amount_atomic: "300000000000000000",
            evaluated_wallet_count: 1,
          }],
        },
      },
    } as JoinEligibility;
  }

  test("keeps the persistent row requirement-only when action data includes a shortfall", () => {
    const [item] = buildCommunitySidebarGateItems({ gateSummaries: [summary], eligibility: eligibility() });
    expect(item?.label).toBe("At least 0.5 ETH");
    expect(item && "detail" in item).toBe(false);
  });
});

describe("buildCommunitySidebarGateItems", () => {
  test("keeps a synthetic default-age row outside trace matching", () => {
    const items = buildCommunitySidebarGateItems({
      defaultAgeGatePolicy: "18_plus",
      eligibility: {
        status: "verification_required",
        gate_evaluation: {
          passed: false,
          trace: { kind: "gate", gate_type: "minimum_age", passed: false },
          required_action_set: null,
        },
      } as JoinEligibility,
      gateSummaries: [{ gate_type: "minimum_age", required_minimum_age: 21 }],
    });

    expect(items.map((item) => [item.label, item.status])).toEqual([
      ["18+", "met"],
      ["21+", "unmet"],
    ]);
  });

  test("uses eligibility to mark all-mode satisfied gates met", () => {
    expect(buildCommunitySidebarGateItems({
      gateMatchMode: "all",
      eligibility: { status: "joinable" } as JoinEligibility,
      gateSummaries: [
        { gate_type: "unique_human", accepted_providers: ["very"] },
        { gate_type: "wallet_score", minimum_score: 20 },
      ],
    }).map((gate) => gate.status)).toEqual(["met", "met"]);
  });

  test("keeps any-mode satisfied alternatives muted", () => {
    expect(buildCommunitySidebarGateItems({
      gateMatchMode: "any",
      eligibility: { status: "joinable" } as JoinEligibility,
      gateSummaries: [
        { gate_type: "unique_human", accepted_providers: ["very"] },
        { gate_type: "wallet_score", minimum_score: 20 },
      ],
    }).map((gate) => gate.status)).toEqual(["unknown", "unknown"]);
  });
});

describe("buildCommunityPreviewSidebar", () => {
  test("uses localized preview text when ready", () => {
    const sidebar = buildCommunityPreviewSidebar({
      id: "cmt_test",
      object: "community_preview",
      display_name: "Pirate Club",
      description: "Canonical description",
      localized_text: {
        resolved_locale: "es",
        items: [{
          field_key: "community.description",
          source_hash: "hash",
          machine_translated: true,
          translated_value: "Descripcion traducida",
          translation_state: "ready",
        }, {
          field_key: "community.reference_link.crl_site.metadata.display_name",
          source_hash: "hash",
          machine_translated: true,
          translated_value: "Centro traducido",
          translation_state: "ready",
        }],
      },
      avatar_ref: null,
      banner_ref: null,
      membership_mode: "open",
      human_verification_lane: "self",
      member_count: 12,
      follower_count: 20,
      donation_policy_mode: "none",
      donation_partner: null,
      owner: {
        user: "usr_owner",
        display_name: "Owner Person",
        handle: "owner.pirate",
        avatar_ref: "profile://owner-avatar",
        nationality_badge_country: null,
        role: "owner" as const,
      },
      moderators: [],
      reference_links: [{
        community_reference_link: "crl_site",
        platform: "official_website",
        url: "https://pirate.test/community",
        label: "Official site",
        link_status: "active",
        verified: true,
        metadata: {
          display_name: "Canonical hub",
          image_url: null,
        },
        position: 0,
      }],
      membership_gate_summaries: [],
      gate_match_mode: null,
      rules: [],
      viewer_membership_status: "member",
      viewer_following: true,
      created: Date.parse("2026-04-24T00:00:00.000Z"),
    });

    expect(sidebar.description).toBe("Descripcion traducida");
    expect(sidebar.followerCount).toBe(20);
    expect(sidebar.memberCount).toBe(12);
    expect(sidebar.owner?.handle).toBe("owner.pirate");
    expect(sidebar.referenceLinks?.[0]?.metadata.displayName).toBe("Centro traducido");
  });

  test("passes preview gate match mode through to sidebar props", () => {
    const sidebar = buildCommunityPreviewSidebar({
      id: "cmt_test",
      object: "community_preview",
      display_name: "Pirate Club",
      description: null,
      avatar_ref: null,
      banner_ref: null,
      membership_mode: "gated",
      human_verification_lane: "self",
      member_count: 12,
      follower_count: 20,
      donation_policy_mode: "none",
      donation_partner: null,
      owner: null,
      moderators: [],
      reference_links: [],
      membership_gate_summaries: [
        { gate_type: "unique_human", accepted_providers: ["very"] },
        { gate_type: "altcha_pow" },
      ],
      membership_gate_expression: {
        op: "and",
        children: [
          { op: "gate", gate: { gate_type: "unique_human", accepted_providers: ["self"] } },
          {
            op: "or",
            children: [
              { op: "gate", gate: { gate_type: "unique_human", accepted_providers: ["very"] } },
              { op: "gate", gate: { gate_type: "altcha_pow" } },
            ],
          },
        ],
      },
      gate_match_mode: "any",
      rules: [],
      viewer_membership_status: "not_member",
      viewer_following: false,
      created: Date.parse("2026-04-24T00:00:00.000Z"),
    });

    expect(sidebar.requirementsMode).toBe("any");
    expect(sidebar.gateExpressionLabel).toBe("Self.xyz ID proof and (Palm scan or Proof of work)");
    expect(sidebar.showFlatGateOrMarkers).toBe(false);
    expect(sidebar.hasActionTimeCheck).toBe(true);
  });
});

describe("getCommunityActionLabel", () => {
  test("labels pending membership requests", () => {
    expect(getCommunityActionLabel("pending_request")).toBe("Request pending");
  });
});
