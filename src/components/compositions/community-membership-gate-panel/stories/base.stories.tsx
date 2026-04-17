import type { Meta, StoryObj } from "@storybook/react-vite";
import * as React from "react";

import { CommunityMembershipGatePanel } from "../community-membership-gate-panel";

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
