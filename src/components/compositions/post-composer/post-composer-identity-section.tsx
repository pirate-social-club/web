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
import { useUiLocale } from "@/lib/ui-locale";
import { getLocaleMessages } from "@/locales";
import type {
  AuthorMode,
  ComposerIdentityState,
  IdentityMode,
} from "./post-composer.types";

export function IdentitySection({
  authorMode,
  identity,
  identityMode,
  onAuthorModeChange,
  onIdentityModeChange,
}: {
  authorMode: AuthorMode;
  identity: ComposerIdentityState;
  identityMode: IdentityMode;
  onAuthorModeChange: (mode: AuthorMode) => void;
  onIdentityModeChange: (mode: IdentityMode) => void;
}) {
  const { locale } = useUiLocale();
  const copy = getLocaleMessages(locale, "routes").createPost;
  const handleLabel = identity.publicHandle ?? "@handle";
  const anonymousLabel = identity.anonymousLabel ?? "anon_club";
  const agentLabel = identity.agentLabel ?? "Agent";
  const headingDescription = authorMode === "agent"
    ? agentLabel
    : identityMode === "anonymous"
    ? anonymousLabel
    : handleLabel;

  return (
    <section className="space-y-3 rounded-[var(--radius-lg)] border border-border-soft bg-card px-4 py-4">
      <FormSectionHeading
        description={headingDescription}
        title={copy.sections.postAs}
      />
      {identity.agentLabel ? (
        <div className="flex items-start gap-3 rounded-[var(--radius-lg)] border border-border-soft bg-background px-4 py-3">
          <Checkbox
            checked={authorMode === "agent"}
            className="mt-0.5"
            id="post-as-agent"
            onCheckedChange={(next) => onAuthorModeChange(next === true ? "agent" : "human")}
          />
          <div className="space-y-1">
            <Label htmlFor="post-as-agent">Post as agent</Label>
          </div>
        </div>
      ) : null}
      {identity.allowAnonymousIdentity && authorMode !== "agent" ? (
        <div className="flex items-start gap-3 rounded-[var(--radius-lg)] border border-border-soft bg-background px-4 py-3">
          <Checkbox
            checked={identityMode === "anonymous"}
            className="mt-0.5"
            id="post-anonymously"
            onCheckedChange={(next) => onIdentityModeChange(next === true ? "anonymous" : "public")}
          />
          <div className="space-y-1">
            <Label htmlFor="post-anonymously">{copy.identity.postAnonymously}</Label>
          </div>
        </div>
      ) : null}
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
  const { locale } = useUiLocale();
  const copy = getLocaleMessages(locale, "routes").createPost;
  const availableQualifiers = (identity.availableQualifiers ?? []).filter(
    (qualifier) => !qualifier.suppressedByClubGate,
  );
  const activeQualifiers = availableQualifiers.filter((qualifier) =>
    selectedQualifierIds.includes(qualifier.qualifierId),
  );
  const helpText =
    identity.helpText ??
    copy.identity.qualifiersHelp;

  return (
    <section className="space-y-3 rounded-[var(--radius-lg)] border border-border-soft bg-card px-4 py-4">
      <FormSectionHeading description={helpText} title={copy.sections.qualifiers} />

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
                      aria-label={copy.identity.searchQualifiers}
                      placeholder={activeQualifiers.length > 0 ? copy.identity.searchQualifiers : copy.identity.addQualifiers}
                    />
                  </>
                )}
              </ComboboxValue>
            </ComboboxChips>
            <ComboboxContent>
              <ComboboxEmpty>{copy.empty.noQualifiers}</ComboboxEmpty>
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
          {copy.empty.noOptionalQualifiers}
        </div>
      ) : null}
    </section>
  );
}
