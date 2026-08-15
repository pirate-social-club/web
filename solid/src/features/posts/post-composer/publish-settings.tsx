import { Show } from "solid-js";

import { CardContent, Type } from "../../../design-system";
import { cn } from "../../../lib/cn";
import type { PostComposerController } from "./controller";

export function PostComposerPublishSettings(props: { controller: PostComposerController }) {
  const controller = props.controller;
  const identity = () => controller.identity.identityMode === "anonymous"
    ? controller.identity.identity?.anonymousLabel ?? "Pseudonym"
    : controller.identity.identity?.publicHandle ?? "name.pirate";
  const body = () => controller.tabs.activeTab === "image" || controller.tabs.activeTab === "video"
    ? controller.fields.captionValue
    : controller.fields.textBodyValue;

  return (
    <CardContent class={cn("space-y-5 p-5", controller.isMobile() && "px-0 pb-24 pt-1")}>
      <div class="space-y-1">
        <Type as="h2" variant="h3">Post preview</Type>
        <Type as="p" variant="caption" class="text-muted-foreground">
          Review how this post will appear before publishing.
        </Type>
      </div>
      <section class="space-y-3 rounded-[var(--radius-lg)] border border-border-soft bg-card p-4">
        <div class="flex items-center gap-3">
          <div class="grid size-10 place-items-center rounded-full bg-muted text-sm font-semibold text-muted-foreground">
            {identity().slice(0, 2).toUpperCase()}
          </div>
          <div class="min-w-0">
            <Type as="p" variant="body-strong" class="truncate">{identity()}</Type>
            <Type as="p" variant="caption" class="text-muted-foreground">{controller.community.name}</Type>
          </div>
        </div>
        <Show when={controller.fields.titleValue.trim()}>
          <Type as="h3" variant="h3">{controller.fields.titleValue}</Type>
        </Show>
        <Show when={body().trim()}>
          <Type as="p" variant="body" class="whitespace-pre-wrap">{body()}</Type>
        </Show>
        <Show when={controller.tabs.activeTab !== "text"}>
          <Type as="p" variant="caption" class="rounded-md bg-muted px-3 py-2 text-muted-foreground">
            {controller.tabs.labels[controller.tabs.activeTab as keyof typeof controller.tabs.labels] ?? controller.tabs.activeTab} attachment selected
          </Type>
        </Show>
      </section>
      <Show when={controller.audience.state.visibility === "members_only"}>
        <Type as="p" variant="caption" class="text-muted-foreground">Visible to community members only.</Type>
      </Show>
    </CardContent>
  );
}
