"use client";

import * as React from "react";

import { Checkbox } from "@/components/primitives/checkbox";
import { FormSectionHeading } from "@/components/primitives/form-layout";
import { Input } from "@/components/primitives/input";
import { Label } from "@/components/primitives/label";
import { OptionCard } from "@/components/primitives/option-card";
import { Avatar } from "@/components/primitives/avatar";
import { useIsMobile } from "@/hooks/use-mobile";
import { cn } from "@/lib/utils";

import { fallbackSourceOptions } from "./post-composer-config";
import { FieldLabel } from "./post-composer-fields";
import { IdentitySection, QualifierSection } from "./post-composer-identity-section";
import {
  References,
  SearchReferencePicker,
  SelectedReferenceCard,
  dedupeReferences,
} from "./post-composer-references";
import type {
  AuthorMode,
  CharityContributionState,
  CommunityCharityPartner,
  ComposerAudienceState,
  ComposerIdentityState,
  ComposerReference,
  ComposerTab,
  DerivativeStepState,
  IdentityMode,
  MonetizationState,
  PostAudience,
} from "./post-composer.types";

type DerivativeStateUpdater = (
  updater: (current: DerivativeStepState | undefined) => DerivativeStepState | undefined,
) => void;
type MonetizationStateUpdater = (updater: (current: MonetizationState) => MonetizationState) => void;
type AudienceStateUpdater = (updater: (current: ComposerAudienceState) => ComposerAudienceState) => void;
type CharityContributionUpdater = (updater: (current: CharityContributionState) => CharityContributionState) => void;

function buildAvatarFallback(name: string): string {
  const tokens = name.trim().split(/\s+/).filter(Boolean);
  if (tokens.length === 0) return "?";
  if (tokens.length === 1) return tokens[0].slice(0, 2).toUpperCase();
  return `${tokens[0][0] ?? ""}${tokens[1][0] ?? ""}`.toUpperCase();
}

export function PostComposerIdentitySections({
  activeTab,
  anonymousEligibleTabs,
  authorMode,
  identity,
  identityMode,
  onAuthorModeChange,
  onIdentityModeChange,
  onSelectedQualifierIdsChange,
  selectedQualifierIds,
}: {
  activeTab: ComposerTab;
  anonymousEligibleTabs: ComposerTab[];
  authorMode: AuthorMode;
  identity?: ComposerIdentityState;
  identityMode: IdentityMode;
  onAuthorModeChange: (next: AuthorMode) => void;
  onIdentityModeChange: (next: IdentityMode) => void;
  onSelectedQualifierIdsChange: (next: string[]) => void;
  selectedQualifierIds: string[];
}) {
  const currentIdentity = identity;
  const shouldShowIdentity =
    Boolean(currentIdentity?.agentLabel)
    || (Boolean(currentIdentity?.allowAnonymousIdentity) && anonymousEligibleTabs.includes(activeTab));
  const shouldShowQualifiers =
    Boolean(currentIdentity?.availableQualifiers?.some((qualifier) => !qualifier.suppressedByClubGate)) &&
    authorMode !== "agent" &&
    identityMode === "anonymous" &&
    currentIdentity?.allowQualifiersOnAnonymousPosts !== false;

  return (
    <>
      {shouldShowIdentity && currentIdentity ? (
        <IdentitySection
          authorMode={authorMode}
          identity={currentIdentity}
          identityMode={identityMode}
          onAuthorModeChange={onAuthorModeChange}
          onIdentityModeChange={onIdentityModeChange}
        />
      ) : null}

      {shouldShowQualifiers && currentIdentity ? (
        <QualifierSection
          identity={currentIdentity}
          onSelectedQualifierIdsChange={onSelectedQualifierIdsChange}
          selectedQualifierIds={selectedQualifierIds}
        />
      ) : null}
    </>
  );
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
  updateMonetizationState,
}: {
  copy: {
    access: Record<string, string>;
    fields: Record<string, string>;
    placeholders: Record<string, string>;
    sections: Record<string, string>;
  };
  monetizationState: MonetizationState;
  updateMonetizationState: MonetizationStateUpdater;
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
  updateCharityContribution,
}: {
  charityPartner: CommunityCharityPartner;
  charityContribution: CharityContributionState;
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
      <FormSectionHeading title="Charity" />
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
  const audienceOptions: Array<{
    value: PostAudience;
    title: string;
    description: string;
  }> = [
    {
      value: "public",
      title: copy.audience.public,
      description: copy.audience.publicDescription,
    },
    {
      value: "members_only",
      title: copy.audience.private,
      description: copy.audience.privateDescription,
    },
  ];

  return (
    <section className="space-y-4 rounded-[var(--radius-lg)] border border-border-soft bg-card px-4 py-4">
      <FormSectionHeading title={copy.sections.audience} />
      <div className="space-y-3">
        {audienceOptions.map((option) => {
          const disabled = option.value === "public" && audience.publicOptionEnabled === false;

          return (
            <OptionCard
              key={option.value}
              description={option.description}
              disabled={disabled}
              disabledHint={disabled ? audience.publicOptionDisabledReason : undefined}
              selected={audience.visibility === option.value}
              title={option.title}
              onClick={() => updateAudience((current) => ({ ...current, visibility: option.value }))}
            />
          );
        })}
      </div>
    </section>
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
