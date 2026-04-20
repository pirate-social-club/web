import { describe, expect, test } from "bun:test";
import type { Community } from "@pirate/api-contracts";

import { isPublicAudienceAllowed } from "../app/authenticated-routes/create-post-state";

function createCommunity(overrides: Partial<Community> = {}): Community {
  return {
    community_id: "cmt_test",
    creator_user_id: "usr_test",
    display_name: "Test community",
    route_slug: "test-community",
    description: null,
    avatar_ref: null,
    banner_ref: null,
    status: "active",
    provisioning_state: "active",
    governance_mode: "centralized",
    handle_policy: { policy_template: "standard" },
    membership_mode: "open",
    default_age_gate_policy: "none",
    allow_anonymous_identity: false,
    anonymous_identity_scope: "community_stable",
    allowed_disclosed_qualifiers: [],
    created_at: "2026-01-01T00:00:00.000Z",
    updated_at: "2026-01-01T00:00:00.000Z",
    donation_policy_mode: "none",
    donation_partner_status: "unconfigured",
    donation_partner_id: null,
    donation_partner: null,
    default_monetization: null,
    openai_moderation_settings: null,
    adult_content_policy: {} as Community["adult_content_policy"],
    graphic_content_policy: {} as Community["graphic_content_policy"],
    civility_policy: {} as Community["civility_policy"],
    reference_links: [],
    gate_rules: [],
    viewer_membership_status: "not_member",
    ...overrides,
  } as Community;
}

describe("isPublicAudienceAllowed", () => {
  test("allows public posts when the community only has membership gates", () => {
    const community = createCommunity({
      membership_mode: "gated",
      gate_rules: [
        {
          gate_rule_id: "gate_nat_us",
          community_id: "cmt_test",
          scope: "membership",
          gate_family: "identity_proof",
          gate_type: "nationality",
          status: "active",
          created_at: "2026-01-01T00:00:00.000Z",
          updated_at: "2026-01-01T00:00:00.000Z",
          proof_requirements: [
            {
              proof_type: "nationality",
              accepted_providers: ["self"],
              config: { required_value: "US" },
            },
          ],
        },
      ],
    });

    expect(isPublicAudienceAllowed(community)).toBe(true);
  });

  test("disables public posts when the community has an active viewer gate", () => {
    const community = createCommunity({
      gate_rules: [
        {
          gate_rule_id: "gate_viewer_human",
          community_id: "cmt_test",
          scope: "viewer",
          gate_family: "identity_proof",
          gate_type: "unique_human",
          status: "active",
          created_at: "2026-01-01T00:00:00.000Z",
          updated_at: "2026-01-01T00:00:00.000Z",
          proof_requirements: [
            {
              proof_type: "unique_human",
              accepted_providers: ["self"],
            },
          ],
        },
      ],
    });

    expect(isPublicAudienceAllowed(community)).toBe(false);
  });
});
