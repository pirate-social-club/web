import { describe, expect, test } from "bun:test";
import type { Community, JoinEligibility } from "@pirate/api-contracts";

import {
  buildCommunityPreviewSidebar,
  buildCommunitySidebar,
  buildCommunitySidebarGateItems,
  buildCommunitySidebarRequirements,
  getCommunityActionLabel,
} from "@/app/authenticated-helpers/community-sidebar-helpers";

describe("buildCommunitySidebar", () => {
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
    expect(sidebar.gateExpressionLabel).toBe("Private ID proof and (Palm scan or Proof of work)");
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
    })).toEqual(["18+", "فحص راحة اليد", "درجة Passport 20+"]);
  });

  test("names unique human requirements by accepted provider", () => {
    expect(buildCommunitySidebarRequirements({
      gateSummaries: [{ gate_type: "unique_human", accepted_providers: ["very"] }],
    })).toEqual(["Palm scan"]);

    expect(buildCommunitySidebarRequirements({
      gateSummaries: [{ gate_type: "unique_human", accepted_providers: ["self"] }],
    })).toEqual(["Private ID proof"]);

    expect(buildCommunitySidebarRequirements({
      gateSummaries: [{ gate_type: "unique_human", accepted_providers: ["self", "very"] }],
    })).toEqual(["Human proof"]);
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

describe("buildCommunitySidebarGateItems", () => {
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
    expect(sidebar.gateExpressionLabel).toBe("Private ID proof and (Palm scan or Proof of work)");
    expect(sidebar.hasActionTimeCheck).toBe(true);
  });
});

describe("getCommunityActionLabel", () => {
  test("labels pending membership requests", () => {
    expect(getCommunityActionLabel("pending_request")).toBe("Request pending");
  });
});
