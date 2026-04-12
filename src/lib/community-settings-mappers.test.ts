import assert from "node:assert/strict";
import { describe, test } from "node:test";

import {
  buildCommunityGateRuleSaveRequests,
  buildCommunitySettingsState,
  mapSettingsToFlairPatch,
  validateCommunitySettingsGateRules,
} from "@/lib/community-settings-mappers";
import type {
  PirateApiCommunity,
  PirateApiCommunityFlairPolicy,
  PirateApiCommunityGateRule,
  PirateApiCommunityProfile,
  PirateApiCommunityReferenceLinkAdmin,
} from "@/lib/pirate-api";

describe("community-settings-mappers", () => {
  test("buildCommunitySettingsState maps token gate config and narrows request membership mode", () => {
    const community: PirateApiCommunity = {
      community_id: "community_123",
      display_name: "Synth Club",
      description: "Modular everything.",
      membership_mode: "request",
      allow_anonymous_identity: true,
      anonymous_identity_scope: "thread_stable",
      default_age_gate_policy: "18_plus",
      created_at: "2026-04-11T00:00:00.000Z",
    };
    const profile: PirateApiCommunityProfile = {
      rules: [],
      resource_links: [],
    };
    const referenceLinks: PirateApiCommunityReferenceLinkAdmin[] = [];
    const flairPolicy: PirateApiCommunityFlairPolicy = {
      flair_enabled: true,
      require_flair_on_top_level_posts: true,
      definitions: [
        {
          flair_id: "flair_1",
          label: "Release",
          description: "Released music",
          color_token: "#ff6600",
          position: 0,
          allowed_post_types: ["song"],
          status: "active",
        },
      ],
    };
    const gateRules: PirateApiCommunityGateRule[] = [
      {
        gate_rule_id: "gate_1",
        community_id: "community_123",
        scope: "membership",
        gate_family: "token_holding",
        gate_type: "erc1155_holding",
        chain_namespace: "eip155:137",
        gate_config: {
          contract_address: "0x495f947276749Ce646f68AC8c248420045cb7b5e",
          token_id: "42",
          min_balance: "3",
        },
        proof_requirements: null,
        status: "active",
        created_at: "2026-04-11T00:00:00.000Z",
        updated_at: "2026-04-11T00:00:00.000Z",
      },
    ];

    const state = buildCommunitySettingsState({
      community,
      profile,
      referenceLinks,
      flairPolicy,
      gateRules,
    });

    assert.equal(state.membershipMode, "gated");
    assert.equal(state.anonymousIdentityScope, "thread_stable");
    assert.equal(state.defaultAgeGatePolicy, "18_plus");
    assert.equal(state.flairPolicy?.definitions[0]?.label, "Release");
    assert.deepEqual(state.gateRules[0], {
      gateRuleId: "gate_1",
      scope: "membership",
      gateFamily: "token_holding",
      gateType: "erc1155_holding",
      status: "active",
      position: 0,
      chainNamespace: "eip155:137",
      proofRequirements: null,
      gateConfig: {
        contract_address: "0x495f947276749Ce646f68AC8c248420045cb7b5e",
        token_id: "42",
        min_balance: "3",
      },
    });
  });

  test("validateCommunitySettingsGateRules catches incomplete token gates", () => {
    const errors = validateCommunitySettingsGateRules([
      {
        gateRuleId: "gate_1",
        scope: "posting",
        gateFamily: "token_holding",
        gateType: "erc1155_holding",
        status: "active",
        position: 0,
        chainNamespace: "eip155:1",
        gateConfig: {
          contract_address: "0x1234",
          token_id: "",
          min_balance: "0",
        },
      },
    ]);

    assert.deepEqual(errors, {
      gate_1: [
        "Enter a valid contract address.",
        "Token ID must be a non-negative integer.",
        "Min balance must be at least 1.",
      ],
    });
  });

  test("validateCommunitySettingsGateRules catches incomplete nationality gates", () => {
    const errors = validateCommunitySettingsGateRules([
      {
        gateRuleId: "gate_nat",
        scope: "membership",
        gateFamily: "identity_proof",
        gateType: "nationality",
        status: "active",
        position: 0,
        gateConfig: {
          required_value: "",
        },
      },
    ]);

    assert.deepEqual(errors, {
      gate_nat: [
        "Enter a country code.",
      ],
    });
  });

  test("buildCommunityGateRuleSaveRequests includes changed and removed rules", () => {
    const requests = buildCommunityGateRuleSaveRequests({
      initialRules: [
        {
          gateRuleId: "gate_1",
          scope: "membership",
          gateFamily: "identity_proof",
          gateType: "unique_human",
          status: "active",
          position: 0,
        },
        {
          gateRuleId: "gate_2",
          scope: "posting",
          gateFamily: "identity_proof",
          gateType: "sanctions_clear",
          status: "active",
          position: 0,
        },
      ],
      currentRules: [
        {
          gateRuleId: "gate_1",
          scope: "membership",
          gateFamily: "token_holding",
          gateType: "erc721_holding",
          status: "active",
          position: 0,
          chainNamespace: "eip155:1",
          gateConfig: {
            contract_address: "0xBC4CA0eda7647A8aB7C2061c2E118A18a936f13D",
          },
        },
      ],
    });

    assert.deepEqual(requests, [
      {
        gate_rule_id: "gate_1",
        scope: "membership",
        gate_family: "token_holding",
        gate_type: "erc721_holding",
        proof_requirements: null,
        chain_namespace: "eip155:1",
        gate_config: {
          contract_address: "0xBC4CA0eda7647A8aB7C2061c2E118A18a936f13D",
        },
        status: "active",
      },
      {
        gate_rule_id: "gate_2",
        scope: "posting",
        gate_family: "identity_proof",
        gate_type: "sanctions_clear",
        proof_requirements: null,
        chain_namespace: null,
        gate_config: null,
        status: "disabled",
      },
    ]);
  });

  test("buildCommunityGateRuleSaveRequests normalizes nationality gates for Self", () => {
    const requests = buildCommunityGateRuleSaveRequests({
      initialRules: [],
      currentRules: [
        {
          gateRuleId: "gate_nat",
          scope: "membership",
          gateFamily: "identity_proof",
          gateType: "nationality",
          status: "active",
          position: 0,
          gateConfig: {
            required_value: "us",
          },
        },
      ],
    });

    assert.deepEqual(requests, [
      {
        gate_rule_id: "gate_nat",
        scope: "membership",
        gate_family: "identity_proof",
        gate_type: "nationality",
        proof_requirements: [
          {
            proof_type: "nationality",
            accepted_providers: ["self"],
          },
        ],
        chain_namespace: null,
        gate_config: {
          required_value: "US",
        },
        status: "active",
      },
    ]);
  });

  test("mapSettingsToFlairPatch preserves narrowed v1 payload", () => {
    const patch = mapSettingsToFlairPatch({
      flairEnabled: true,
      definitions: [
        {
          flairId: "flair_1",
          label: "Question",
          colorToken: "#0088ff",
          status: "active",
          position: 0,
        },
      ],
    });

    assert.deepEqual(patch, {
      flair_enabled: true,
      require_flair_on_top_level_posts: false,
      definitions: [
        {
          flair_id: "flair_1",
          label: "Question",
          description: null,
          color_token: "#0088ff",
          position: 0,
          allowed_post_types: null,
          status: "active",
        },
      ],
    });
  });
});
