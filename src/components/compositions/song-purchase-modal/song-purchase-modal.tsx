"use client";

import { MusicNote } from "@phosphor-icons/react";

import {
  Modal,
  ModalContent,
  ModalDescription,
  ModalHeader,
  ModalTitle,
} from "@/components/compositions/modal/modal";
import { Button } from "@/components/primitives/button";
import { FormNote } from "@/components/primitives/form-layout";
import { Type, typeVariants } from "@/components/primitives/type";
import { useUiLocale } from "@/lib/ui-locale";
import { cn } from "@/lib/utils";

export interface SongPurchaseModalProps {
  error?: string | null;
  forceMobile?: boolean;
  fundingAssetLabel: string;
  onConfirm: () => void;
  onOpenChange: (open: boolean) => void;
  onSelfVerificationClick?: () => void;
  open: boolean;
  priceLabel: string;
  processing?: boolean;
  selfVerificationHref?: string | null;
  selfVerificationSavingsPercent?: number | null;
  songTitle: string;
}

function SummaryRow({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-center justify-between gap-4 py-3">
      <Type as="div" className="min-w-0 text-muted-foreground" variant="body">
        {label}
      </Type>
      <Type as="div" className="min-w-0 truncate text-end" variant="body-strong">
        {value}
      </Type>
    </div>
  );
}

function formatSavingsPercent(value: number): string {
  return Number.isInteger(value) ? value.toString() : value.toFixed(1);
}

export function SongPurchaseModal({
  error,
  forceMobile,
  fundingAssetLabel,
  onConfirm,
  onOpenChange,
  onSelfVerificationClick,
  open,
  priceLabel,
  processing = false,
  selfVerificationHref,
  selfVerificationSavingsPercent,
  songTitle,
}: SongPurchaseModalProps) {
  const { dir } = useUiLocale();
  const hasSelfVerificationNudge = typeof selfVerificationSavingsPercent === "number" && selfVerificationSavingsPercent > 0;
  const selfVerificationLabel = hasSelfVerificationNudge
    ? `Save up to ${formatSavingsPercent(selfVerificationSavingsPercent)}% with Self.xyz`
    : null;

  return (
    <Modal forceMobile={forceMobile} onOpenChange={onOpenChange} open={open}>
      <ModalContent
        className="flex max-h-[90vh] flex-col overflow-y-auto px-5 pb-[calc(1.25rem+env(safe-area-inset-bottom))] pt-5 sm:max-w-2xl sm:px-8 sm:pb-8 sm:pt-8"
        dir={dir}
        mobileSide="bottom"
      >
        <ModalHeader className="space-y-5 pr-10 text-start">
          <div className="flex items-center gap-4">
            <span
              aria-hidden="true"
              className="grid size-16 shrink-0 place-items-center rounded-full border border-border-soft bg-muted/45 text-foreground"
            >
              <MusicNote className="size-8" weight="duotone" />
            </span>
            <ModalTitle className={cn(typeVariants({ variant: "h1" }), "min-w-0 leading-tight")} dir="auto">
              Unlock song
            </ModalTitle>
          </div>
          <ModalDescription className={cn(typeVariants({ variant: "body" }), "w-full leading-8 text-foreground")} dir="auto">
            Buy full access to {songTitle}.
          </ModalDescription>
        </ModalHeader>

        <div className="mt-8 space-y-6">
          <div className="divide-y divide-border-soft border-y border-border-soft">
            <SummaryRow label="Price" value={priceLabel} />
            <SummaryRow label="Pay with" value={fundingAssetLabel} />
          </div>

          {selfVerificationLabel ? (
            <div className="flex flex-col gap-3 rounded-lg border border-border-soft bg-muted/30 p-4 sm:flex-row sm:items-center sm:justify-between">
              <Type as="p" className="min-w-0" variant="body-strong">
                {selfVerificationLabel}
              </Type>
              {selfVerificationHref ? (
                <Button asChild className="w-full sm:w-auto" size="sm" variant="outline">
                  <a href={selfVerificationHref}>Verify</a>
                </Button>
              ) : onSelfVerificationClick ? (
                <Button className="w-full sm:w-auto" onClick={onSelfVerificationClick} size="sm" variant="outline">
                  Verify
                </Button>
              ) : null}
            </div>
          ) : null}

          {error ? <FormNote tone="warning">{error}</FormNote> : null}

          <Button
            className="h-14 w-full"
            loading={processing}
            onClick={onConfirm}
          >
            Unlock for {priceLabel}
          </Button>
        </div>
      </ModalContent>
    </Modal>
  );
}
