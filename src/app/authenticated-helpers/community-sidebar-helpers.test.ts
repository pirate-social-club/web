import { describe, expect, test } from "bun:test";

import { buildCommunityPreviewSidebar, buildCommunitySidebarRequirements, getCommunityActionLabel } from "@/app/authenticated-helpers/community-sidebar-helpers";

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
    })).toEqual(["Ethereum NFT holder"]);
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
});

describe("getCommunityActionLabel", () => {
  test("labels pending membership requests", () => {
    expect(getCommunityActionLabel("pending_request")).toBe("Request pending");
  });
});
