"use client";

import * as React from "react";
import { Trash } from "@phosphor-icons/react";

import { Button } from "@/components/primitives/button";
import { FormFieldLabel } from "@/components/primitives/form-layout";
import { Input } from "@/components/primitives/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/primitives/select";
import { cn } from "@/lib/utils";

export type DonationPolicyMode = "none" | "optional_creator_sidecar" | "fundraiser_default";

export interface DonationPartnerPreview {
  donationPartnerId: string;
  displayName: string;
  provider: string;
  providerPartnerRef?: string | null;
  imageUrl?: string | null;
}

const MODE_OPTIONS: Array<{ label: string; value: DonationPolicyMode }> = [
  { value: "none", label: "No donations" },
  { value: "optional_creator_sidecar", label: "Creators can opt in" },
  { value: "fundraiser_default", label: "Donate by default" },
];

export interface CommunityDonationsEditorPageProps {
  className?: string;
  donationMode: DonationPolicyMode;
  endaomentUrl: string;
  partnerPreview: DonationPartnerPreview | null;
  resolving: boolean;
  resolveError: string | null;
  onDonationModeChange?: (value: DonationPolicyMode) => void;
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
    <div className="flex items-center gap-4 rounded-[1.75rem] border border-border-soft bg-card p-5">
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
        <div className="text-base text-muted-foreground">{partner.provider}</div>
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
  donationMode,
  endaomentUrl,
  partnerPreview,
  resolving,
  resolveError,
  onDonationModeChange,
  onEndaomentUrlChange,
  onResolve,
  onClearPartner,
  onSave,
  saveDisabled = false,
  saveLoading = false,
}: CommunityDonationsEditorPageProps) {
  return (
    <section className={cn("mx-auto flex w-full max-w-[64rem] flex-col gap-8", className)}>
      <div className="flex items-start justify-between gap-6">
        <div className="min-w-0">
          <h1 className="text-[2.25rem] font-semibold tracking-tight">Donations</h1>
        </div>
        <Button disabled={saveDisabled} loading={saveLoading} onClick={onSave}>
          Save
        </Button>
      </div>

      <div className="space-y-4">
        <div className="rounded-[1.75rem] border border-border-soft bg-card p-5">
          <div className="grid gap-5 md:grid-cols-[minmax(0,1fr)_auto] md:items-end">
            <div className="space-y-2">
              <FormFieldLabel label="Endaoment URL" />
              <Input
                className="h-12 px-4 py-2"
                onChange={(event) => onEndaomentUrlChange?.(event.target.value)}
                placeholder="https://app.endaoment.org/orgs/..."
                value={endaomentUrl}
              />
            </div>
            <Button
              disabled={!endaomentUrl.trim() || resolving}
              loading={resolving}
              onClick={onResolve}
              variant="secondary"
            >
              Resolve
            </Button>
          </div>
          {resolveError ? (
            <div className="mt-3 text-base text-destructive">{resolveError}</div>
          ) : null}
        </div>

        {partnerPreview ? (
          <PartnerPreviewCard onClear={onClearPartner} partner={partnerPreview} />
        ) : null}

        <div className="rounded-[1.75rem] border border-border-soft bg-card p-5">
          <div className="space-y-2">
            <FormFieldLabel label="Donation mode" />
            <Select
              onValueChange={(value) => onDonationModeChange?.(value as DonationPolicyMode)}
              value={donationMode}
            >
              <SelectTrigger className="h-12 rounded-full px-4 text-base">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {MODE_OPTIONS.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>
    </section>
  );
}
