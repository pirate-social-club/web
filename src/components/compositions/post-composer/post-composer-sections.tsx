"use client";

import { Checkbox } from "@/components/primitives/checkbox";
import { FormSectionHeading } from "@/components/primitives/form-layout";
import { Input } from "@/components/primitives/input";
import { Label } from "@/components/primitives/label";
import { OptionCard } from "@/components/primitives/option-card";

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
  ComposerIdentityState,
  ComposerReference,
  ComposerTab,
  DerivativeStepState,
  IdentityMode,
  MonetizationState,
} from "./post-composer.types";

type DerivativeStateUpdater = (
  updater: (current: DerivativeStepState | undefined) => DerivativeStepState | undefined,
) => void;
type MonetizationStateUpdater = (updater: (current: MonetizationState) => MonetizationState) => void;

export function PostComposerIdentitySections({
  activeTab,
  anonymousEligibleTabs,
  identity,
  identityMode,
  onIdentityModeChange,
  onSelectedQualifierIdsChange,
  selectedQualifierIds,
}: {
  activeTab: ComposerTab;
  anonymousEligibleTabs: ComposerTab[];
  identity?: ComposerIdentityState;
  identityMode: IdentityMode;
  onIdentityModeChange: (next: IdentityMode) => void;
  onSelectedQualifierIdsChange: (next: string[]) => void;
  selectedQualifierIds: string[];
}) {
  const currentIdentity = identity;
  const shouldShowIdentity =
    Boolean(currentIdentity?.allowAnonymousIdentity) && anonymousEligibleTabs.includes(activeTab);
  const shouldShowQualifiers =
    Boolean(currentIdentity?.availableQualifiers?.some((qualifier) => !qualifier.suppressedByClubGate)) &&
    identityMode === "anonymous" &&
    currentIdentity?.allowQualifiersOnAnonymousPosts !== false;

  return (
    <>
      {shouldShowIdentity && currentIdentity ? (
        <IdentitySection
          identity={currentIdentity}
          identityMode={identityMode}
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
  derivativePickerKey,
  derivativeSearchResults,
  derivativeState,
  onAdvancePicker,
  updateDerivativeState,
}: {
  derivativePickerKey: number;
  derivativeSearchResults: ComposerReference[];
  derivativeState?: DerivativeStepState;
  onAdvancePicker: () => void;
  updateDerivativeState: DerivativeStateUpdater;
}) {
  if (!derivativeState?.visible) {
    return null;
  }

  return (
    <section className="space-y-3 rounded-[var(--radius-lg)] border border-border-soft bg-card px-4 py-4">
      <FormSectionHeading title="Source track" />
      <SearchReferencePicker
        ariaLabel="Search source tracks"
        emptyLabel="No source tracks found."
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
        placeholder="Search Pirate / Story assets"
        resetKey={derivativePickerKey}
      />
      {derivativeState.requirementLabel ? (
        <div className="rounded-[var(--radius-lg)] bg-muted px-4 py-3 text-base text-foreground">
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
  monetizationState,
  updateMonetizationState,
}: {
  monetizationState: MonetizationState;
  updateMonetizationState: MonetizationStateUpdater;
}) {
  return (
    <section className="space-y-4 rounded-[var(--radius-lg)] border border-border-soft bg-card px-4 py-4">
      <FormSectionHeading title="Access" />
      <div className="grid gap-3 md:grid-cols-2">
        <OptionCard
          description="Anyone can play the full track."
          onClick={() =>
            updateMonetizationState((current) => ({
              ...current,
              visible: false,
              regionalPricingEnabled: false,
            }))
          }
          selected={!monetizationState.visible}
          title="Public"
        />
        <OptionCard
          description="Preview in feed. Full track unlocks after purchase."
          onClick={() =>
            updateMonetizationState((current) => ({
              ...current,
              visible: true,
            }))
          }
          selected={monetizationState.visible}
          title="Paid unlock"
        />
      </div>

      {monetizationState.visible ? (
        <div className="space-y-4 rounded-[var(--radius-lg)] border border-border-soft bg-background px-4 py-4">
          <div className="grid gap-3 md:grid-cols-2">
            <div>
              <FieldLabel label="Unlock price (USD)" />
              <Input
                className="h-12"
                inputMode="decimal"
                onChange={(event) =>
                  updateMonetizationState((current) => ({
                    ...current,
                    priceUsd: event.target.value,
                  }))
                }
                placeholder="1.00"
                value={monetizationState.priceUsd ?? ""}
              />
            </div>

            {monetizationState.regionalPricingAvailable ? (
              <div className="rounded-[var(--radius-lg)] border border-border-soft bg-card px-4 py-3">
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
                    <Label htmlFor="regional-pricing">Use community regional pricing</Label>
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
                I have the rights to publish and monetize this track.
              </Label>
            </div>
          </div>
        </div>
      ) : null}
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
