"use client";

import * as React from "react";

import { Checkbox } from "@/components/primitives/checkbox";
import { FormSectionHeading } from "@/components/primitives/form-layout";
import { Input } from "@/components/primitives/input";
import { Label } from "@/components/primitives/label";
import { OptionCard } from "@/components/primitives/option-card";
import { Scrubber } from "@/components/primitives/scrubber";
import { Type } from "@/components/primitives/type";
import { AudienceSelect } from "./post-composer-audience-select";
import { Avatar } from "@/components/primitives/avatar";
import { useIsMobile } from "@/hooks/use-mobile";
import { cn } from "@/lib/utils";

import { FieldLabel } from "./post-composer-fields";
import {
  References,
  SearchReferencePicker,
  SelectedReferenceCard,
  dedupeReferences,
} from "./post-composer-references";
import type {
  CharityContributionState,
  CommunityCharityPartner,
  ComposerAudienceState,
  ComposerReference,
  DerivativeStepState,
  MonetizationState,
  AssetLicensePresetId,
  AssetLicenseState,
} from "./post-composer.types";
import { assetLicensePresetIds } from "./post-composer-config";

type DerivativeStateUpdater = (
  updater: (current: DerivativeStepState | undefined) => DerivativeStepState | undefined,
) => void;
type MonetizationStateUpdater = (updater: (current: MonetizationState) => MonetizationState) => void;
type LicenseStateUpdater = (updater: (current: AssetLicenseState) => AssetLicenseState) => void;
type AudienceStateUpdater = (updater: (current: ComposerAudienceState) => ComposerAudienceState) => void;
type CharityContributionUpdater = (updater: (current: CharityContributionState) => CharityContributionState) => void;

function buildAvatarFallback(name: string): string {
  const tokens = name.trim().split(/\s+/).filter(Boolean);
  if (tokens.length === 0) return "?";
  if (tokens.length === 1) return tokens[0].slice(0, 2).toUpperCase();
  return `${tokens[0][0] ?? ""}${tokens[1][0] ?? ""}`.toUpperCase();
}

function normalizeSecondsInput(value: string): string {
  const digits = value.replace(/\D/g, "");
  if (!digits) {
    return "";
  }
  return String(Math.min(Number.parseInt(digits, 10), 86_400));
}

function shortenStoryIpId(ipId: string): string {
  if (ipId.length <= 14) return ipId;
  return `${ipId.slice(0, 6)}...${ipId.slice(-4)}`;
}

function licenseRequiresRevShare(presetId: AssetLicensePresetId): boolean {
  return presetId === "commercial-remix";
}

