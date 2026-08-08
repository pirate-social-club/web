import type { Meta, StoryObj } from "@storybook/react-vite";

import {
  HnsImportGuidance,
} from "@/components/compositions/verification/namespace-verification/hns-import-guidance";
import type { HnsImportChallengePayload } from "@/components/compositions/verification/verify-namespace-modal/verify-namespace-modal.types";

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
    preserved_unknown_record_types: [],
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

const acknowledgedPayload: HnsImportChallengePayload = {
  ...basePayload,
  replacement_acknowledged_at: "2026-08-08T12:00:00.000Z",
};

const meta = {
  title: "Compositions/Verification/HNS Import Guidance",
  component: HnsImportGuidance,
  args: {
    payload: basePayload,
  },
  parameters: {
    layout: "padded",
  },
} satisfies Meta<typeof HnsImportGuidance>;

export default meta;

type Story = StoryObj<typeof meta>;

export const PublishCompleteResource: Story = {
  name: "Publish these records",
};

export const PublishBlockedUnsupportedRecords: Story = {
  name: "Unsupported records (blocked)",
  args: {
    payload: {
      ...basePayload,
      publish_plan: {
        ...basePayload.publish_plan,
        replacement_records: [
          ...replacementRecords,
          { type: "TXT", txt: ["chunked-proof-a", "chunked-proof-b"] },
        ],
      },
    },
  },
};

export const WatchingForMinedUpdate: Story = {
  name: "Update not confirmed yet",
  args: {
    payload: acknowledgedPayload,
  },
};

export const PendingTreeCommit: Story = {
  name: "Transaction confirmed",
  args: {
    payload: {
      ...acknowledgedPayload,
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
  name: "Published records don't match",
  args: {
    payload: {
      ...acknowledgedPayload,
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
  name: "Records confirmed",
  args: {
    payload: {
      ...acknowledgedPayload,
      update_observed_height: 342_433,
      observation: {
        state: "delegation_not_secure",
        current_height: 342_470,
      },
    },
  },
};

export const Secure: Story = {
  name: "Setup complete",
  args: {
    payload: {
      ...acknowledgedPayload,
      update_observed_height: 342_433,
      observation: {
        state: "secure",
        current_height: 342_470,
      },
    },
  },
};
