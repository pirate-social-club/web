import type { Meta, StoryObj } from "@storybook/react-vite";

import { CommunityNamespaceVerificationPage } from "@/components/compositions/community/namespace-verification-page/community-namespace-verification-page";
import {
  mockNamespaceCallbacks,
  mockPirateNameservers,
} from "@/components/compositions/community/moderation-shell/stories/story-fixtures";
import type {
  NamespaceVerificationCallbacks,
  HnsImportChallengePayload,
  NamespaceVerificationStartResult,
  NamespaceVerificationStatus,
} from "@/components/compositions/verification/verify-namespace-modal/verify-namespace-modal.types";

const meta = {
  title: "Compositions/Community/Moderation/Namespace",
  component: CommunityNamespaceVerificationPage,
  args: {
    callbacks: mockNamespaceCallbacks,
  },
  parameters: {
    layout: "fullscreen",
  },
} satisfies Meta<typeof CommunityNamespaceVerificationPage>;

export default meta;

type Story = StoryObj<typeof meta>;

function hnsSession(status: NamespaceVerificationStatus): NamespaceVerificationStartResult {
  return {
    namespaceVerificationSessionId: "nvs_infinity_records_stub",
    family: "hns",
    rootLabel: "infinity",
    challengeHost: "infinity",
    challengeTxtValue: "pirate-verification=nvs_infinity_records",
    challengePayload: null,
    challengeExpiresAt: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
    status,
    operationClass: null,
    pirateDnsAuthorityVerified: false,
    setupNameservers: mockPirateNameservers,
  };
}