export function PostComposerDerivativeSection({
  copy,
  derivativePickerKey,
  derivativeSearchResults,
  derivativeState,
  onAdvancePicker,
  updateDerivativeState,
}: {
  copy: {
    derivative: Record<string, string>;
    empty: Record<string, string>;
    placeholders: Record<string, string>;
    sections: Record<string, string>;
  };
  derivativePickerKey: number;
  derivativeSearchResults: ComposerReference[];
  derivativeState?: DerivativeStepState;
  onAdvancePicker: () => void;
  updateDerivativeState: DerivativeStateUpdater;
}) {
  const isMobile = useIsMobile();
  if (!derivativeState?.visible) {
    return null;
  }

  return (
    <section className={cn("space-y-3 rounded-[var(--radius-lg)] border border-border-soft bg-card px-4 py-4", isMobile && "rounded-none border-0 bg-transparent px-0 py-0")}>
      <FormSectionHeading title={copy.sections.sourceTrack} />
      <SearchReferencePicker
        ariaLabel={copy.derivative.searchSourceTracks}
        emptyLabel={copy.empty.noSourceTracks}
        items={derivativeSearchResults}
        onSelect={(reference) => {
          updateDerivativeState((current) => ({
            visible: true,
            trigger: current?.trigger ?? "remix",
            requirementLabel: current?.requirementLabel,
            required: current?.required,
            searchResults: current?.searchResults,
            references: dedupeReferences([...(current?.references ?? []), reference]),
            licenseSummary: current?.licenseSummary,
            sourceTermsAccepted: false,
          }));
          onAdvancePicker();
        }}
        placeholder={copy.placeholders.sourceTrackSearch}
        resetKey={derivativePickerKey}
      />
      {derivativeState.requirementLabel ? (
        <div className={cn("rounded-[var(--radius-lg)] bg-muted px-4 py-3 text-base text-foreground", isMobile && "rounded-lg px-0 py-2 bg-transparent text-muted-foreground")}>
          {derivativeState.requirementLabel}
        </div>
      ) : null}
      {derivativeState.references?.length ? (
        <div className="space-y-2">
          {derivativeState.references.map((reference) => (
            <SelectedReferenceCard
              key={reference.id}
              item={reference}
              onClear={() => {
                updateDerivativeState((current) => {
                  if (!current) {
                    return current;
                  }
                  return {
                    ...current,
                    references: (current.references ?? []).filter((item) => item.id !== reference.id),
                    sourceTermsAccepted: false,
                  };
                });
              }}
            />
          ))}
        </div>
      ) : (
        <References items={derivativeState.references} />
      )}
      {derivativeState.licenseSummary ? (
        <div className={cn("space-y-1.5 rounded-[var(--radius-lg)] border border-border-soft bg-background px-4 py-3", isMobile && "rounded-none border-0 bg-transparent px-0 py-2")}>
          {derivativeState.licenseSummary.sourceLicense ? (
            <div className="flex items-baseline justify-between gap-3">
              <Type as="span" variant="caption" className="text-muted-foreground">{copy.derivative.licenseSource}</Type>
              <Type as="span" variant="body-strong">{derivativeState.licenseSummary.sourceLicense}</Type>
            </div>
          ) : null}
          {derivativeState.licenseSummary.upstreamRoyaltyPct != null ? (
            <div className="flex items-baseline justify-between gap-3">
              <Type as="span" variant="caption" className="text-muted-foreground">{copy.derivative.licenseUpstreamRoyalty}</Type>
              <Type as="span" variant="body-strong">{derivativeState.licenseSummary.upstreamRoyaltyPct}%</Type>
            </div>
          ) : null}
          {derivativeState.licenseSummary.parentIpId ? (
            <div className="flex items-baseline justify-between gap-3">
              <Type as="span" variant="caption" className="text-muted-foreground">{copy.derivative.licenseParentIp}</Type>
              <Type as="span" variant="body">{shortenStoryIpId(derivativeState.licenseSummary.parentIpId)}</Type>
            </div>
          ) : null}
          {derivativeState.licenseSummary.licenseTermsId ? (
            <div className="flex items-baseline justify-between gap-3">
              <Type as="span" variant="caption" className="text-muted-foreground">{copy.derivative.licenseTermsId}</Type>
              <Type as="span" variant="body">{derivativeState.licenseSummary.licenseTermsId}</Type>
            </div>
          ) : null}
          {derivativeState.licenseSummary.newRemixTerms ? (
            <div className="flex items-baseline justify-between gap-3">
              <Type as="span" variant="caption" className="text-muted-foreground">{copy.derivative.licenseNewRemixTerms}</Type>
              <Type as="span" variant="body-strong">{derivativeState.licenseSummary.newRemixTerms}</Type>
            </div>
          ) : null}
        </div>
      ) : null}
      {derivativeState.references?.length ? (
        <div className={cn("flex items-start gap-3 rounded-[var(--radius-lg)] border border-border-soft bg-background px-4 py-3", isMobile && "rounded-none border-0 bg-transparent px-0 py-2")}>
          <Checkbox
            checked={derivativeState.sourceTermsAccepted === true}
            className="mt-0.5"
            id="source-terms-accepted"
            onCheckedChange={(next) =>
              updateDerivativeState((current) => current
                ? { ...current, sourceTermsAccepted: next === true }
                : current)
            }
          />
          <Label htmlFor="source-terms-accepted">
            {copy.derivative.acceptSourceTerms}
          </Label>
        </div>
      ) : null}
    </section>
  );
}

