
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
import type { ComposerIdentityState } from "./post-composer.types";
import { Type } from "@/components/primitives/type";

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
        <Type as="div" variant="caption" className="rounded-[var(--radius-lg)] border border-dashed border-border-soft p-4 ">
          {copy.empty.noOptionalQualifiers}
        </Type>
      ) : null}
    </section>
  );
}
