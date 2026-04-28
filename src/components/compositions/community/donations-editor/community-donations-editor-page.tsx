"use client";

import * as React from "react";
import { ArrowSquareOut, Trash } from "@phosphor-icons/react";

import { Button } from "@/components/primitives/button";
import { Label } from "@/components/primitives/label";
import { Input } from "@/components/primitives/input";
import { cn } from "@/lib/utils";
import { defaultRouteCopy } from "../../system/route-copy-defaults";
import { Type } from "@/components/primitives/type";

export type DonationPolicyMode = "none" | "optional_creator_sidecar";

export interface DonationPartnerPreview {
  donationPartnerId: string;
  displayName: string;
  provider: string;
  providerPartnerRef?: string | null;
  imageUrl?: string | null;
}

export interface CommunityDonationsEditorPageProps {
  className?: string;
  endaomentUrl: string;
  partnerPreview: DonationPartnerPreview | null;
  resolving: boolean;
  resolveError: string | null;
  onEndaomentUrlChange?: (value: string) => void;
  onResolve?: () => void;
  onClearPartner?: () => void;
  onSave?: () => void;
  saveDisabled?: boolean;
  saveLoading?: boolean;
}

function PartnerPreviewCard({
  partner,
  onClear,
}: {
  partner: DonationPartnerPreview;
  onClear?: () => void;
}) {
  return (
    <div className="flex items-center gap-4 rounded-[var(--radius-2_5xl)] border border-border-soft bg-card p-4 md:p-5">
      {partner.imageUrl ? (
        <img
          alt={partner.displayName}
          className="size-12 rounded-full object-cover"
          src={partner.imageUrl}
        />
      ) : (
        <div className="flex size-12 items-center justify-center rounded-full bg-muted text-base font-semibold">
          {partner.displayName.charAt(0)}
        </div>
      )}
      <div className="min-w-0 flex-1">
        <div className="text-base font-semibold">{partner.displayName}</div>
        <Type as="div" variant="caption">{partner.provider}</Type>
      </div>
      <Button
        className="size-12"
        onClick={onClear}
        size="icon"
        variant="secondary"
      >
        <Trash className="size-5" />
      </Button>
    </div>
  );
}

export function CommunityDonationsEditorPage({
  className,
  endaomentUrl,
  partnerPreview,
  resolving,
  resolveError,
  onEndaomentUrlChange,
  onResolve,
  onClearPartner,
  onSave,
  saveDisabled = false,
  saveLoading = false,
}: CommunityDonationsEditorPageProps) {
  const copy = defaultRouteCopy;
  const mc = copy.moderation.donations;
  return (
    <section className={cn("mx-auto flex w-full max-w-5xl flex-col gap-6 md:gap-8", className)}>
      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between md:gap-6">
        <div className="min-w-0 space-y-2">
          <Type as="h1" variant="h1" className="md:text-4xl">{mc.title}</Type>
          <Type as="p" className="max-w-2xl" variant="caption">
            {mc.description}
          </Type>
        </div>
      </div>

      <div className="space-y-4">
        <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_auto] md:items-end">
          <div className="space-y-2">
            <div className="flex items-center gap-1.5">
              <Label tone="muted">
                <Type variant="label">{mc.charityUrlLabel}</Type>
              </Label>
              <a
                aria-label="Open Endaoment"
                className="inline-flex items-center text-muted-foreground transition-colors hover:text-foreground"
                href="https://app.endaoment.org/explore"
                rel="noopener noreferrer"
                target="_blank"
              >
                <ArrowSquareOut className="size-4" />
              </a>
            </div>
            <Input
              className="h-12 px-4 py-2"
              onChange={(event) => onEndaomentUrlChange?.(event.target.value)}
              placeholder={mc.charityUrlPlaceholder}
              value={endaomentUrl}
            />
          </div>
          <Button
            className="h-12 w-full md:w-auto"
            disabled={!endaomentUrl.trim() || resolving}
            loading={resolving}
            onClick={onResolve}
            variant="secondary"
          >
            {mc.loadCharity}
          </Button>
        </div>
        {resolveError ? (
          <div className="text-base text-destructive">{resolveError}</div>
        ) : null}

        {partnerPreview ? (
          <PartnerPreviewCard onClear={onClearPartner} partner={partnerPreview} />
        ) : null}
      </div>

      <div className="flex justify-end">
        <Button disabled={saveDisabled} loading={saveLoading} onClick={onSave}>
          {copy.moderation.saveFooter.defaultSaveLabel}
        </Button>
      </div>
    </section>
  );
}
