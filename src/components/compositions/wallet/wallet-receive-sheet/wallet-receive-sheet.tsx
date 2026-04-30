"use client";

import * as React from "react";
import { QrCode } from "@phosphor-icons/react";
import { QRCodeSVG } from "qrcode.react";

import {
  Modal,
  ModalContent,
  ModalDescription,
  ModalHeader,
  ModalTitle,
} from "@/components/compositions/system/modal/modal";
import { ResponsiveOptionSelect } from "@/components/compositions/system/responsive-option-select/responsive-option-select";
import { Button } from "@/components/primitives/button";
import { CopyField } from "@/components/primitives/copy-field";
import { Type } from "@/components/primitives/type";
import { cn } from "@/lib/utils";
import { ChainIcon } from "../wallet-hub/wallet-visuals";
import type { WalletHubChainId, WalletHubChainSection } from "../wallet-hub/wallet-hub.types";
import type { WalletReceiveSheetProps } from "./wallet-receive-sheet.types";

function parseFiatValue(value: string | null | undefined): number {
  if (!value) return 0;
  const parsed = Number(value.replace(/[^0-9.-]/gu, ""));
  return Number.isFinite(parsed) ? parsed : 0;
}

function chainFiatTotal(section: WalletHubChainSection): number {
  return section.tokens.reduce((total, token) => total + parseFiatValue(token.fiatValue), 0);
}

function formatFiatTotal(section: WalletHubChainSection): string {
  return chainFiatTotal(section).toLocaleString("en-US", {
    currency: "USD",
    maximumFractionDigits: 2,
    minimumFractionDigits: 2,
    style: "currency",
  });
}

function getDefaultChainId(
  chainSections: WalletHubChainSection[],
  defaultChainId?: WalletHubChainId,
): WalletHubChainId | undefined {
  if (defaultChainId && chainSections.some((section) => section.chainId === defaultChainId)) {
    return defaultChainId;
  }

  return chainSections
    .filter((section) => section.walletAddress)
    .sort((left, right) => chainFiatTotal(right) - chainFiatTotal(left))[0]?.chainId;
}

function truncateAddress(address: string): string {
  return `${address.slice(0, 10)}...${address.slice(-6)}`;
}

function WalletQrCode({ value }: { value: string }) {
  return (
    <div className="mx-auto grid size-52 place-items-center rounded-xl border border-border-soft bg-white p-4">
      <QRCodeSVG aria-label={`QR code for ${value}`} bgColor="#ffffff" fgColor="#000000" level="M" role="img" size={176} value={value} />
    </div>
  );
}

export function WalletReceiveSheet({
  chainSections,
  defaultChainId,
  forceMobile,
  onOpenChange,
  open,
  walletAddress,
}: WalletReceiveSheetProps) {
  const initialChainId = getDefaultChainId(chainSections, defaultChainId);
  const [selectedChainId, setSelectedChainId] = React.useState<WalletHubChainId | undefined>(initialChainId);

  React.useEffect(() => {
    if (!open) return;
    setSelectedChainId(getDefaultChainId(chainSections, defaultChainId));
  }, [chainSections, defaultChainId, open]);

  const selectedChain = chainSections.find((section) => section.chainId === selectedChainId) ?? chainSections[0];
  const selectedAddress = selectedChain?.walletAddress ?? walletAddress ?? null;
  const options = chainSections.map((section) => ({
    description: formatFiatTotal(section),
    icon: <ChainIcon chainId={section.chainId} className="size-8" framed={true} />,
    label: section.title,
    value: section.chainId,
  }));

  return (
    <Modal forceMobile={forceMobile} onOpenChange={onOpenChange} open={open}>
      <ModalContent
        className={cn(
          "flex max-h-[88dvh] w-full flex-col overflow-y-auto rounded-t-[var(--radius-3xl)] border-x-0 border-b-0 px-5 pb-[calc(1.25rem+env(safe-area-inset-bottom))] pt-4",
          !forceMobile && "md:w-[min(100%-2rem,34rem)] md:max-w-[34rem] md:px-7 md:pb-7 md:pt-7",
        )}
        mobileSide="bottom"
      >
        <div className={cn("mx-auto mb-4 h-1.5 w-12 shrink-0 rounded-full bg-muted-foreground/60", !forceMobile && "md:hidden")} aria-hidden="true" />
        <ModalHeader className="pe-10 text-start">
          <ModalTitle>Receive</ModalTitle>
          <ModalDescription className="text-muted-foreground">
            Choose the network before sharing your wallet address.
          </ModalDescription>
        </ModalHeader>

        {selectedChain && selectedAddress ? (
          <div className="mt-6 space-y-5">
            <div className="flex items-center justify-between gap-4">
              <Type as="div" className="text-muted-foreground" variant="body">
                Network
              </Type>
              <ResponsiveOptionSelect
                ariaLabel="Receive network"
                drawerTitle="Receive network"
                onValueChange={setSelectedChainId}
                options={options}
                selectAlign="end"
                triggerContent={
                  <span className="flex min-w-0 items-center gap-2">
                    <ChainIcon chainId={selectedChain.chainId} className="size-5" framed={false} />
                    <span className="truncate">{selectedChain.title}</span>
                  </span>
                }
                value={selectedChain.chainId}
              />
            </div>

            <div className="rounded-lg border border-border-soft bg-muted/20 p-4">
              <div className="mb-4 flex items-center gap-3">
                <ChainIcon chainId={selectedChain.chainId} />
                <div className="min-w-0">
                  <Type as="div" variant="body-strong">
                    {selectedChain.title}
                  </Type>
                  <Type as="div" className="truncate text-muted-foreground" variant="caption">
                    {truncateAddress(selectedAddress)}
                  </Type>
                </div>
              </div>
              <CopyField value={selectedAddress} />
            </div>

            <WalletQrCode value={`${selectedChain.chainId}:${selectedAddress}`} />

            <div className="flex gap-3 rounded-lg border border-border-soft bg-muted/20 p-4">
              <QrCode aria-hidden="true" className="mt-0.5 size-5 shrink-0 text-muted-foreground" />
              <Type as="p" className="text-muted-foreground" variant="body">
                Only send assets on {selectedChain.title} to this address.
              </Type>
            </div>
          </div>
        ) : (
          <div className="mt-6 rounded-lg border border-border-soft bg-muted/20 p-5 text-center">
            <Type as="p" variant="body-strong">
              No wallet connected
            </Type>
            <Type as="p" className="mt-1 text-muted-foreground" variant="body">
              Connect a wallet before receiving assets.
            </Type>
            <Button className="mt-5" onClick={() => onOpenChange(false)}>
              Done
            </Button>
          </div>
        )}
      </ModalContent>
    </Modal>
  );
}
