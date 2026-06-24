import { describe, expect, test } from "bun:test";
import { fireEvent, render } from "@testing-library/react";
import * as React from "react";

import { installDomGlobals } from "@/test/setup-dom";
import type { PirateConnectedEvmWallet } from "@/lib/auth/privy-wallet";
import { IdentityWalletSection, type IdentityWalletSectionProps } from "./identity-wallet-section";

const { window } = installDomGlobals();
Object.defineProperty(window, "getComputedStyle", {
  configurable: true,
  value: () => ({ getPropertyValue: () => "" }),
});

const WALLET_A = "0x1111111111111111111111111111111111111111";
const WALLET_B = "0x2222222222222222222222222222222222222222";
const WALLET_C = "0x3333333333333333333333333333333333333333";

type WalletAttachment = IdentityWalletSectionProps["walletAttachments"][number];

function attachment(id: string, address: string, isPrimary: boolean): WalletAttachment {
  return { wallet_attachment: id, wallet_address: address, is_primary: isPrimary, chain_namespace: "eip155:1" } as WalletAttachment;
}

function connected(address: string): PirateConnectedEvmWallet {
  return { address, getEthereumProvider: async () => null, switchChain: async () => undefined } as unknown as PirateConnectedEvmWallet;
}

function renderSection(props: Partial<IdentityWalletSectionProps> = {}) {
  const onSelect = props.onSelect ?? (() => {});
  const container = document.createElement("div");
  document.body.appendChild(container);
  return render(
    <IdentityWalletSection
      connectedWallets={props.connectedWallets ?? []}
      onSelect={onSelect}
      pending={props.pending ?? false}
      primaryAttachmentId={props.primaryAttachmentId ?? null}
      walletAttachments={props.walletAttachments ?? []}
    />,
    { container },
  );
}

describe("IdentityWalletSection", () => {
  test("marks the primary and makes other verified wallets selectable", () => {
    const selected: string[] = [];
    const view = renderSection({
      walletAttachments: [attachment("wal_a", WALLET_A, true), attachment("wal_b", WALLET_B, false)],
      primaryAttachmentId: "wal_a",
      onSelect: (id) => selected.push(id),
    });

    // The primary is labelled and not actionable; exactly one other wallet is selectable.
    expect(view.getByText("Identity wallet", { selector: "span" })).toBeTruthy();
    const selectButtons = view.getAllByRole("button", { name: /use as identity/i });
    expect(selectButtons).toHaveLength(1);

    fireEvent.click(selectButtons[0]!);
    expect(selected).toEqual(["wal_b"]);
  });

  test("lists connected-but-unverified wallets separately and never as selectable identity", () => {
    const view = renderSection({
      walletAttachments: [attachment("wal_a", WALLET_A, true)],
      // WALLET_A is also connected (already verified -> must be deduped out of the connected list);
      // WALLET_C is connected but not added -> shown, non-selectable.
      connectedWallets: [connected(WALLET_A), connected(WALLET_C)],
      primaryAttachmentId: "wal_a",
    });

    expect(view.getByText("Connected, not added")).toBeTruthy();
    expect(view.getByText("0x3333…3333")).toBeTruthy();
    // The already-verified connected address is not duplicated into the connected section.
    expect(view.queryAllByText("0x1111…1111")).toHaveLength(1);
    // No verified non-primary wallet exists, so nothing is selectable.
    expect(view.queryAllByRole("button", { name: /use as identity/i })).toHaveLength(0);
  });

  test("shows an explicit empty state when there is no identity wallet", () => {
    const view = renderSection({
      walletAttachments: [],
      connectedWallets: [connected(WALLET_C)],
      primaryAttachmentId: null,
    });

    expect(view.getByText("No identity wallet selected.")).toBeTruthy();
    expect(view.queryAllByRole("button", { name: /use as identity/i })).toHaveLength(0);
  });
});
