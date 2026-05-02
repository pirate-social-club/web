import type { Meta, StoryObj } from "@storybook/react-vite";

import { FormNote } from "@/components/primitives/form-layout";
import {
  NamespaceVerificationHnsPanel,
} from "../namespace-verification-hns-ui";
import {
  NamespaceVerificationSpacesPanel,
} from "../namespace-verification-shared";

const spacesChallenge = {
  domain: "builders",
  expires_at: "2026-04-26T12:30:00.000Z",
  freedom_url: "https://freedom.pirate.dev/c/builders",
  issued_at: "2026-04-26T12:00:00.000Z",
  kind: "fabric_txt_publish",
  nonce: "nonce_123456789",
  root_label: "builders",
  root_pubkey: "0x1234567890abcdef",
  txt_key: "pirate-verify",
  txt_value: "verify_123456789",
  web_url: "https://pirate.dev/c/builders",
} as const;

const meta = {
  title: "Compositions/Verification/NamespaceVerification",
  parameters: {
    layout: "centered",
  },
} satisfies Meta;

export default meta;

type Story = StoryObj<typeof meta>;

export const HandshakeRecords: Story = {
  name: "HNS — Ready to verify",
  render: () => (
    <div className="w-[min(100vw-2rem,34rem)] space-y-4">
      <NamespaceVerificationHnsPanel
        challengePending={false}
        challengeTxtValue="pirate-verification=nvs_abc123"
        mode="owner_managed_txt"
        onAbandon={() => undefined}
        rootLabel="builders"
        setupNameservers={["ns1.pirate.", "ns2.pirate."]}
      />
    </div>
  ),
};

export const HandshakeRecordsPending: Story = {
  name: "HNS — Propagation pending",
  render: () => (
    <div className="w-[min(100vw-2rem,34rem)] space-y-4">
      <NamespaceVerificationHnsPanel
        challengePending
        challengeTxtValue="pirate-verification=nvs_abc123"
        mode="owner_managed_txt"
        onAbandon={() => undefined}
        rootLabel="builders"
        setupNameservers={["ns1.pirate.", "ns2.pirate."]}
      />
    </div>
  ),
};

export const HandshakeDnsSetupRequired: Story = {
  name: "HNS — DNS setup required",
  render: () => (
    <div className="w-[min(100vw-2rem,34rem)] space-y-4">
      <NamespaceVerificationHnsPanel
        challengePending={false}
        challengeTxtValue={null}
        mode="dns_setup_required"
        onAbandon={() => undefined}
        rootLabel="builders"
        setupNameservers={["ns1.pirate.", "ns2.pirate."]}
      />
    </div>
  ),
};

export const HandshakeRecordsError: Story = {
  name: "HNS — Verification failed",
  render: () => (
    <div className="w-[min(100vw-2rem,34rem)] space-y-4">
      <NamespaceVerificationHnsPanel
        challengePending={false}
        challengeTxtValue="pirate-verification=nvs_abc123"
        mode="owner_managed_txt"
        onAbandon={() => undefined}
        rootLabel="builders"
        setupNameservers={["ns1.pirate.", "ns2.pirate."]}
      />
      <FormNote tone="warning">Verification failed. The TXT record was not found or does not match the expected value.</FormNote>
    </div>
  ),
};

export const SpacesChallenge: Story = {
  name: "Spaces — Challenge instructions",
  render: () => (
    <div className="w-[min(100vw-2rem,40rem)]">
      <NamespaceVerificationSpacesPanel
        busy={false}
        challengePayload={spacesChallenge}
        onAbandon={() => undefined}
      />
    </div>
  ),
};
