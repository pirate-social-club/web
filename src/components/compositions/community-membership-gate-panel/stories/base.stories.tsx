import type { Meta, StoryObj } from "@storybook/react-vite";
import * as React from "react";

import { CommunityMembershipGatePanel } from "../community-membership-gate-panel";
import { getVerificationPromptCopy } from "@/lib/identity-gates";

const meta = {
  title: "Compositions/CommunityMembershipGatePanel",
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

export const NationalityVerificationRequired: Story = {
  name: "States / Nationality Verification Required",
  args: { gates: [] },
  render: () => (
    <CommunityMembershipGatePanel
      eligibility={{
        community_id: "community_nationality",
        membership_mode: "gated",
        human_verification_lane: "self",
        joinable_now: false,
        status: "verification_required",
        membership_gate_summaries: [{ gate_type: "nationality", required_value: "US" }],
        missing_capabilities: ["nationality"],
        suggested_verification_provider: "self",
        suggested_verification_intent: "community_join",
      }}
      gates={[{ gate_type: "nationality", required_value: "US" }]}
    />
  ),
};

export const DocumentMarkerVerificationRequired: Story = {
  name: "States / Document Marker Verification Required",
  args: { gates: [] },
  render: () => (
    <CommunityMembershipGatePanel
      gates={[{ gate_type: "gender", required_value: "F" }]}
      eligibility={{
        community_id: "community_marker",
        membership_mode: "gated",
        human_verification_lane: "self",
        joinable_now: false,
        status: "verification_required",
        membership_gate_summaries: [{ gate_type: "gender", required_value: "F" }],
        missing_capabilities: ["gender"],
        suggested_verification_provider: "self",
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
        community_id: "community_marker",
        membership_mode: "gated",
        human_verification_lane: "self",
        joinable_now: false,
        status: "gate_failed",
        membership_gate_summaries: [{ gate_type: "gender", required_value: "F" }],
        missing_capabilities: [],
        suggested_verification_provider: "self",
        suggested_verification_intent: "community_join",
      }}
      joinError="Your verified Self document marker does not match this community's requirement."
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
        community_id: "community_joinable",
        membership_mode: "gated",
        human_verification_lane: "self",
        joinable_now: true,
        status: "joinable",
        membership_gate_summaries: [{ gate_type: "nationality", required_value: "US" }],
        missing_capabilities: [],
        suggested_verification_provider: "self",
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
        community_id: "community_requestable",
        membership_mode: "request",
        human_verification_lane: "self",
        joinable_now: false,
        status: "requestable",
        membership_gate_summaries: [{ gate_type: "gender", required_value: "F" }],
        missing_capabilities: [],
        suggested_verification_provider: "self",
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
        community_id: "community_multi",
        membership_mode: "gated",
        human_verification_lane: "self",
        joinable_now: false,
        status: "verification_required",
        membership_gate_summaries: [
          { gate_type: "nationality", required_value: "US" },
          { gate_type: "age_over_18" },
          { gate_type: "unique_human" },
        ],
        missing_capabilities: ["nationality", "age_over_18", "unique_human"],
        suggested_verification_provider: "self",
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
        community_id: "community_passport_score",
        membership_mode: "gated",
        human_verification_lane: "self",
        joinable_now: false,
        status: "verification_required",
        membership_gate_summaries: [{ gate_type: "wallet_score", minimum_score: 20 }],
        missing_capabilities: ["wallet_score"],
        suggested_verification_provider: "passport",
        suggested_verification_intent: null,
      }}
      verificationPrompt={{
        ...getVerificationPromptCopy("passport", ["wallet_score"]),
        href: "https://app.passport.xyz/",
      }}
    />
  ),
};

export const PassportSanctionsScreeningRequired: Story = {
  name: "States / Passport Sanctions Screening Required",
  args: { gates: [] },
  render: () => (
    <CommunityMembershipGatePanel
      gates={[{ gate_type: "sanctions_clear" }]}
      eligibility={{
        community_id: "community_passport_sanctions",
        membership_mode: "gated",
        human_verification_lane: "self",
        joinable_now: false,
        status: "verification_required",
        membership_gate_summaries: [{ gate_type: "sanctions_clear" }],
        missing_capabilities: ["sanctions_clear"],
        suggested_verification_provider: "passport",
        suggested_verification_intent: null,
      }}
      verificationPrompt={{
        ...getVerificationPromptCopy("passport", ["sanctions_clear"]),
        href: "https://app.passport.xyz/",
      }}
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
        community_id: "community_mobile",
        membership_mode: "gated",
        human_verification_lane: "self",
        joinable_now: false,
        status: "verification_required",
        membership_gate_summaries: [{ gate_type: "nationality", required_value: "US" }],
        missing_capabilities: ["nationality"],
        suggested_verification_provider: "self",
        suggested_verification_intent: "community_join",
      }}
    />
  ),
};

export const AdminValuePreview: Story = {
  name: "States / Admin Value Preview",
  args: { gates: [] },
  render: () => (
    <CommunityMembershipGatePanel
      gates={[
        { gate_type: "nationality", required_value: "US" },
        { gate_type: "gender", required_value: "F" },
      ]}
      revealRequirementValues
    />
  ),
};
