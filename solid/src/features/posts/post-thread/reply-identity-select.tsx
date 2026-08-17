import { createEffect, createMemo, Show } from "solid-js";

import { FormFieldLabel, ResponsiveOptionSelect, cn } from "../../../design-system";
import type { PostThreadIdentityMode, PostThreadReplyIdentity } from "./types";

export interface ReplyIdentitySelectProps {
  class?: string;
  identity?: PostThreadReplyIdentity;
  label?: string;
  onChange: (mode: PostThreadIdentityMode) => void;
  value: PostThreadIdentityMode;
}

export function ReplyIdentitySelect(props: ReplyIdentitySelectProps) {
  const label = () => props.label ?? "Reply as";
  const options = createMemo(() => [
    { value: "public", label: props.identity?.publicLabel ?? "Public" },
    ...(props.identity?.allowAnonymousIdentity === true
      ? [{ value: "anonymous", label: props.identity.anonymousLabel ?? "Anonymous" }]
      : []),
  ] as const);
  const selected = createMemo(() => options().find((option) => option.value === props.value) ?? options()[0]);

  createEffect(() => selected().value, (selectedValue) => {
    if (selectedValue !== props.value) props.onChange(selectedValue as PostThreadIdentityMode);
  });

  return (
    <Show when={props.identity?.allowAnonymousIdentity === true}>
      <div class={cn("flex min-w-0 items-center gap-2", props.class)}>
        <FormFieldLabel class="shrink-0" label={label()} />
        <ResponsiveOptionSelect
          ariaLabel={label()}
          drawerTitle={label()}
          onValueChange={(value) => props.onChange(value as PostThreadIdentityMode)}
          options={options()}
          triggerClass="h-auto min-w-0 py-1.5"
          triggerContent={<span class="truncate">{selected().label}</span>}
          value={selected().value}
        />
      </div>
    </Show>
  );
}
