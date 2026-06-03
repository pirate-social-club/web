"use client";

import * as React from "react";

import { Checkbox } from "@/components/primitives/checkbox";
import { FormFieldLabel, FormSectionHeading } from "@/components/primitives/form-layout";
import { Input } from "@/components/primitives/input";
import { Label } from "@/components/primitives/label";
import { OptionCard } from "@/components/primitives/option-card";
import { Scrubber } from "@/components/primitives/scrubber";
import { Tabs, TabsList, TabsTrigger } from "@/components/primitives/tabs";
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

type DerivativeSectionLabels = {
  acceptTermsLabel?: string;
  emptyLabel?: string;
  placeholder?: string;
  searchAriaLabel?: string;
  sectionTitle?: string;
};

type SourceModeOption = {
  label: string;
  value: string;
};

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

function licenseRequiresRevShare(presetId: AssetLicensePresetId): boolean {
  return presetId === "commercial-remix";
}

export function PostComposerDerivativeSection({
  copy,
  derivativePickerKey,
  derivativeSearchResults,
  derivativeState,
  labels,
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
  labels?: DerivativeSectionLabels;
  onAdvancePicker: () => void;
  updateDerivativeState: DerivativeStateUpdater;
}) {
  const isMobile = useIsMobile();
  const sourceTermsAcceptedId = React.useId();
  if (!derivativeState?.visible) {
    return null;
  }

  const searchLoading = derivativeState.searchLoading === true
    || derivativeState.searchResults === undefined;

  return (
    <section className={cn("space-y-3 rounded-[var(--radius-lg)] border border-border-soft bg-card p-4", isMobile && "rounded-none border-0 bg-transparent p-0")}>
      <FormSectionHeading title={labels?.sectionTitle ?? copy.sections.sourceTrack} />
      <SearchReferencePicker
        ariaLabel={labels?.searchAriaLabel ?? copy.derivative.searchSourceTracks}
        emptyLabel={labels?.emptyLabel ?? copy.empty.noSourceTracks}
        items={derivativeSearchResults}
        loading={searchLoading}
        onQueryChange={(query) => {
          updateDerivativeState((current) => current
            ? { ...current, query, searchLoading: true }
            : current);
        }}
        onSelect={(reference) => {
          updateDerivativeState((current) => ({
            visible: true,
            trigger: current?.trigger ?? "remix",
            query: "",
            requirementLabel: current?.requirementLabel,
            required: current?.required,
            searchResults: current?.searchResults,
            searchLoading: false,
            references: dedupeReferences([...(current?.references ?? []), reference]),
            licenseSummary: current?.licenseSummary,
            sourceTermsAccepted: false,
          }));
          onAdvancePicker();
        }}
        placeholder={labels?.placeholder ?? copy.placeholders.sourceTrackSearch}
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
      {derivativeState.references?.length ? (
        <div className={cn("flex items-start gap-2 px-1 py-1", isMobile && "px-0")}>
          <Checkbox
            checked={derivativeState.sourceTermsAccepted === true}
            className="mt-0.5"
            id={sourceTermsAcceptedId}
            onCheckedChange={(next) =>
              updateDerivativeState((current) => current
                ? { ...current, sourceTermsAccepted: next === true }
                : current)
            }
          />
          <Label className="text-muted-foreground" htmlFor={sourceTermsAcceptedId}>
            {labels?.acceptTermsLabel ?? copy.derivative.acceptSourceTerms}
          </Label>
        </div>
      ) : null}
    </section>
  );
}