export function PostComposerAssetLicenseSection({
  licenseCopy,
  licenseState,
  sectionTitle,
  updateLicenseState,
}: {
  licenseCopy: Record<string, string>;
  licenseState: AssetLicenseState;
  sectionTitle: string;
  updateLicenseState: LicenseStateUpdater;
}) {
  const isMobile = useIsMobile();
  const requiresRevShare = licenseRequiresRevShare(licenseState.presetId);
  const revSharePct = Math.max(0, Math.min(100, licenseState.commercialRevSharePct ?? 10));

  return (
    <section className={cn("space-y-4 rounded-[var(--radius-lg)] border border-border-soft bg-card px-4 py-4", isMobile && "rounded-none border-0 bg-transparent px-0 py-0")}>
      <FormSectionHeading title={sectionTitle} />
      <div className="grid gap-3">
        {assetLicensePresetIds.map((presetId) => (
          <OptionCard
            description={licenseCopy[`${presetId}Description`]}
            key={presetId}
            onClick={() =>
              updateLicenseState((current) => ({
                presetId,
                commercialRevSharePct: licenseRequiresRevShare(presetId)
                  ? current.commercialRevSharePct ?? 10
                  : undefined,
              }))
            }
            selected={licenseState.presetId === presetId}
            title={licenseCopy[presetId]}
          />
        ))}
      </div>

      {requiresRevShare ? (
        <div className={cn("space-y-3 rounded-[var(--radius-lg)] border border-border-soft bg-background px-4 py-4", isMobile && "rounded-none border-0 bg-transparent px-0 py-1")}>
          <div className="flex items-start justify-between gap-4">
            <div className="space-y-1">
              <Type as="div" variant="label">{licenseCopy.revenueShare}</Type>
              <Type as="div" variant="body" className="text-muted-foreground">
                {licenseCopy.revenueShareDescription}
              </Type>
            </div>
            <Type as="div" variant="h3" className="shrink-0">
              {revSharePct}%
            </Type>
          </div>
          <Scrubber
            max={100}
            onChange={(next) =>
              updateLicenseState((current) => ({
                ...current,
                commercialRevSharePct: next,
              }))
            }
            showThumb
            value={revSharePct}
          />
          <Type as="div" variant="caption" className="text-muted-foreground">
            {licenseCopy.revenueShareRange}
          </Type>
        </div>
      ) : null}
    </section>
  );
}

export function PostComposerCommerceAccessSection({
  copy,
  contentKind = "song",
  monetizationState,
  previewStartSeconds,
  updateMonetizationState,
  onPreviewStartSecondsChange,
}: {
  copy: {
    access: Record<string, string>;
    fields: Record<string, string>;
    placeholders: Record<string, string>;
    sections: Record<string, string>;
  };
  contentKind?: "song" | "video";
  monetizationState: MonetizationState;
  previewStartSeconds?: string;
  updateMonetizationState: MonetizationStateUpdater;
  onPreviewStartSecondsChange?: (value: string) => void;
}) {
  const isMobile = useIsMobile();
  return (
    <section className={cn("space-y-4 rounded-[var(--radius-lg)] border border-border-soft bg-card px-4 py-4", isMobile && "rounded-none border-0 bg-transparent px-0 py-0")}>
      <FormSectionHeading title={copy.sections.access} />
      <div className="grid gap-3 md:grid-cols-2">
        <OptionCard
          description={copy.access.publicDescription}
          onClick={() =>
            updateMonetizationState((current) => ({
              ...current,
              visible: false,
              regionalPricingEnabled: false,
            }))
          }
          selected={!monetizationState.visible}
          title={copy.access.public}
        />
        <OptionCard
          description={copy.access.paidDescription}
          onClick={() =>
            updateMonetizationState((current) => ({
              ...current,
              visible: true,
            }))
          }
          selected={monetizationState.visible}
          title={copy.access.paidUnlock}
        />
      </div>

      {monetizationState.visible ? (
        <div className={cn("space-y-4 rounded-[var(--radius-lg)] border border-border-soft bg-background px-4 py-4", isMobile && "rounded-none border-0 bg-transparent px-0 py-0")}>
          <div className="grid gap-3 md:grid-cols-2">
            <div>
              <FieldLabel label={copy.fields.unlockPriceUsd} />
              <Input
                className="h-12"
                inputMode="decimal"
                onChange={(event) =>
                  updateMonetizationState((current) => ({
                    ...current,
                    priceUsd: event.target.value,
                  }))
                }
                placeholder={copy.placeholders.unlockPrice}
                value={monetizationState.priceUsd ?? ""}
              />
            </div>

            {contentKind === "song" && onPreviewStartSecondsChange ? (
            <div>
              <FieldLabel label={copy.fields.previewStartSeconds} />
              <Input
                className="h-12"
                inputMode="numeric"
                onChange={(event) =>
                  onPreviewStartSecondsChange(normalizeSecondsInput(event.target.value))
                }
                placeholder={copy.placeholders.previewStartSeconds}
                value={previewStartSeconds ?? ""}
              />
            </div>
            ) : null}

            {monetizationState.regionalPricingAvailable ? (
              <div className={cn("rounded-[var(--radius-lg)] border border-border-soft bg-card px-4 py-3", isMobile && "rounded-none border-0 bg-transparent px-0 py-1")}>
                <div className="flex items-start gap-3">
                  <Checkbox
                    checked={monetizationState.regionalPricingEnabled}
                    className="mt-0.5"
                    id="regional-pricing"
                    onCheckedChange={(next) =>
                      updateMonetizationState((current) => ({
                        ...current,
                        regionalPricingEnabled: next === true,
                      }))
                    }
                  />
                  <div className="space-y-1">
                    <Label htmlFor="regional-pricing">{copy.access.useRegionalPricing}</Label>
                  </div>
                </div>
              </div>
            ) : null}
          </div>

          <div className="flex items-start gap-3 border-t border-border-soft pt-4">
            <Checkbox
              checked={monetizationState.rightsAttested}
              className="mt-0.5"
              id="rights-attested"
              onCheckedChange={(next) =>
                updateMonetizationState((current) => ({
                  ...current,
                  rightsAttested: next === true,
                }))
              }
            />
            <div className="space-y-1">
              <Label htmlFor="rights-attested">
                {copy.access.rightsAttested}
              </Label>
            </div>
          </div>
        </div>
      ) : null}
    </section>
  );
}

