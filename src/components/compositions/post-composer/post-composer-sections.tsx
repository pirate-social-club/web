"use client";

import * as React from "react";

import { Checkbox } from "@/components/primitives/checkbox";
import { FormSectionHeading } from "@/components/primitives/form-layout";
import { Input } from "@/components/primitives/input";
import { Label } from "@/components/primitives/label";
import { OptionCard } from "@/components/primitives/option-card";
import { AudienceSelect } from "./post-composer-audience-select";
import { Avatar } from "@/components/primitives/avatar";
import { useIsMobile } from "@/hooks/use-mobile";
import { cn } from "@/lib/utils";

import { fallbackSourceOptions } from "./post-composer-config";
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
  SongComposerState,
} from "./post-composer.types";

type DerivativeStateUpdater = (
  updater: (current: DerivativeStepState | undefined) => DerivativeStepState | undefined,
) => void;
type MonetizationStateUpdater = (updater: (current: MonetizationState) => MonetizationState) => void;
type SongStateUpdater = (updater: (current: SongComposerState) => SongComposerState) => void;
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
                  };
                });
              }}
            />
          ))}
        </div>
      ) : (
        <References items={derivativeState.references} />
      )}
    </section>
  );
}

export function PostComposerSongAccessSection({
  copy,
  monetizationState,
  songState,
  updateMonetizationState,
  updateSongState,
}: {
  copy: {
    access: Record<string, string>;
    fields: Record<string, string>;
    placeholders: Record<string, string>;
    sections: Record<string, string>;
  };
  monetizationState: MonetizationState;
  songState: SongComposerState;
  updateMonetizationState: MonetizationStateUpdater;
  updateSongState: SongStateUpdater;
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

            <div>
              <FieldLabel label={copy.fields.previewStartSeconds} />
              <Input
                className="h-12"
                inputMode="numeric"
                onChange={(event) =>
                  updateSongState((current) => ({
                    ...current,
                    previewStartSeconds: normalizeSecondsInput(event.target.value),
                  }))
                }
                placeholder={copy.placeholders.previewStartSeconds}
                value={songState.previewStartSeconds ?? ""}
              />
            </div>

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
      <span className="text-base text-muted-foreground">
        {copy.sections.audience}
      </span>
      <AudienceSelect
        labels={{
          public: copy.audience.public,
          publicDescription: copy.audience.publicDescription,
          community: copy.audience.community,
          communityDescription: copy.audience.communityDescription,
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
    ...fallbackSourceOptions,
  ]);
}
