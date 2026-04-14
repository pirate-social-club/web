import * as React from "react";
import { Checkbox } from "@/components/primitives/checkbox";
import { Label } from "@/components/primitives/label";
import {
  Combobox,
  ComboboxChip,
  ComboboxChips,
  ComboboxChipsInput,
  ComboboxContent,
  ComboboxEmpty,
  ComboboxInput,
  ComboboxItem,
  ComboboxList,
  ComboboxValue,
} from "@/components/primitives/combobox";
import { FormSectionHeading } from "@/components/primitives/form-layout";
import type {
  ComposerIdentityState,
  IdentityMode,
} from "./post-composer.types";

export function IdentitySection({
  identity,
  identityMode,
  onIdentityModeChange,
}: {
  identity: ComposerIdentityState;
  identityMode: IdentityMode;
  onIdentityModeChange: (mode: IdentityMode) => void;
}) {
  const handleLabel = identity.publicHandle ?? "@handle";
  const anonymousLabel = identity.anonymousLabel ?? "anon_club";

  return (
    <section className="space-y-3 rounded-[var(--radius-lg)] border border-border-soft bg-card px-4 py-4">
      <FormSectionHeading
        description={identityMode === "anonymous" ? anonymousLabel : handleLabel}
        title="Post As"
      />
      <div className="flex items-start gap-3 rounded-[var(--radius-lg)] border border-border-soft bg-background px-4 py-3">
        <Checkbox
          checked={identityMode === "anonymous"}
          className="mt-0.5"
          id="post-anonymously"
          onCheckedChange={(next) => onIdentityModeChange(next === true ? "anonymous" : "public")}
        />
        <div className="space-y-1">
          <Label htmlFor="post-anonymously">Post anonymously</Label>
        </div>
      </div>
    </section>
  );
}

export function QualifierSection({
  identity,
  selectedQualifierIds,
  onSelectedQualifierIdsChange,
}: {
  identity: ComposerIdentityState;
  selectedQualifierIds: string[];
  onSelectedQualifierIdsChange: (qualifierIds: string[]) => void;
}) {
  const availableQualifiers = (identity.availableQualifiers ?? []).filter(
    (qualifier) => !qualifier.suppressedByClubGate,
  );
  const activeQualifiers = availableQualifiers.filter((qualifier) =>
    selectedQualifierIds.includes(qualifier.qualifierId),
  );
  const helpText =
    identity.helpText ??
    "Attach verified qualifiers to this post. Qualifiers already implied by community gates are omitted.";

  return (
    <section className="space-y-3 rounded-[var(--radius-lg)] border border-border-soft bg-card px-4 py-4">
      <FormSectionHeading description={helpText} title="Qualifiers" />

      {availableQualifiers.length > 0 ? (
        <div className="space-y-3">
          <Combobox
            multiple
            autoHighlight
            items={availableQualifiers}
            value={activeQualifiers}
            itemToStringLabel={(qualifier) => qualifier.label}
            itemToStringValue={(qualifier) => qualifier.qualifierId}
            onValueChange={(value) =>
              onSelectedQualifierIdsChange(value.map((qualifier) => qualifier.qualifierId))
            }
          >
            <ComboboxChips>
              <ComboboxValue>
                {(values) => (
                  <>
                    {values.map((qualifier: (typeof availableQualifiers)[number]) => (
                      <ComboboxChip key={qualifier.qualifierId}>{qualifier.label}</ComboboxChip>
                    ))}
                    <ComboboxChipsInput
                      aria-label="Search qualifiers"
                      placeholder={activeQualifiers.length > 0 ? "Search qualifiers" : "Add qualifiers"}
                    />
                  </>
                )}
              </ComboboxValue>
            </ComboboxChips>
            <ComboboxContent>
              <ComboboxEmpty>No qualifiers found.</ComboboxEmpty>
              <ComboboxList>
                {(qualifier) => (
                  <ComboboxItem key={qualifier.qualifierId} value={qualifier}>
                    <p className="text-base font-medium text-foreground">{qualifier.label}</p>
                    {qualifier.description ? (
                      <p className="text-base text-muted-foreground">{qualifier.description}</p>
                    ) : null}
                  </ComboboxItem>
                )}
              </ComboboxList>
            </ComboboxContent>
          </Combobox>
        </div>
      ) : null}

      {availableQualifiers.length === 0 ? (
        <div className="rounded-[var(--radius-lg)] border border-dashed border-border-soft px-4 py-4 text-base text-muted-foreground">
          No optional qualifiers are available for this community.
        </div>
      ) : null}
    </section>
  );
}
