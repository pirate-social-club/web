import { Show } from "solid-js";
import { createPostComposerController } from "./controller";
import type { PostComposerProps } from "./types";
import { Card, createIsMobile, Type } from "../../../design-system";
import { cn } from "../../../design-system";
import { ShellPill } from "./fields";
import { PostComposerDetailsStep } from "./details-step";
import { PostComposerPublishSettings } from "./publish-settings";
import { PostComposerSettingsHub } from "./settings-hub";
import { PostComposerDesktopFooter, PostComposerMobileSubmitBar } from "./submit-actions";
import { PostComposerWriteStep } from "./write-step";

export function PostComposer(props: PostComposerProps) {
  const controller = createPostComposerController(props, { isMobile: createIsMobile() });
  const heading = () => controller.step.isWriteStep
    ? "Create post"
    : controller.step.isDetailsStep
      ? "Post details"
      : controller.step.isSettingsStep
        ? "Post settings"
        : "Post preview";

  const content = () => controller.step.isWriteStep
    ? <PostComposerWriteStep controller={controller} />
    : controller.step.isDetailsStep
      ? <PostComposerDetailsStep controller={controller} />
      : controller.step.isSettingsStep
        ? <PostComposerSettingsHub controller={controller} />
        : <PostComposerPublishSettings controller={controller} />;

  return (
    <div class={cn("w-full space-y-4 pt-2", controller.isMobile() && "space-y-7 pt-0")}>
      <ShowMobileHeader controller={controller} heading={heading()} />
      <ShowDesktopHeader controller={controller} heading={heading()} />
      <Show when={!controller.isMobile()} fallback={content()}>
        <Card class="overflow-hidden bg-card shadow-none">
          {content()}
          <PostComposerDesktopFooter controller={controller} />
        </Card>
      </Show>
      <PostComposerMobileSubmitBar controller={controller} />
    </div>
  );
}

function ShowMobileHeader(props: { controller: ReturnType<typeof createPostComposerController>; heading: string }) {
  return (
    <Show when={props.controller.isMobile()}>
      <div class="flex w-full flex-wrap items-center justify-between gap-3">
        <Type as="h1" variant="h2" class="w-full">{props.heading}</Type>
        <ShellPill
          avatarSrc={props.controller.community.avatarSrc}
          class="w-full"
          communities={props.controller.community.items}
          emptyLabel={props.controller.community.emptyLabel}
          onSelectCommunity={props.controller.community.onSelect}
          pickerSearchPlaceholder={props.controller.community.pickerSearchPlaceholder}
          pickerTitle={props.controller.community.pickerTitle}
        >
          {props.controller.community.name}
        </ShellPill>
      </div>
    </Show>
  );
}

function ShowDesktopHeader(props: { controller: ReturnType<typeof createPostComposerController>; heading: string }) {
  return (
    <Show when={!props.controller.isMobile()}>
      <div class="flex items-center justify-between gap-3">
        <Type as="h1" variant="h2">{props.heading}</Type>
        <Show when={props.controller.step.isWriteStep}>
          <ShellPill
            avatarSrc={props.controller.community.avatarSrc}
            communities={props.controller.community.items}
            emptyLabel={props.controller.community.emptyLabel}
            onSelectCommunity={props.controller.community.onSelect}
            pickerSearchPlaceholder={props.controller.community.pickerSearchPlaceholder}
            pickerTitle={props.controller.community.pickerTitle}
          >
            {props.controller.community.name}
          </ShellPill>
        </Show>
      </div>
    </Show>
  );
}
