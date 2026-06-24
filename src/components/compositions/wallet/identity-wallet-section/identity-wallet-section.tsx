"use client";

import * as React from "react";
import type { SessionExchangeResponse } from "@pirate/api-contracts";

import { Button } from "@/components/primitives/button";
import { Card } from "@/components/primitives/card";
import type { PirateConnectedEvmWallet } from "@/lib/auth/privy-wallet";

type WalletAttachment = SessionExchangeResponse["wallet_attachments"][number];

function shortAddress(address: string): string {
  return address.length > 10 ? `${address.slice(0, 6)}…${address.slice(-4)}` : address;
}

export interface IdentityWalletSectionProps {
  walletAttachments: WalletAttachment[];
  connectedWallets: PirateConnectedEvmWallet[];
  primaryAttachmentId: string | null;
  pending: boolean;
  onSelect: (walletAttachmentId: string) => void;
}

/**
 * Lets the user pick which verified wallet is their identity (primary) wallet. Only active,
 * verified attachments are selectable. Connected-but-unverified wallets are listed separately
 * and are never selectable — they must be added to the account first.
 */
export function IdentityWalletSection({
  walletAttachments,
  connectedWallets,
  primaryAttachmentId,
  pending,
  onSelect,
}: IdentityWalletSectionProps) {
  const verifiedAddresses = new Set(
    walletAttachments.map((attachment) => attachment.wallet_address.toLowerCase()),
  );
  const unverifiedConnected = connectedWallets.filter(
    (wallet) => !verifiedAddresses.has(wallet.address.toLowerCase()),
  );

  return (
    <Card className="space-y-4 p-5">
      <div className="space-y-1">
        <h2 className="text-sm font-semibold text-foreground">Identity wallet</h2>
        <p className="text-xs text-muted-foreground">
          Used for your public wallet address, ENS identity, messaging, and creator ownership.
        </p>
      </div>

      {walletAttachments.length === 0 ? (
        <p className="text-sm text-muted-foreground">No identity wallet selected.</p>
      ) : (
        <ul className="space-y-2">
          {walletAttachments.map((attachment) => {
            const isPrimary = attachment.wallet_attachment === primaryAttachmentId;
            return (
              <li
                key={attachment.wallet_attachment}
                className="flex items-center justify-between gap-3 rounded-lg border border-border px-3 py-2"
              >
                <span className="font-mono text-sm text-foreground">
                  {shortAddress(attachment.wallet_address)}
                </span>
                {isPrimary ? (
                  <span className="text-xs font-medium text-primary">Identity wallet</span>
                ) : (
                  <Button
                    disabled={pending}
                    onClick={() => onSelect(attachment.wallet_attachment)}
                    size="sm"
                    variant="outline"
                  >
                    Use as identity
                  </Button>
                )}
              </li>
            );
          })}
        </ul>
      )}

      {unverifiedConnected.length > 0 ? (
        <div className="space-y-2">
          <p className="text-xs font-medium text-muted-foreground">Connected, not added</p>
          <ul className="space-y-2">
            {unverifiedConnected.map((wallet) => (
              <li
                key={wallet.address}
                className="flex items-center justify-between gap-3 rounded-lg border border-dashed border-border px-3 py-2 opacity-70"
              >
                <span className="font-mono text-sm text-muted-foreground">
                  {shortAddress(wallet.address)}
                </span>
                <span className="text-xs text-muted-foreground">Connected</span>
              </li>
            ))}
          </ul>
          <p className="text-xs text-muted-foreground">
            Connected wallets must be added to your account before they can be your identity wallet.
          </p>
        </div>
      ) : null}
    </Card>
  );
}
