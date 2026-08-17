/** @jsxImportSource @solidjs/web */

import { createSignal } from "solid-js";
import type { Meta, StoryObj } from "storybook-solidjs-vite";
import { expect, fn, userEvent, within } from "storybook/test";

import { Button } from "../../../design-system";
import { DEFAULT_CLAIMABLE_WIP_WEI, DEFAULT_WALLET_ADDRESS } from "./royalty-claim-modal-model";
import { RoyaltyClaimModal } from "./royalty-claim-modal";
import type { RoyaltyClaimModalProps } from "./royalty-claim-modal.types";

const baseArgs: RoyaltyClaimModalProps = {
  autoUnwrapIpTokens: true,
  claimableCount: 3,
  claimState: { status: "ready" },
  onAutoUnwrapIpTokensChange: () => undefined,
  onClaim: () => undefined,
  onOpenChange: () => undefined,
  open: true,
  totalClaimableWipWei: DEFAULT_CLAIMABLE_WIP_WEI,
  walletAddress: DEFAULT_WALLET_ADDRESS,
};

const meta = {
  title: "Compositions/Wallet/Royalties/ClaimModal",
  component: RoyaltyClaimModal,
  args: baseArgs,
  parameters: { a11y: { test: "error" } },
  decorators: [(Story) => <div class="min-h-[720px] bg-background p-6 text-foreground"><Story /></div>],
} satisfies Meta<typeof RoyaltyClaimModal>;

export default meta;
type Story = StoryObj<typeof meta>;

function ModalStory(props: Partial<RoyaltyClaimModalProps>) {
  const [open, setOpen] = createSignal(true);
  const [autoUnwrapIpTokens, setAutoUnwrapIpTokens] = createSignal(props.autoUnwrapIpTokens ?? true);
  const close = (nextOpen: boolean) => setOpen(nextOpen);
  return (
    <>
      {!open() ? <Button onClick={() => setOpen(true)}>Reopen claim</Button> : null}
      <RoyaltyClaimModal
        {...baseArgs}
        {...props}
        autoUnwrapIpTokens={autoUnwrapIpTokens()}
        onAutoUnwrapIpTokensChange={setAutoUnwrapIpTokens}
        onOpenChange={close}
        open={open()}
      />
    </>
  );
}

export const Ready: Story = {
  name: "Ready to claim",
  args: { onClaim: fn() },
  render: (args) => <ModalStory {...args} />,
  play: async ({ args, canvasElement }) => {
    const claim = within(canvasElement).getByRole("button", { name: "Claim" });
    await expect(claim).toBeEnabled();
    await userEvent.click(claim);
    await expect(args.onClaim).toHaveBeenCalled();
  },
};

export const NoWallet: Story = {
  name: "No wallet connected",
  render: () => <ModalStory claimState={{ status: "no-wallet" }} walletAddress={null} />,
};

export const Signing: Story = {
  name: "Confirm in wallet",
  render: () => <ModalStory claimState={{ status: "signing" }} />,
};

export const Success: Story = {
  render: () => <ModalStory claimState={{ status: "success", txHash: "0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef" }} />,
};

export const Error: Story = {
  render: () => <ModalStory claimState={{ status: "error", message: "User rejected the transaction request." }} />,
};

export const Mobile: Story = {
  parameters: { viewport: { defaultViewport: "mobile1" } },
  render: () => <ModalStory forceMobile />,
};