export function PostComposerCharitySection({
  charityPartner,
  charityContribution,
  copy,
  updateCharityContribution,
}: {
  charityPartner: CommunityCharityPartner;
  charityContribution: CharityContributionState;
  copy: { fields: Record<string, string> };
  updateCharityContribution: CharityContributionUpdater;
}) {
  const isMobile = useIsMobile();
  const handlePercentageChange = React.useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      const raw = event.target.value.replace(/[^0-9]/g, "");
      const parsed = raw === "" ? 0 : Math.min(100, Number.parseInt(raw, 10));
      updateCharityContribution((current) => ({
        ...current,
        percentagePct: parsed,
      }));
    },
    [updateCharityContribution],
  );

  return (
    <section className={cn("space-y-4 rounded-[var(--radius-lg)] border border-border-soft bg-card px-4 py-4", isMobile && "rounded-none border-0 bg-transparent px-0 py-0")}>
      <FormSectionHeading title={copy.fields.charity} />
      <div className={cn("flex flex-wrap items-center justify-between gap-x-6 gap-y-4 rounded-[var(--radius-lg)] border border-border-soft bg-background px-4 py-4", isMobile && "rounded-none border-0 bg-transparent px-0 py-0")}>
        <div className="flex min-w-0 items-center gap-3">
          <Avatar
            className="border-border-soft bg-card"
            fallback={buildAvatarFallback(charityPartner.displayName)}
            size="md"
            src={charityPartner.imageUrl?.trim() || undefined}
          />
          <div className="min-w-0">
            <div className="text-base font-semibold text-foreground">
              {charityPartner.displayName}
            </div>
            <div className="text-base text-muted-foreground">
              Share of sale proceeds
            </div>
          </div>
        </div>
        <div className="inline-flex items-center gap-2">
          <input
            className="h-12 w-16 rounded-[var(--radius-md)] border border-border-soft bg-card px-3 text-base font-semibold tabular-nums text-foreground outline-none transition-colors focus:border-primary"
            inputMode="numeric"
            maxLength={3}
            min={0}
            onChange={handlePercentageChange}
            type="text"
            value={charityContribution.percentagePct === 0 ? "" : String(charityContribution.percentagePct)}
          />
          <span className="text-base text-muted-foreground">%</span>
        </div>
      </div>
    </section>
  );
}

export function PostComposerAudienceSection({
  audience,
  copy,
  updateAudience,
}: {
  audience: ComposerAudienceState;
  copy: {
    audience: Record<string, string>;
    sections: Record<string, string>;
  };
  updateAudience: AudienceStateUpdater;
}) {
  return (
    <div className="flex items-center gap-3">
      <AudienceSelect
        labels={{
          public: copy.audience.public,
          community: copy.audience.community,
          title: copy.sections.audience,
        }}
        publicOptionDisabledReason={audience.publicOptionDisabledReason}
        publicOptionEnabled={audience.publicOptionEnabled}
        value={audience.visibility}
        onChange={(value) => updateAudience((current) => ({ ...current, visibility: value }))}
      />
    </div>
  );
}

export function deriveDerivativeSearchResults(
  derivativeState?: DerivativeStepState,
): ComposerReference[] {
  return dedupeReferences([
    ...(derivativeState?.searchResults ?? []),
    ...(derivativeState?.references ?? []),
  ]);
}
