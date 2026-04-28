"use client";

import * as React from "react";
import { CheckCircle, Coins, WarningCircle } from "@phosphor-icons/react";
import { formatUnits, getAddress, isAddress } from "viem";

import {
  Modal,
  ModalContent,
  ModalDescription,
  ModalFooter,
  ModalHeader,
  ModalTitle,
} from "@/components/compositions/system/modal/modal";
import { Button } from "@/components/primitives/button";
import { Switch } from "@/components/primitives/switch";
import { Type } from "@/components/primitives/type";
import { usePiratePrivyRuntime, usePiratePrivyWallets } from "@/components/auth/privy-provider";
import { useStoryRoyalties, type RoyaltyClaimState } from "@/lib/story/use-story-royalties";
import { cn } from "@/lib/utils";

export interface RoyaltyClaimModalProps {
  onClaimed?: () => void;
  onOpenChange: (open: boolean) => void;
  open: boolean;
}

function formatWipAmount(wei: string | null | undefined): string {
  if (!wei) return "0";
  try {
    const formatted = formatUnits(BigInt(wei), 18);
    const [whole, fraction = ""] = formatted.split(".");
    const trimmedFraction = fraction.slice(0, 6).replace(/0+$/u, "");
    if (whole === "0" && fraction.replace(/0/gu, "").length > 0 && !trimmedFraction) {
      return "<0.000001";
    }
    return trimmedFraction ? `${whole}.${trimmedFraction}` : whole;
  } catch {
    return "0";
  }
}

function formatAddress(address: string | null | undefined): string {
  if (!address || !isAddress(address)) return "No wallet connected";
  const normalized = getAddress(address);
  return `${normalized.slice(0, 6)}...${normalized.slice(-4)}`;
}

function claimStatusLabel(status: RoyaltyClaimState["status"]): string {
  switch (status) {
    case "preparing":
      return "Preparing claim";
    case "signing":
      return "Confirm in wallet";
    case "submitting":
      return "Submitting claim";
    case "success":
      return "Royalties claimed";
    case "error":
      return "Claim failed";
    default:
      return "Claim";
  }
}

export interface RoyaltyClaimModalViewProps {
  autoUnwrapIpTokens: boolean;
  claimableCount: number;
  claimState: RoyaltyClaimState;
  forceMobile?: boolean;
  loading?: boolean;
  onAutoUnwrapIpTokensChange: (checked: boolean) => void;
  onClaim: () => void;
  onOpenChange: (open: boolean) => void;
  open: boolean;
  totalClaimableWipWei: string;
  walletAddress?: string | null;
}