export function PostComposerSourceModeTabs({
  modes,
  onValueChange,
  value,
}: {
  modes: SourceModeOption[];
  onValueChange: (value: string) => void;
  value: string;
}) {
  return (
    <Tabs
      className="w-full"
      onValueChange={onValueChange}
      value={value}
    >
      <TabsList className="grid h-auto w-full rounded-full border border-border-soft" style={{ gridTemplateColumns: `repeat(${modes.length}, minmax(0, 1fr))` }}>
        {modes.map((mode) => (
          <TabsTrigger
            className="h-10 min-w-0 px-3 font-semibold"
            key={mode.value}
            value={mode.value}
          >
            {mode.label}
          </TabsTrigger>
        ))}
      </TabsList>
    </Tabs>
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
    <section className={cn("space-y-4 rounded-[var(--radius-lg)] border border-border-soft bg-card p-4", isMobile && "rounded-none border-0 bg-transparent p-0")}>
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
        <div className={cn("space-y-3 rounded-[var(--radius-lg)] border border-border-soft bg-background p-4", isMobile && "rounded-none border-0 bg-transparent px-0 py-1")}>
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
  contentKind?: "text" | "image" | "song" | "video";
  monetizationState: MonetizationState;
  previewStartSeconds?: string;
  updateMonetizationState: MonetizationStateUpdater;
  onPreviewStartSecondsChange?: (value: string) => void;
}) {
  const isMobile = useIsMobile();
  const publicDescription = contentKind === "text"
    ? copy.access.textPublicDescription ?? copy.access.publicDescription
    : contentKind === "image"
      ? copy.access.imagePublicDescription ?? copy.access.publicDescription
    : copy.access.publicDescription;
  const paidDescription = contentKind === "text"
    ? copy.access.textPaidDescription ?? copy.access.paidDescription
    : contentKind === "image"
      ? copy.access.imagePaidDescription ?? copy.access.paidDescription
    : copy.access.paidDescription;
  const freeAccessTitle = copy.access.freeToView ?? copy.access.public;
  const priceLabel = contentKind === "text" || contentKind === "image"
    ? copy.fields.price ?? copy.fields.unlockPriceUsd
    : copy.fields.unlockPriceUsd;
  const vinylReleaseUrlLabel = copy.fields.vinylReleaseUrl ?? "ElasticStage vinyl URL";
  const vinylReleaseUrlPlaceholder = copy.placeholders.vinylReleaseUrl ?? "https://elasticstage.com/artist/releases/release-singleep";

  if (isMobile) {
    return (
      <section className="space-y-3">
        <FormSectionHeading title={copy.sections.access} />
        <div className="grid grid-cols-2 gap-2 rounded-full border border-border-soft bg-muted p-1">
          <button
            aria-pressed={!monetizationState.visible}
            className={cn(
              "h-10 rounded-full px-3 text-base font-semibold transition-colors",
              !monetizationState.visible
                ? "bg-card text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground",
            )}
            onClick={() =>
              updateMonetizationState((current) => ({
                ...current,
                visible: false,
                regionalPricingEnabled: false,
                vinylReleaseUrl: "",
              }))
            }
            type="button"
          >
            {freeAccessTitle}
          </button>
          <button
            aria-pressed={monetizationState.visible}
            className={cn(
              "h-10 rounded-full px-3 text-base font-semibold transition-colors",
              monetizationState.visible
                ? "bg-card text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground",
            )}
            onClick={() =>
              updateMonetizationState((current) => ({
                ...current,
                visible: true,
              }))
            }
            type="button"
          >
            {copy.access.paidUnlock}
          </button>
        </div>

        {monetizationState.visible ? (
          <div className="space-y-4 pt-1">
            <div className="grid grid-cols-[1fr_auto] items-center gap-3">
              <FieldLabel label={priceLabel} />
              <Input
                className="h-11 w-32 text-end"
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
              <div className="grid grid-cols-[1fr_auto] items-center gap-3">
                <FieldLabel label={copy.fields.previewStartSeconds} />
                <Input
                  className="h-11 w-32 text-end"
                  inputMode="numeric"
                  onChange={(event) =>
                    onPreviewStartSecondsChange(normalizeSecondsInput(event.target.value))
                  }
                  placeholder={copy.placeholders.previewStartSeconds}
                  value={previewStartSeconds ?? ""}
                />
              </div>
            ) : null}

            {contentKind === "song" ? (
              <div className="grid gap-2">
                <FieldLabel label={vinylReleaseUrlLabel} />
                <Input
                  className="h-11"
                  inputMode="url"
                  onChange={(event) =>
                    updateMonetizationState((current) => ({
                      ...current,
                      vinylReleaseUrl: event.target.value,
                    }))
                  }
                  placeholder={vinylReleaseUrlPlaceholder}
                  value={monetizationState.vinylReleaseUrl ?? ""}
                />
              </div>
            ) : null}

            {monetizationState.regionalPricingAvailable ? (
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
                <Label htmlFor="regional-pricing">{copy.access.useRegionalPricing}</Label>
              </div>
            ) : null}
          </div>
        ) : null}
      </section>
    );
  }

  return (
    <section className={cn("space-y-4 rounded-[var(--radius-lg)] border border-border-soft bg-card p-4", isMobile && "rounded-none border-0 bg-transparent p-0")}>
      <FormSectionHeading title={copy.sections.access} />
      <div className="grid gap-3 md:grid-cols-2">
        <OptionCard
          description={publicDescription}
          onClick={() =>
            updateMonetizationState((current) => ({
              ...current,
              visible: false,
              regionalPricingEnabled: false,
              vinylReleaseUrl: "",
            }))
          }
          selected={!monetizationState.visible}
          title={freeAccessTitle}
        />
        <OptionCard
          description={paidDescription}
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
        <div className={cn("space-y-4 rounded-[var(--radius-lg)] border border-border-soft bg-background p-4", isMobile && "rounded-none border-0 bg-transparent p-0")}>
          <div className="grid gap-3 md:grid-cols-2">
            <div>
              <FieldLabel label={priceLabel} />
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

            {contentKind === "song" ? (
              <div className="md:col-span-2">
                <FieldLabel label={vinylReleaseUrlLabel} />
                <Input
                  className="h-12"
                  inputMode="url"
                  onChange={(event) =>
                    updateMonetizationState((current) => ({
                      ...current,
                      vinylReleaseUrl: event.target.value,
                    }))
                  }
                  placeholder={vinylReleaseUrlPlaceholder}
                  value={monetizationState.vinylReleaseUrl ?? ""}
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
    <section className={cn("space-y-4 rounded-[var(--radius-lg)] border border-border-soft bg-card p-4", isMobile && "rounded-none border-0 bg-transparent p-0")}>
      <FormSectionHeading title={copy.fields.charity} />
      <div className={cn("flex flex-wrap items-center justify-between gap-x-6 gap-y-4 rounded-[var(--radius-lg)] border border-border-soft bg-background p-4", isMobile && "rounded-none border-0 bg-transparent p-0")}>
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
  className,
  copy,
  label,
  triggerClassName,
  updateAudience,
}: {
  audience: ComposerAudienceState;
  className?: string;
  copy: {
    audience: Record<string, string>;
    sections: Record<string, string>;
  };
  label?: string;
  triggerClassName?: string;
  updateAudience: AudienceStateUpdater;
}) {
  return (
    <div className={cn("flex min-w-0 items-center gap-3", className)}>
      {label ? <FormFieldLabel className="shrink-0" label={label} /> : null}
      <AudienceSelect
        className="w-full min-w-0"
        labels={{
          public: copy.audience.public,
          community: copy.audience.community,
          title: label ?? copy.sections.audience,
        }}
        publicOptionDisabledReason={audience.publicOptionDisabledReason}
        publicOptionEnabled={audience.publicOptionEnabled}
        triggerClassName={triggerClassName}
        value={audience.visibility}
        onChange={(value) => updateAudience((current) => ({ ...current, visibility: value }))}
      />
    </div>
  );
}

export function deriveDerivativeSearchResults(
  derivativeState?: DerivativeStepState,
): ComposerReference[] {
  const selectedIds = new Set((derivativeState?.references ?? []).map((reference) => reference.id));
  return dedupeReferences(derivativeState?.searchResults ?? [])
    .filter((reference) => !selectedIds.has(reference.id));
}