const hnsImportPayload: HnsImportChallengePayload = {
  kind: "hns_import",
  publish_plan: {
    version: "hns_import_publish_v1",
    replacement_semantics: "complete_resource",
    current_records: [],
    preserved_records: [],
    removed_conflicts: [],
    added_records: [
      { type: "NS", ns: "ns1.pirate." },
      { type: "NS", ns: "ns2.pirate." },
      { type: "TXT", txt: ["pirate-verification=nvs_fixture_challenge"] },
      { type: "DS", keyTag: 49194, algorithm: 13, digestType: 2, digest: "C74E61F29F60B98EB8A31C8A6286C1F45F418A26A42EB92C332176EA875CFDF2" },
      { type: "DS", keyTag: 49194, algorithm: 13, digestType: 4, digest: "4E6844DF67EBA284F693ECA7AF78BB3815B7CFCF8679EB47A5314BEC9D4AC3CA218957A644D7FDDA7EA0653EF12A88E3" },
    ],
    replacement_records: [
      { type: "NS", ns: "ns1.pirate." },
      { type: "NS", ns: "ns2.pirate." },
      { type: "TXT", txt: ["pirate-verification=nvs_fixture_challenge"] },
      { type: "DS", keyTag: 49194, algorithm: 13, digestType: 2, digest: "C74E61F29F60B98EB8A31C8A6286C1F45F418A26A42EB92C332176EA875CFDF2" },
      { type: "DS", keyTag: 49194, algorithm: 13, digestType: 4, digest: "4E6844DF67EBA284F693ECA7AF78BB3815B7CFCF8679EB47A5314BEC9D4AC3CA218957A644D7FDDA7EA0653EF12A88E3" },
    ],
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

const interactiveHnsImportCallbacks: NamespaceVerificationCallbacks = {
  ...mockNamespaceCallbacks,
  onGetSession: async () => ({
    ...hnsSession("dns_setup_required"),
    hnsImportPayload,
  }),
  onCompleteSession: async (input) => ({
    status: "challenge_pending",
    namespaceVerificationId: null,
    failureReason: null,
    hnsImportPayload: {
      ...hnsImportPayload,
      replacement_acknowledged_at: input.acknowledgedResourceReplacement
        ? "2026-08-08T12:00:00.000Z"
        : undefined,
    },
  }),
};

function hnsCallbacks(input: {
  sessionStatus: NamespaceVerificationStatus;
  completeStatus?: NamespaceVerificationStatus;
  failureReason?: string;
  neverResolveSession?: boolean;
}): NamespaceVerificationCallbacks {
  return {
    ...mockNamespaceCallbacks,
    onCompleteSession: async () => ({
      status: input.completeStatus ?? "challenge_pending",
      namespaceVerificationId: null,
      failureReason: input.completeStatus === "failed" ? input.failureReason ?? "challenge_not_published" : null,
    }),
    onGetSession: input.neverResolveSession
      ? async () => new Promise<NamespaceVerificationStartResult>(() => undefined)
      : async () => hnsSession(input.sessionStatus),
  };
}

const ownerManagedRecordsCallbacks = hnsCallbacks({
  sessionStatus: "challenge_required",
  completeStatus: "challenge_pending",
});

const checkingRecordsCallbacks = hnsCallbacks({
  sessionStatus: "verifying",
});

const setupNotDetectedCallbacks = hnsCallbacks({
  sessionStatus: "dns_setup_required",
});

const verificationFailedCallbacks = hnsCallbacks({
  sessionStatus: "failed",
});

const txtMismatchCallbacks = hnsCallbacks({
  sessionStatus: "failed",
  completeStatus: "failed",
  failureReason: "challenge_mismatch",
});

export const OwnerManagedRecords: Story = {
  name: "HNS — Ready",
  render: () => (
    <CommunityNamespaceVerificationPage
      activeSessionId="nvs_infinity_records_stub"
      callbacks={ownerManagedRecordsCallbacks}
      initialRootLabel="infinity"
    />
  ),
};

export const HnsImportPublishAction: Story = {
  name: "HNS import — Publish action",
  play: async ({ canvasElement }) => {
    let action: HTMLButtonElement | undefined;
    for (let attempt = 0; attempt < 20 && !action; attempt += 1) {
      action = Array.from(canvasElement.querySelectorAll<HTMLButtonElement>("button"))
        .find((button) => button.textContent?.includes("I published all records"));
      if (!action) await new Promise((resolve) => setTimeout(resolve, 20));
    }
    if (!action) throw new Error("Publish action did not render");
    action.click();
    let statusAction: HTMLButtonElement | undefined;
    for (let attempt = 0; attempt < 20 && !statusAction; attempt += 1) {
      statusAction = Array.from(canvasElement.querySelectorAll<HTMLButtonElement>("button"))
        .find((button) => button.textContent?.includes("Check status"));
      if (!statusAction) await new Promise((resolve) => setTimeout(resolve, 20));
    }
    if (!statusAction) throw new Error("Publish action did not advance to chain status");
  },
  render: () => (
    <CommunityNamespaceVerificationPage
      activeSessionId="nvs_fixture_import"
      callbacks={interactiveHnsImportCallbacks}
      initialRootLabel="fixture-root"
    />
  ),
};

// Full-context HNS import states: the real page, real footer action, and the
// payload a session resume would return for each observation state.
function hnsImportStateCallbacks(
  importPayload: HnsImportChallengePayload,
  status: NamespaceVerificationStatus = "dns_setup_required",
): NamespaceVerificationCallbacks {
  return {
    ...mockNamespaceCallbacks,
    onGetSession: async () => ({
      ...hnsSession(status),
      hnsImportPayload: importPayload,
    }),
  };
}

const hnsImportAcknowledgedPayload: HnsImportChallengePayload = {
  ...hnsImportPayload,
  replacement_acknowledged_at: "2026-08-08T12:00:00.000Z",
};

const refreshedHnsImportPayload: HnsImportChallengePayload = {
  ...hnsImportPayload,
  publish_plan: {
    ...hnsImportPayload.publish_plan,
    added_records: hnsImportPayload.publish_plan.added_records.map((record) => (
      record.type === "TXT"
        ? { type: "TXT", txt: ["pirate-verification=nch_refreshed_fixture"] }
        : record
    )),
    replacement_records: hnsImportPayload.publish_plan.replacement_records.map((record) => (
      record.type === "TXT"
        ? { type: "TXT", txt: ["pirate-verification=nch_refreshed_fixture"] }
        : record
    )),
  },
  observed_chain_anchor: {
    ...hnsImportPayload.observed_chain_anchor,
    height: 342_468,
    block_hash: "11refreshedblockhash",
  },
};

function renderHnsImportState(
  importPayload: HnsImportChallengePayload,
  status: NamespaceVerificationStatus = "dns_setup_required",
) {
  return () => (
    <CommunityNamespaceVerificationPage
      activeSessionId="nvs_fixture_import"
      callbacks={hnsImportStateCallbacks(importPayload, status)}
      initialRootLabel="fixture-root"
    />
  );
}

export const HnsImportPublish: Story = {
  name: "HNS import — Publish these records",
  render: renderHnsImportState(hnsImportPayload),
};

export const HnsImportNotConfirmed: Story = {
  name: "HNS import — Update not confirmed yet",
  render: renderHnsImportState(hnsImportAcknowledgedPayload),
};

export const HnsImportFinalizing: Story = {
  name: "HNS import — Transaction confirmed",
  render: renderHnsImportState({
    ...hnsImportAcknowledgedPayload,
    update_observed_height: 342_433,
    target_tree_boundary: 342_468,
    observation: {
      state: "pending_tree_commit",
      current_height: 342_440,
      target_tree_boundary: 342_468,
    },
  }),
};

export const HnsImportMismatch: Story = {
  name: "HNS import — Published records don't match",
  render: renderHnsImportState({
    ...hnsImportAcknowledgedPayload,
    update_observed_height: 342_433,
    observation: {
      state: "resource_mismatch",
      current_height: 342_468,
      missing_records: [hnsImportPayload.publish_plan.replacement_records[3], hnsImportPayload.publish_plan.replacement_records[4]],
      unexpected_records: [{ type: "NS", ns: "old-nameserver.invalid." }],
    },
  }),
};

export const HnsImportDelegationPending: Story = {
  name: "HNS import — Records confirmed",
  render: renderHnsImportState({
    ...hnsImportAcknowledgedPayload,
    update_observed_height: 342_433,
    observation: {
      state: "delegation_not_secure",
      current_height: 342_470,
    },
  }),
};

export const HnsImportExpiredRecovery: Story = {
  name: "HNS import — Expired recovery succeeds",
  play: async ({ canvasElement }) => {
    const action = await findButton(canvasElement, "Get a new record list");
    action.click();
    await findText(canvasElement, "nch_refreshed_fixture");
    if (canvasElement.textContent?.includes("Session expired")) {
      throw new Error("Expired state remained after recovery");
    }
  },
  render: () => {
    let recovered = false;
    const callbacks: NamespaceVerificationCallbacks = {
      ...mockNamespaceCallbacks,
      onCompleteSession: async (input) => {
        if (!input.restartChallenge) throw new Error("Expected restart challenge request");
        recovered = true;
        return {
          status: "challenge_required",
          namespaceVerificationId: null,
          failureReason: null,
          hnsImportPayload: refreshedHnsImportPayload,
        };
      },
      onGetSession: async () => ({
        ...hnsSession(recovered ? "challenge_required" : "expired"),
        hnsImportPayload: recovered ? refreshedHnsImportPayload : hnsImportAcknowledgedPayload,
      }),
    };
    return (
      <CommunityNamespaceVerificationPage
        activeSessionId="nvs_fixture_import"
        callbacks={callbacks}
        initialRootLabel="fixture-root"
      />
    );
  },
};

export const HnsImportExpiredRecoveryFailure: Story = {
  name: "HNS import — Expired recovery fails",
  play: async ({ canvasElement }) => {
    const action = await findButton(canvasElement, "Get a new record list");
    action.click();
    await findText(canvasElement, "Verifier contract is unavailable");
    await findText(canvasElement, "Session expired");
  },
  render: () => (
    <CommunityNamespaceVerificationPage
      activeSessionId="nvs_fixture_import"
      callbacks={{
        ...mockNamespaceCallbacks,
        onCompleteSession: async (input) => {
          if (!input.restartChallenge) throw new Error("Expected restart challenge request");
          throw new Error("Verifier contract is unavailable");
        },
        onGetSession: async () => ({
          ...hnsSession("expired"),
          hnsImportPayload: hnsImportAcknowledgedPayload,
        }),
      }}
      initialRootLabel="fixture-root"
    />
  ),
};

export const HnsImportUnsupportedBlocked: Story = {
  name: "HNS import — Unsupported records (blocked)",
  render: renderHnsImportState({
    ...hnsImportPayload,
    publish_plan: {
      ...hnsImportPayload.publish_plan,
      replacement_records: [
        ...hnsImportPayload.publish_plan.replacement_records,
        { type: "TXT", txt: ["chunked-proof-a", "chunked-proof-b"] },
      ],
    },
  }),
};

async function findButton(canvasElement: HTMLElement, label: string): Promise<HTMLButtonElement> {
  for (let attempt = 0; attempt < 40; attempt += 1) {
    const button = Array.from(canvasElement.querySelectorAll<HTMLButtonElement>("button"))
      .find((candidate) => candidate.textContent?.includes(label));
    if (button) return button;
    await new Promise((resolve) => setTimeout(resolve, 20));
  }
  throw new Error(`Button not found: ${label}`);
}

async function findText(canvasElement: HTMLElement, text: string): Promise<void> {
  for (let attempt = 0; attempt < 40; attempt += 1) {
    if (canvasElement.textContent?.includes(text)) return;
    await new Promise((resolve) => setTimeout(resolve, 20));
  }
  throw new Error(`Text not found: ${text}`);
}

export const CheckingRecords: Story = {
  name: "HNS — Checking",
  render: () => (
    <CommunityNamespaceVerificationPage
      activeSessionId="nvs_infinity_records_stub"
      callbacks={checkingRecordsCallbacks}
      initialRootLabel="infinity"
    />
  ),
};

export const RecordsNotFound: Story = {
  name: "HNS — Records not found",
  render: () => (
    <CommunityNamespaceVerificationPage
      activeSessionId="nvs_infinity_records_stub"
      callbacks={setupNotDetectedCallbacks}
      initialRootLabel="infinity"
    />
  ),
};

export const VerificationError: Story = {
  name: "HNS — TXT missing",
  render: () => (
    <CommunityNamespaceVerificationPage
      activeSessionId="nvs_infinity_records_stub"
      callbacks={verificationFailedCallbacks}
      initialRootLabel="infinity"
    />
  ),
};

export const TxtMismatch: Story = {
  name: "HNS — TXT mismatch",
  render: () => (
    <CommunityNamespaceVerificationPage
      activeSessionId="nvs_infinity_records_stub"
      callbacks={txtMismatchCallbacks}
      initialRootLabel="infinity"
    />
  ),
};

export const LegacyImportRequired: Story = {
  name: "HNS — Legacy setup required",
  render: () => (
    <CommunityNamespaceVerificationPage
      attachedNamespaceVerificationId="nvs_abc123"
      attachedRouteSlug="infinity"
      callbacks={mockNamespaceCallbacks}
      namespaceAttachments={[
        {
          namespace_verification: "nvs_abc123",
          namespace_role: "primary",
          family: "hns",
          root_label: "infinity",
          route_slug: "infinity",
          verification_status: "verified",
          hns_setup_status: "legacy_import_required",
          delegation: {
            pirate_web_routing_allowed: false,
            pirate_subdomain_issuance_allowed: false,
            delegation_security: "unsecured",
            observation_fresh: true,
            routing_withheld_reason: "delegation_not_secure",
            signature_expiry_warning: false,
            canonical_routing_eligible: false,
            routing_hard_denied: false,
          },
        },
      ]}
      onBackClick={() => undefined}
    />
  ),
};

export const RoutingPending: Story = {
  name: "HNS — Routing pending",
  render: () => (
    <CommunityNamespaceVerificationPage
      attachedNamespaceVerificationId="nvs_abc123"
      attachedRouteSlug="infinity"
      callbacks={mockNamespaceCallbacks}
      namespaceAttachments={[
        {
          namespace_verification: "nvs_abc123",
          namespace_role: "primary",
          family: "hns",
          root_label: "infinity",
          route_slug: "infinity",
          verification_status: "verified",
          hns_setup_status: "setup_complete",
          delegation: {
            pirate_web_routing_allowed: false,
            pirate_subdomain_issuance_allowed: true,
            delegation_security: "secure",
            observation_fresh: true,
            routing_withheld_reason: "canonical_activation_pending",
            signature_expiry_warning: false,
            canonical_routing_eligible: false,
            routing_hard_denied: false,
          },
        },
      ]}
      onBackClick={() => undefined}
    />
  ),
};

export const DelegationAttention: Story = {
  name: "HNS — Delegation needs attention",
  render: () => (
    <CommunityNamespaceVerificationPage
      attachedNamespaceVerificationId="nvs_abc123"
      attachedRouteSlug="infinity"
      callbacks={mockNamespaceCallbacks}
      namespaceAttachments={[
        {
          namespace_verification: "nvs_abc123",
          namespace_role: "primary",
          family: "hns",
          root_label: "infinity",
          route_slug: "infinity",
          verification_status: "verified",
          hns_setup_status: "setup_complete",
          delegation: {
            pirate_web_routing_allowed: false,
            pirate_subdomain_issuance_allowed: false,
            delegation_security: "drifted",
            observation_fresh: true,
            routing_withheld_reason: "delegation_drifted",
            signature_expiry_warning: false,
            canonical_routing_eligible: false,
            routing_hard_denied: false,
          },
        },
      ]}
      onBackClick={() => undefined}
    />
  ),
};

export const Live: Story = {
  name: "HNS — Live",
  render: () => (
    <CommunityNamespaceVerificationPage
      attachedNamespaceVerificationId="nvs_abc123"
      attachedRouteSlug="infinity"
      callbacks={mockNamespaceCallbacks}
      namespaceAttachments={[
        {
          namespace_verification: "nvs_abc123",
          namespace_role: "primary",
          family: "hns",
          root_label: "infinity",
          route_slug: "infinity",
          verification_status: "verified",
          hns_setup_status: "setup_complete",
          delegation: {
            pirate_web_routing_allowed: true,
            pirate_subdomain_issuance_allowed: true,
            delegation_security: "secure",
            observation_fresh: true,
            routing_withheld_reason: null,
            signature_expiry_warning: false,
            canonical_routing_eligible: true,
            routing_hard_denied: false,
          },
        },
        {
          namespace_verification: "nvs_def456",
          namespace_role: "mirror",
          family: "spaces",
          root_label: "infinity-friends",
          route_slug: "infinity-friends",
          verification_status: "verified",
        },
      ]}
      onBackClick={() => undefined}
    />
  ),
};
