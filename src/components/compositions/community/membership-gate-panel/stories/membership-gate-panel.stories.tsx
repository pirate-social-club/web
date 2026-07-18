import type { Meta, StoryObj } from "@storybook/react-vite";
import * as React from "react";

import { CommunityMembershipGatePanel } from "../community-membership-gate-panel";

const meta = {
  title: "Compositions/Community/MembershipGatePanel",
  component: CommunityMembershipGatePanel,
  decorators: [
    (Story: () => React.ReactNode) => (
      <div style={{ width: "min(100vw - 32px, 840px)" }}>
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof CommunityMembershipGatePanel>;

export default meta;

type Story = StoryObj<typeof meta>;

function gateEvaluation(capabilities: Array<"altcha_pow" | "gender" | "nationality" | "unique_human" | "wallet_score">, provider: "altcha" | "self" | "very" | "passport" = "self") {
  return {
    passed: capabilities.length === 0,
    trace: { kind: "op" as const, op: "and" as const, passed: capabilities.length === 0, children: [] },
    required_action_set: capabilities.length === 0
      ? null
      : {
        kind: "set" as const,
        mode: "all" as const,
        items: capabilities.map((capability) => {
          if (capability === "wallet_score") return { kind: "action" as const, provider: "passport" as const, capability, minimum_score: 20, actual_score: null };
          if (capability === "altcha_pow") return { kind: "action" as const, provider: "altcha" as const, capability, scope: "community_join" as const };
          if (capability === "gender") return { kind: "action" as const, provider: "self" as const, capability, allowed_markers: ["F" as const] };
          if (capability === "nationality") return { kind: "action" as const, provider: "self" as const, capability, allowed_countries: ["US"] };
          return { kind: "action" as const, provider, capability };
        }),
      },
  } as any;
}

export const DocumentMarkerVerificationRequired: Story = {
  name: "States / Document Marker Verification Required",
  args: { gates: [] },
  render: () => (
    <CommunityMembershipGatePanel
      gates={[{ gate_type: "gender", required_value: "F" }]}
      eligibility={{
        community: "community_marker",
        membership_mode: "gated",
        human_verification_lane: "self",
        joinable_now: false,
        status: "verification_required",
        membership_gate_summaries: [
          { gate_type: "gender", required_value: "F" },
        ],
        gate_evaluation: gateEvaluation(["gender"]),
        suggested_verification_intent: "community_join",
      }}
    />
  ),
};

export const DocumentMarkerMismatch: Story = {
  name: "States / Document Marker Mismatch",
  args: { gates: [] },
  render: () => (
    <CommunityMembershipGatePanel
      gates={[{ gate_type: "gender", required_value: "F" }]}
      eligibility={{
        community: "community_marker",
        membership_mode: "gated",
        human_verification_lane: "self",
        joinable_now: false,
        status: "gate_failed",
        membership_gate_summaries: [
          { gate_type: "gender", required_value: "F" },
        ],
        gate_evaluation: gateEvaluation([]),
        suggested_verification_intent: "community_join",
      }}
      joinError="Your verified ID document sex marker does not match this community's requirement."
    />
  ),
};

export const Joinable: Story = {
  name: "States / Joinable",
  args: { gates: [] },
  render: () => (
    <CommunityMembershipGatePanel
      gates={[{ gate_type: "nationality", required_value: "US" }]}
      eligibility={{
        community: "community_joinable",
        membership_mode: "gated",
        human_verification_lane: "self",
        joinable_now: true,
        status: "joinable",
        membership_gate_summaries: [
          { gate_type: "nationality", required_value: "US" },
        ],
        gate_evaluation: gateEvaluation([]),
        suggested_verification_intent: "community_join",
      }}
    />
  ),
};

export const Requestable: Story = {
  name: "States / Requestable",
  args: { gates: [] },
  render: () => (
    <CommunityMembershipGatePanel
      gates={[{ gate_type: "gender", required_value: "F" }]}
      eligibility={{
        community: "community_requestable",
        membership_mode: "request",
        human_verification_lane: "self",
        joinable_now: false,
        status: "requestable",
        membership_gate_summaries: [
          { gate_type: "gender", required_value: "F" },
        ],
        gate_evaluation: gateEvaluation([]),
        suggested_verification_intent: "community_join",
      }}
    />
  ),
};

export const PendingRequest: Story = {
  name: "States / Pending Request",
  args: { gates: [] },
  render: () => (
    <CommunityMembershipGatePanel
      gates={[{ gate_type: "gender", required_value: "F" }]}
      eligibility={{
        community: "community_requestable",
        membership_mode: "request",
        human_verification_lane: "self",
        joinable_now: false,
        status: "pending_request",
        membership_gate_summaries: [
          { gate_type: "gender", required_value: "F" },
        ],
        gate_evaluation: gateEvaluation([]),
        suggested_verification_intent: "community_join",
      }}
    />
  ),
};

export const MultipleMissingCapabilities: Story = {
  name: "States / Multiple Missing Capabilities",
  args: { gates: [] },
  render: () => (
    <CommunityMembershipGatePanel
      gates={[
        { gate_type: "nationality", required_value: "US" },
        { gate_type: "age_over_18" },
        { gate_type: "unique_human" },
      ]}
      eligibility={{
        community: "community_multi",
        membership_mode: "gated",
        human_verification_lane: "self",
        joinable_now: false,
        status: "verification_required",
        membership_gate_summaries: [
          { gate_type: "nationality", required_value: "US" },
          { gate_type: "age_over_18" },
          { gate_type: "unique_human" },
        ],
        gate_evaluation: gateEvaluation(["nationality", "unique_human"]),
        suggested_verification_intent: "community_join",
      }}
    />
  ),
};

const flatAnyGates = [
  { gate_type: "wallet_score" as const, minimum_score: 8 },
  { accepted_providers: ["very" as const], gate_type: "unique_human" as const },
  { gate_type: "altcha_pow" as const },
];

export const FlatAnyMode: Story = {
  name: "Modes / Any (flat OR)",
  args: { gates: [] },
  render: () => (
    <CommunityMembershipGatePanel
      gates={flatAnyGates}
      eligibility={{
        community: "community_flat_any",
        membership_mode: "gated",
        human_verification_lane: "self",
        joinable_now: false,
        status: "verification_required",
        membership_gate_summaries: flatAnyGates,
        gate_evaluation: gateEvaluation(["wallet_score", "unique_human", "altcha_pow"]),
        suggested_verification_intent: "community_join",
      }}
      mode="any"
      requirementGroups={[{ mode: "any", requirements: flatAnyGates }]}
    />
  ),
};

export const MixedRequiredAndAnyMode: Story = {
  name: "Modes / Mixed required and OR",
  args: { gates: [] },
  render: () => {
    const required = { accepted_providers: ["self" as const], gate_type: "unique_human" as const };
    const alternatives = [
      { accepted_providers: ["very" as const], gate_type: "unique_human" as const },
      { gate_type: "altcha_pow" as const },
    ];
    const gates = [required, ...alternatives];
    return (
      <CommunityMembershipGatePanel
        gates={gates}
        eligibility={{
          community: "community_mixed",
          membership_mode: "gated",
          human_verification_lane: "self",
          joinable_now: false,
          status: "verification_required",
          membership_gate_summaries: gates,
          gate_evaluation: gateEvaluation(["unique_human", "altcha_pow"]),
          suggested_verification_intent: "community_join",
        }}
        mode="all"
        requirementGroups={[
          { mode: "all", requirements: [required] },
          { mode: "any", requirements: alternatives },
        ]}
      />
    );
  },
};

export const VeryVerificationRequired: Story = {
  name: "States / Very Verification Required",
  args: { gates: [] },
  render: () => (
    <CommunityMembershipGatePanel
      gates={[{ accepted_providers: ["very"], gate_type: "unique_human" }]}
      eligibility={{
        community: "community_very",
        membership_mode: "gated",
        human_verification_lane: "very",
        joinable_now: false,
        status: "verification_required",
        membership_gate_summaries: [{ accepted_providers: ["very"], gate_type: "unique_human" }],
        gate_evaluation: gateEvaluation(["unique_human"], "very"),
        suggested_verification_intent: "community_join",
      }}
    />
  ),
};

export const PassportScoreRequired: Story = {
  name: "States / Passport Score Required",
  args: { gates: [] },
  render: () => (
    <CommunityMembershipGatePanel
      gates={[{ gate_type: "wallet_score", minimum_score: 20 }]}
      eligibility={{
        community: "community_passport_score",
        membership_mode: "gated",
        human_verification_lane: "self",
        joinable_now: false,
        status: "verification_required",
        membership_gate_summaries: [
          { gate_type: "wallet_score", minimum_score: 20 },
        ],
        gate_evaluation: gateEvaluation(["wallet_score"], "passport"),
        suggested_verification_intent: null,
        wallet_score_status: {
          current_score_decimal: null,
          required_score_decimal: "20",
          passing_score: null,
          last_scored_at: null,
        },
      }}
    />
  ),
};

const courtyardPokemonGates = [
  {
    gate_type: "erc721_inventory_match" as const,
    inventory_provider: "courtyard" as const,
    chain_namespace: "eip155:1",
    contract_address: "0xd4ac3CE8e1E14CD60666D49AC34Ff2d2937cF6FA",
    min_quantity: 1,
    asset_category: "trading_card",
    asset_filter_label: "Pokemon trading card",
  },
  {
    gate_type: "erc721_inventory_match" as const,
    inventory_provider: "courtyard" as const,
    chain_namespace: "eip155:137",
    contract_address: "0x251BE3A17Af4892035C37ebf5890F4a4D889dcAD",
    min_quantity: 1,
    asset_category: "trading_card",
    asset_filter_label: "Pokemon trading card",
  },
];

export const CourtyardInventoryRequired: Story = {
  name: "States / Courtyard Inventory Required",
  args: { gates: [] },
  render: () => (
    <CommunityMembershipGatePanel
      gates={courtyardPokemonGates}
      eligibility={{
        community: "community_courtyard",
        membership_mode: "gated",
        human_verification_lane: "self",
        joinable_now: false,
        status: "gate_failed",
        membership_gate_summaries: courtyardPokemonGates,
        gate_evaluation: gateEvaluation([]),
        suggested_verification_intent: "community_join",
        failure_reason: "erc721_inventory_match_required",
      }}
      joinError="Connect a wallet that holds the required Courtyard collectibles to join."
    />
  ),
};

export const Mobile: Story = {
  name: "Mobile layout",
  args: { gates: [] },
  parameters: {
    viewport: { defaultViewport: "mobile1" },
  },
  render: () => (
    <CommunityMembershipGatePanel
      gates={[{ gate_type: "nationality", required_value: "US" }]}
      eligibility={{
        community: "community_mobile",
        membership_mode: "gated",
        human_verification_lane: "self",
        joinable_now: false,
        status: "verification_required",
        membership_gate_summaries: [
          { gate_type: "nationality", required_value: "US" },
        ],
        gate_evaluation: gateEvaluation(["nationality"]),
        suggested_verification_intent: "community_join",
      }}
    />
  ),
};

export const MobileVeryVerificationRequired: Story = {
  name: "Mobile / Very Verification Required",
  args: { gates: [] },
  parameters: {
    viewport: { defaultViewport: "mobile1" },
  },
  render: () => (
    <CommunityMembershipGatePanel
      gates={[{ accepted_providers: ["very"], gate_type: "unique_human" }]}
      eligibility={{
        community: "community_mobile_very",
        membership_mode: "gated",
        human_verification_lane: "very",
        joinable_now: false,
        status: "verification_required",
        membership_gate_summaries: [{ accepted_providers: ["very"], gate_type: "unique_human" }],
        gate_evaluation: gateEvaluation(["unique_human"], "very"),
        suggested_verification_intent: "community_join",
      }}
    />
  ),
};
