import type { Meta, StoryObj } from "@storybook/react-vite";

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

export const HandshakeDnsSetup: Story = {
  render: () => (
    <div className="w-[min(100vw-2rem,34rem)]">
      <NamespaceVerificationHnsPanel
        challengeHost={null}
        challengePending={false}
        challengeTxtValue={null}
        mode="dns_setup_required"
        onAbandon={() => undefined}
        rootLabel="builders"
        setupNameservers={["ns1.pirate.dev", "ns2.pirate.dev"]}
      />
    </div>
  ),
};

export const HandshakeTxtChallenge: Story = {
  render: () => (
    <div className="w-[min(100vw-2rem,34rem)]">
      <NamespaceVerificationHnsPanel
        challengeHost="_pirate.builders"
        challengePending={false}
        challengeTxtValue="pirate-verify=123456789"
        mode="owner_managed_txt"
        onAbandon={() => undefined}
        rootLabel="builders"
        setupNameservers={null}
      />
    </div>
  ),
};

export const SpacesChallenge: Story = {
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
