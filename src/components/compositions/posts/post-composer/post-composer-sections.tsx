"use client";

import * as React from "react";

import { Checkbox } from "@/components/primitives/checkbox";
import { FormSectionHeading } from "@/components/primitives/form-layout";
import { Label } from "@/components/primitives/label";
import { Tabs, TabsList, TabsTrigger } from "@/components/primitives/tabs";
import { useIsMobile } from "@/hooks/use-mobile";
import { cn } from "@/lib/utils";

import {
  References,
  SearchReferencePicker,
  SelectedReferenceCard,
  dedupeReferences,
} from "./post-composer-references";
import type {
  ComposerReference,
  DerivativeStepState,
} from "./post-composer.types";

type DerivativeStateUpdater = (
  updater: (current: DerivativeStepState | undefined) => DerivativeStepState | undefined,
) => void;

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

  const searchError = derivativeState.searchError?.trim() || null;
  const searchLoading = !searchError && (
    derivativeState.searchLoading === true
    || derivativeState.searchResults === undefined
  );

  return (
    <section className={cn("space-y-3 rounded-[var(--radius-lg)] border border-border-soft bg-card p-4", isMobile && "rounded-none border-0 bg-transparent p-0")}>
      <FormSectionHeading title={labels?.sectionTitle ?? copy.sections.sourceTrack} />
      <SearchReferencePicker
        ariaLabel={labels?.searchAriaLabel ?? copy.derivative.searchSourceTracks}
        emptyLabel={searchError ?? labels?.emptyLabel ?? copy.empty.noSourceTracks}
        items={derivativeSearchResults}
        loading={searchLoading}
        onQueryChange={(query) => {
          updateDerivativeState((current) => current
            ? { ...current, query, searchError: undefined, searchLoading: true }
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
            searchError: undefined,
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

export function deriveDerivativeSearchResults(
  derivativeState?: DerivativeStepState,
): ComposerReference[] {
  const selectedIds = new Set((derivativeState?.references ?? []).map((reference) => reference.id));
  return dedupeReferences(derivativeState?.searchResults ?? [])
    .filter((reference) => !selectedIds.has(reference.id));
}
