import type { Meta, StoryObj } from "@storybook/react-vite";
import * as React from "react";

import {
  getHnsImportActionLabel,
  HnsImportGuidance,
} from "@/components/compositions/verification/namespace-verification/hns-import-guidance";
import type { HnsImportChallengePayload } from "@/components/compositions/verification/verify-namespace-modal/verify-namespace-modal.types";
import { Button } from "@/components/primitives/button";

const replacementRecords = [
  { type: "NS", ns: "ns1.pirate." },
  { type: "NS", ns: "ns2.pirate." },
  { type: "TXT", txt: ["pirate-verification=nvs_fixture_challenge"] },
  { type: "DS", keyTag: 49194, algorithm: 13, digestType: 2, digest: "C74E61F29F60B98EB8A31C8A6286C1F45F418A26A42EB92C332176EA875CFDF2" },
  { type: "DS", keyTag: 49194, algorithm: 13, digestType: 4, digest: "4E6844DF67EBA284F693ECA7AF78BB3815B7CFCF8679EB47A5314BEC9D4AC3CA218957A644D7FDDA7EA0653EF12A88E3" },
  { type: "SYNTH4", address: "198.51.100.23" },
];

const basePayload: HnsImportChallengePayload = {
  kind: "hns_import",
  publish_plan: {
    version: "hns_import_publish_v1",
    replacement_semantics: "complete_resource",
    current_records: [{ type: "SYNTH4", address: "198.51.100.23" }],
    preserved_records: [{ type: "SYNTH4", address: "198.51.100.23" }],
    removed_conflicts: [],
    added_records: replacementRecords.slice(0, 5),
    replacement_records: replacementRecords,
    preserved_unknown_record_types: ["SYNTH4"],
    acknowledgement_required: true,
  },
  observed_chain_anchor: {
    network: "main",
    height: 342_431,
    block_hash: "00fixtureblockhash",
    median_time: 1_785_000_000,
  },
  observation: {
    state: "waiting_for_update",
    current_height: 342_431,
  },
};

const meta = {
  title: "Compositions/Verification/HNS Import Guidance",
  component: HnsImportGuidance,
  args: {
    payload: basePayload,
    rootLabel: "fixture-root",
  },
  parameters: {
    layout: "padded",
  },
} satisfies Meta<typeof HnsImportGuidance>;

export default meta;

type Story = StoryObj<typeof meta>;

export const PublishCompleteResource: Story = {
  name: "Phase 1 — Publish complete resource",
};

function AcknowledgementInteractionStory() {
  const [payload, setPayload] = React.useState(basePayload);

  return (
    <div className="space-y-4">
      <HnsImportGuidance
        payload={payload}
        rootLabel="fixture-root"
      />
      <div className="flex justify-end">
        <Button
          onClick={() => setPayload({
            ...payload,
            replacement_acknowledged_at: "2026-08-08T12:00:00.000Z",
          })}
        >
          {getHnsImportActionLabel(payload)}
        </Button>
      </div>
    </div>
  );
}

export const AcknowledgeAndCheckChain: Story = {
  name: "Phase 1 — Publish action interaction",
  play: async ({ canvasElement }) => {
    const action = Array.from(canvasElement.querySelectorAll<HTMLButtonElement>("button"))
      .find((button) => button.textContent?.includes("I published all records"));
    action?.click();
    await new Promise((resolve) => setTimeout(resolve, 0));
  },
  render: () => <AcknowledgementInteractionStory />,
};

export const WatchingForMinedUpdate: Story = {
  name: "Phase 2 — Waiting for mined UPDATE",
  args: {
    payload: {
      ...basePayload,
      replacement_acknowledged_at: "2026-08-08T12:00:00.000Z",
    },
  },
};

export const PendingTreeCommit: Story = {
  name: "Phase 2 — Pending tree commit",
  args: {
    payload: {
      ...basePayload,
      replacement_acknowledged_at: "2026-08-08T12:00:00.000Z",
      update_observed_height: 342_433,
      target_tree_boundary: 342_468,
      observation: {
        state: "pending_tree_commit",
        current_height: 342_440,
        target_tree_boundary: 342_468,
      },
    },
  },
};

export const ResourceMismatch: Story = {
  name: "Phase 2 — Resource mismatch",
  args: {
    payload: {
      ...basePayload,
      replacement_acknowledged_at: "2026-08-08T12:00:00.000Z",
      update_observed_height: 342_433,
      observation: {
        state: "resource_mismatch",
        current_height: 342_468,
        missing_records: [replacementRecords[3], replacementRecords[4]],
        unexpected_records: [{ type: "NS", ns: "old-nameserver.invalid." }],
      },
    },
  },
};

export const DelegationNotSecure: Story = {
  name: "Phase 2 — Delegation not secure",
  args: {
    payload: {
      ...basePayload,
      replacement_acknowledged_at: "2026-08-08T12:00:00.000Z",
      update_observed_height: 342_433,
      observation: {
        state: "delegation_not_secure",
        current_height: 342_470,
      },
    },
  },
};

export const Secure: Story = {
  name: "Phase 2 — Secure",
  args: {
    payload: {
      ...basePayload,
      replacement_acknowledged_at: "2026-08-08T12:00:00.000Z",
      update_observed_height: 342_433,
      observation: {
        state: "secure",
        current_height: 342_470,
      },
    },
  },
};

export const Expired: Story = {
  name: "Expired session",
  args: {
    expired: true,
  },
};
