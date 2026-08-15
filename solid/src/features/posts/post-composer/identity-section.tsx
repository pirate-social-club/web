// Qualifier picker for anonymous posting, ported from the React
// post-composer-identity-section.tsx. Difference: the React multi-select
// combobox became a checkbox list — the DS Combobox is single-select, and a
// checklist keeps every qualifier visible without a popup.

import { For, Show } from "solid-js";

import { Checkbox, Label, Type } from "../../../design-system";
import type { ComposerCopy } from "./copy";
import type { ComposerIdentityState } from "./types";

export function QualifierSection(props: {
  copy: ComposerCopy;
  identity: ComposerIdentityState;
  selectedQualifierIds: string[];
  onSelectedQualifierIdsChange: (qualifierIds: string[]) => void;
}) {
  const availableQualifiers = () => (props.identity.availableQualifiers ?? []).filter(
    (qualifier) => !qualifier.suppressedByClubGate,
  );
  const selected = () => new Set(props.selectedQualifierIds);

  return (
    <section class="rounded-[var(--radius-lg)] border border-border-soft bg-card p-3">
      <Show
        when={availableQualifiers().length > 0}
        fallback={
          <Type as="div" variant="caption" class="rounded-[var(--radius-lg)] border border-dashed border-border-soft p-4">
            {props.copy.empty.noOptionalQualifiers}
          </Type>
        }
      >
        <div class="space-y-1" role="group" aria-label={props.copy.identity.addQualifiers}>
          <For each={availableQualifiers()}>
            {(qualifier) => (
              <div class="flex items-center gap-3 rounded-[var(--radius-md)] px-2 py-2">
                <Checkbox
                  checked={selected().has(qualifier.qualifierId)}
                  id={`qualifier-${qualifier.qualifierId}`}
                  onChange={(checked) => {
                    const next = new Set(props.selectedQualifierIds);
                    if (checked === true) {
                      next.add(qualifier.qualifierId);
                    } else {
                      next.delete(qualifier.qualifierId);
                    }
                    props.onSelectedQualifierIdsChange([...next]);
                  }}
                />
                <Label for={`qualifier-${qualifier.qualifierId}`}>
                  <span class="block font-medium text-foreground">{qualifier.label}</span>
                  <Show when={qualifier.description}>
                    <span class="block text-muted-foreground">{qualifier.description}</span>
                  </Show>
                </Label>
              </div>
            )}
          </For>
        </div>
      </Show>
    </section>
  );
}
