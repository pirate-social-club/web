import { Show } from "solid-js";

import {
  IconCheckCircle,
  IconClock,
  IconInfo,
  IconWarningCircle,
} from "../../../design-system";
import { cn } from "../../../lib/cn";
import { postCardType } from "./styles";
import type { StoryLicenseNotice, StoryRegistrationStatus } from "./types";

const statusClassName: Record<StoryRegistrationStatus["state"], string> = {
  registered: "border-success/20 bg-success/10 text-success",
  pending: "border-warning/25 bg-warning/10 text-warning",
  failed: "border-destructive/20 bg-destructive/10 text-destructive",
};

const descriptionClassName: Record<StoryRegistrationStatus["state"], string> = {
  registered: "text-success/90",
  pending: "text-warning/90",
  failed: "text-destructive/90",
};

function StoryRegistrationIcon(props: { state: StoryRegistrationStatus["state"] }) {
  if (props.state === "registered") {
    return <IconCheckCircle aria-hidden="true" class="mt-0.5 size-4 shrink-0" />;
  }
  if (props.state === "pending") {
    return <IconClock aria-hidden="true" class="mt-0.5 size-4 shrink-0" />;
  }
  return <IconWarningCircle aria-hidden="true" class="mt-0.5 size-4 shrink-0" />;
}

export function StoryRegistrationBadge(props: {
  class?: string;
  status?: StoryRegistrationStatus;
}) {
  return (
    <Show when={props.status && props.status.state !== "registered" ? props.status : null}>
      {(status) => (
        <div
          class={cn(
            "inline-flex max-w-full items-start gap-2 rounded-lg border px-3 py-2 text-start",
            statusClassName[status().state],
            props.class,
          )}
        >
          <StoryRegistrationIcon state={status().state} />
          <span class="min-w-0">
            <span class={cn("block font-medium", postCardType.label)}>
              {status().label}
            </span>
            <Show when={status().description}>
              <span class={cn("block", postCardType.meta, descriptionClassName[status().state])}>
                {status().description}
              </span>
            </Show>
          </span>
        </div>
      )}
    </Show>
  );
}

export function StoryLicenseNoticeBadge(props: {
  class?: string;
  notice?: StoryLicenseNotice;
}) {
  return (
    <Show when={props.notice}>
      {(notice) => (
        <div
          class={cn(
            "inline-flex max-w-full items-start gap-2 rounded-lg border border-warning/25 bg-warning/10 px-3 py-2 text-start text-warning",
            props.class,
          )}
        >
          <IconInfo aria-hidden="true" class="mt-0.5 size-4 shrink-0" />
          <span class="min-w-0">
            <span class={cn("block font-medium", postCardType.label)}>
              {notice().label}
            </span>
            <Show when={notice().description}>
              <span class={cn("block text-warning/90", postCardType.meta)}>
                {notice().description}
              </span>
            </Show>
          </span>
        </div>
      )}
    </Show>
  );
}