export function RoyaltyClaimModalView({
  autoUnwrapIpTokens,
  claimableCount,
  claimState,
  forceMobile,
  loading = false,
  onAutoUnwrapIpTokensChange,
  onClaim,
  onOpenChange,
  open,
  totalClaimableWipWei,
  walletAddress = null,
}: RoyaltyClaimModalViewProps) {
  const hasClaimable = claimableCount > 0 && totalClaimableWipWei !== "0";
  const busy = claimState.status === "preparing" || claimState.status === "signing" || claimState.status === "submitting";

  return (
    <Modal forceMobile={forceMobile} onOpenChange={onOpenChange} open={open}>
      <ModalContent className="border-border bg-background p-6 sm:w-[min(100%-2rem,32rem)] sm:max-w-[32rem]">
        <ModalHeader className="pe-10 text-start">
          <span className="mb-3 grid size-11 place-items-center text-warning">
            <Coins aria-hidden className="size-8" weight="fill" />
          </span>
          <ModalTitle>Claim royalties</ModalTitle>
          <ModalDescription className="text-muted-foreground">
            Claim royalties available from your Story IP assets.
          </ModalDescription>
        </ModalHeader>

        <div className="mt-5 space-y-3 rounded-lg border border-border-soft bg-muted/20 p-4">
          <div className="flex items-center justify-between gap-4">
            <Type as="span" className="text-muted-foreground" variant="body">Available</Type>
            <Type as="span" className="text-right" variant="body-strong">
              {loading ? "..." : `${formatWipAmount(totalClaimableWipWei)} WIP`}
            </Type>
          </div>
          <div className="flex items-center justify-between gap-4">
            <Type as="span" className="text-muted-foreground" variant="body">IP assets</Type>
            <Type as="span" className="text-right" variant="body-strong">
              {loading ? "..." : claimableCount.toLocaleString("en-US")}
            </Type>
          </div>
          <div className="flex items-center justify-between gap-4">
            <Type as="span" className="text-muted-foreground" variant="body">Destination</Type>
            <Type as="span" className="text-right" variant="body-strong">
              {formatAddress(walletAddress)}
            </Type>
          </div>
        </div>

        <div className="mt-4 flex items-center justify-between gap-4 rounded-lg border border-border-soft px-4 py-3">
          <div className="min-w-0">
            <Type as="p" variant="body-strong">Receive as IP</Type>
            <Type as="p" className="text-muted-foreground" variant="body">Unwrap claimed WIP after claiming.</Type>
          </div>
          <Switch checked={autoUnwrapIpTokens} disabled={busy} onCheckedChange={onAutoUnwrapIpTokensChange} />
        </div>

        {claimState.status === "error" ? (
          <div className="mt-4 flex gap-3 rounded-lg border border-border-soft bg-muted/20 p-3 text-warning">
            <WarningCircle aria-hidden className="mt-0.5 size-5 shrink-0" weight="fill" />
            <Type as="p" variant="body">{claimState.message}</Type>
          </div>
        ) : null}

        {claimState.status === "success" ? (
          <div className="mt-4 flex gap-3 rounded-lg border border-border-soft bg-muted/20 p-3 text-success">
            <CheckCircle aria-hidden className="mt-0.5 size-5 shrink-0" weight="fill" />
            <Type as="p" variant="body">
              Royalties claimed{claimState.txHash ? `: ${claimState.txHash.slice(0, 10)}...` : "."}
            </Type>
          </div>
        ) : null}

        <ModalFooter className={cn("mt-6 gap-3", "sm:justify-end")}>
          <Button disabled={busy} onClick={() => onOpenChange(false)} variant="secondary">
            Cancel
          </Button>
          <Button
            disabled={loading || (!hasClaimable && !!walletAddress) || claimState.status === "success"}
            loading={busy}
            onClick={onClaim}
          >
            {walletAddress ? claimStatusLabel(claimState.status) : "Connect wallet"}
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
}

export function RoyaltyClaimModal({ onClaimed, onOpenChange, open }: RoyaltyClaimModalProps) {
  const { connect } = usePiratePrivyRuntime();
  const { connectedWallets } = usePiratePrivyWallets();
  const {
    claimRoyalties,
    claimState,
    claimable,
    loading,
    refresh,
    resetClaimState,
  } = useStoryRoyalties();
  const [autoUnwrapIpTokens, setAutoUnwrapIpTokens] = React.useState(true);

  const walletAddress = connectedWallets[0]?.address ?? null;
  const totalClaimable = claimable?.total_claimable_wip_wei ?? "0";
  const claimableCount = claimable?.items.length ?? 0;

  React.useEffect(() => {
    if (!open) return;
    resetClaimState();
    void refresh();
  }, [open, refresh, resetClaimState]);

  async function handleClaim() {
    if (!walletAddress) {
      connect?.();
      return;
    }

    await claimRoyalties({ autoUnwrapIpTokens });
    onClaimed?.();
  }

  return (
    <RoyaltyClaimModalView
      autoUnwrapIpTokens={autoUnwrapIpTokens}
      claimableCount={claimableCount}
      claimState={claimState}
      loading={loading}
      onAutoUnwrapIpTokensChange={setAutoUnwrapIpTokens}
      onClaim={handleClaim}
      onOpenChange={onOpenChange}
      open={open}
      totalClaimableWipWei={totalClaimable}
      walletAddress={walletAddress}
    />
  );
}
