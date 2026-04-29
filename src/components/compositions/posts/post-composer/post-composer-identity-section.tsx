import * as React from "react";

import {
  Combobox,
  ComboboxContent,
  ComboboxEmpty,
  ComboboxItem,
  ComboboxList,
  ComboboxTrigger,
} from "@/components/primitives/combobox";
import { useUiLocale } from "@/lib/ui-locale";
import { getLocaleMessages } from "@/locales";
import type {
  AuthorMode,
  ComposerIdentityState,
  IdentityMode,
} from "./post-composer.types";
import { IdentitySelect, type IdentityOption } from "./post-composer-identity-select";
import { Type } from "@/components/primitives/type";

export function IdentitySection({
  authorMode,
  className,
  controlClassName,
  hideLabel,
  identity,
  identityMode,
  onAuthorModeChange,
  onIdentityModeChange,
  postAsLabel,
  size,
  triggerClassName,
}: {
  authorMode: AuthorMode;
  className?: string;
  controlClassName?: string;
  hideLabel?: boolean;
  identity: ComposerIdentityState;
  identityMode: IdentityMode;
  onAuthorModeChange: (mode: AuthorMode) => void;
  onIdentityModeChange: (mode: IdentityMode) => void;
  postAsLabel?: string;
  size?: "default" | "lg";
  triggerClassName?: string;
}) {
  const { locale } = useUiLocale();
  const copy = getLocaleMessages(locale, "routes").createPost;
  const currentOption: IdentityOption = authorMode === "agent" ? "agent" : identityMode;
  const label = postAsLabel ?? copy.sections.postAs;

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
      className={className}
      controlClassName={controlClassName}
      hideLabel={hideLabel}
      identity={identity}
      postAsLabel={label}
      size={size}
      triggerClassName={triggerClassName}
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

  return (
    <section className="rounded-[var(--radius-lg)] border border-border-soft bg-card p-3">
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
        <Type as="div" variant="caption" className="rounded-[var(--radius-lg)] border border-dashed border-border-soft px-4 py-4 ">
          {copy.empty.noOptionalQualifiers}
        </Type>
      ) : null}
    </section>
  );
}
