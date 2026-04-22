import * as React from "react";

import {
  Combobox,
  ComboboxContent,
  ComboboxEmpty,
  ComboboxItem,
  ComboboxList,
  ComboboxTrigger,
} from "@/components/primitives/combobox";
import { FormSectionHeading } from "@/components/primitives/form-layout";
import { useUiLocale } from "@/lib/ui-locale";
import { getLocaleMessages } from "@/locales";
import type {
  AuthorMode,
  ComposerIdentityState,
  IdentityMode,
} from "./post-composer.types";
import { IdentitySelect, type IdentityOption } from "./post-composer-identity-select";

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
  const currentOption: IdentityOption = authorMode === "agent" ? "agent" : identityMode;

  function handleChange(option: IdentityOption) {
    if (option === "agent") {
      onAuthorModeChange("agent");
      onIdentityModeChange("public");
    } else {
      onAuthorModeChange("human");
      onIdentityModeChange(option);
    }
  }

  return (
    <IdentitySelect
      identity={identity}
      postAsLabel={copy.sections.postAs}
      value={currentOption}
      onChange={handleChange}
    />
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
          <ComboboxTrigger>
            {activeQualifiers.length === 0
              ? copy.identity.addQualifiers
              : activeQualifiers.map((q) => q.label).join(", ")}
          </ComboboxTrigger>
          <ComboboxContent>
            <ComboboxEmpty>{copy.empty.noQualifiers}</ComboboxEmpty>
            <ComboboxList>
              {(qualifier) => (
                <ComboboxItem key={qualifier.qualifierId} value={qualifier}>
                  {qualifier.label}
                </ComboboxItem>
              )}
            </ComboboxList>
          </ComboboxContent>
        </Combobox>
      ) : null}

      {availableQualifiers.length === 0 ? (
        <div className="rounded-[var(--radius-lg)] border border-dashed border-border-soft px-4 py-4 text-base text-muted-foreground">
          {copy.empty.noOptionalQualifiers}
        </div>
      ) : null}
    </section>
  );
}
