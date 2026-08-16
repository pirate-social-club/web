// Submit footer (desktop) + fixed submit bar (mobile), ported from the React
// post-composer-submit-actions.tsx. The DS Button has no `loadingIndicator`
// slot, so the determinate progress ring renders as a leadingIcon and the
// loading spinner path is bypassed; behavior matches React.

import { Show } from "solid-js";
import { Portal } from "@solidjs/web";

import {
  Button,
  CardFooter,
  FormNote,
} from "../../../design-system";
import type { PostComposerController } from "./controller";
import { submitProgressFraction } from "./submit-progress";
import type { SubmitProgress } from "./types";
import {
  canAdvanceComposerWriteStep,
  getNextComposerStep,
  getPreviousComposerStep,
} from "./utils";

// Determinate progress ring rendered inside the publish button in place of the
// indeterminate Spinner while a submit runs. Same geometry as Spinner (24
// viewBox, r=9, stroke 3) so the swap is visually seamless; the arc sweeps from
// 12 o'clock by submitProgressFraction. A small floor keeps it from looking
// empty at the start.
function SubmitProgressRing(props: {
  progress: SubmitProgress;
}) {
  const fraction = () => submitProgressFraction(props.progress);
  const visualFraction = () => Math.max(0.04, Math.min(1, fraction()));
  const radius = 9;
  const circumference = 2 * Math.PI * radius;

  return (
    <span aria-hidden="true" class="inline-flex">
      <svg aria-hidden="true" class="size-5 -rotate-90" fill="none" viewBox="0 0 24 24">
        <circle cx="12" cy="12" opacity="0.25" r={radius} stroke="currentColor" stroke-width="3" />
        <circle
          class="transition-[stroke-dashoffset] duration-300 ease-out"
          cx="12"
          cy="12"
          r={radius}
          stroke="currentColor"
          stroke-dasharray={String(circumference)}
          stroke-dashoffset={String(circumference * (1 - visualFraction()))}
          stroke-linecap="round"
          stroke-width="3"
        />
      </svg>
    </span>
  );
}

function SubmitProgressStatus(props: {
  progress: SubmitProgress | null | undefined;
}) {
  return (
    <Show when={props.progress && props.progress.phase !== "done" ? props.progress : null}>
      {(progress) => (
        <span
          aria-label={progress().label}
          aria-valuemax={100}
          aria-valuemin={0}
          aria-valuenow={Math.round(submitProgressFraction(progress()) * 100)}
          class="sr-only"
          role="progressbar"
        />
      )}
    </Show>
  );
}

// A single constant label carries the button through the whole submit — users
// don't care which internal stage is running; the progress bar conveys
// movement. A constant label also keeps the button width stable.
function submitButtonContent(progress: SubmitProgress | null | undefined, fallback: string): string {
  if (!progress) return fallback;
  if (progress.phase === "done") return progress.label;
  return "Posting...";
}

function canAdvanceWrite(controller: PostComposerController) {
  const { fields, media, primary, song, tabs } = controller;
  return canAdvanceComposerWriteStep({
    body: fields.textBodyValue,
    imageUploadPresent: Boolean(media.activeImageUpload),
    fileUploadPresent: Boolean(controller.generic.file.upload),
    linkUrl: fields.linkUrlValue,
    liveState: primary.liveState,
    mode: tabs.activeTab,
    songAudioUploadPresent: Boolean(song.state.primaryAudioUpload),
    title: fields.titleValue,
    videoUploadPresent: Boolean(media.videoState.primaryVideoUpload),
  });
}

function PublishButton(props: {
  controller: PostComposerController;
  class?: string;
}) {
  const controller = props.controller;
  const submit = controller.submit;
  const publishLabel = () => controller.tabs.activeTab === "live" ? submit.label : controller.copy.actions.publish;
  const showRing = () => Boolean(submit.loading && submit.progress && submit.progress.phase !== "done");

  return (
    <div class="flex min-w-0 flex-1 items-center justify-end gap-3 lg:ms-auto">
      <Show when={submit.error}>
        <FormNote tone="warning">{submit.error}</FormNote>
      </Show>
      <SubmitProgressStatus progress={submit.progress} />
      <Button
        class={props.class ?? "min-w-40 justify-center"}
        disabled={submit.disabled || submit.progress?.phase === "done"}
        leadingIcon={showRing() ? <SubmitProgressRing progress={submit.progress!} /> : undefined}
        loading={submit.loading && !submit.progress}
        onClick={() => submit.onSubmit?.()}
        size="lg"
      >
        {submitButtonContent(submit.loading ? submit.progress : null, publishLabel())}
      </Button>
    </div>
  );
}

export function PostComposerDesktopFooter(props: {
  controller: PostComposerController;
}) {
  const controller = props.controller;
  const { copy, step, submit, tabs } = controller;

  return (
    <Show when={!controller.isMobile()}>
      <Show
        when={!step.isWriteStep}
        fallback={
          <CardFooter class="justify-end gap-3 border-t border-border-soft p-5">
            <Button
              disabled={!canAdvanceWrite(controller)}
              onClick={() => step.set(getNextComposerStep("write", tabs.activeTab))}
              size="lg"
            >
              {copy.actions.continue}
            </Button>
          </CardFooter>
        }
      >
        <Show
          when={step.isPublishStep}
          fallback={
            <CardFooter class="justify-between gap-3 border-t border-border-soft p-5">
              <Button
                onClick={() => step.set(
                  step.isSettingsStep
                    ? getPreviousComposerStep("settings", tabs.activeTab) ?? "write"
                    : "write",
                )}
                size="lg"
                variant="outline"
              >
                {copy.actions.back}
              </Button>
              <Button
                disabled={submit.continueDisabled}
                onClick={() => step.set(step.isSettingsStep ? "publish" : "settings")}
                size="lg"
              >
                {copy.actions.continue}
              </Button>
            </CardFooter>
          }
        >
          <CardFooter class="justify-between gap-3 border-t border-border-soft p-5">
            <Button
              onClick={() => step.set(getPreviousComposerStep("publish", tabs.activeTab) ?? "settings")}
              size="lg"
              variant="outline"
            >
              {copy.actions.back}
            </Button>
            <PublishButton controller={controller} />
          </CardFooter>
        </Show>
      </Show>
    </Show>
  );
}

export function PostComposerMobileSubmitBar(props: {
  controller: PostComposerController;
}) {
  const controller = props.controller;
  const { copy, step, tabs } = controller;

  const bar = () => {
    if (!controller.isMobile() || !controller.submit.mobileEnabled) {
      return null;
    }

    if (step.isWriteStep) {
      return (
        <div class="fixed inset-x-0 bottom-18 z-20 border-t border-border-soft bg-background/95 pb-[calc(env(safe-area-inset-bottom)+0.75rem)] pt-3 backdrop-blur-xl">
          <div class="px-4">
            <Button
              class="w-full"
              disabled={!canAdvanceWrite(controller)}
              onClick={() => step.set(getNextComposerStep("write", tabs.activeTab))}
              size="lg"
            >
              {copy.actions.continue}
            </Button>
          </div>
        </div>
      );
    }

    return (
      <div class="fixed inset-x-0 bottom-0 z-20 border-t border-border-soft bg-background/95 pb-[calc(env(safe-area-inset-bottom)+0.75rem)] pt-3 backdrop-blur-xl">
        <div class="px-4">
          <PublishButton class="w-full" controller={controller} />
        </div>
      </div>
    );
  };

  return (
    <Show when={bar()}>
      {(content) => (
        typeof document === "undefined" ? content() : <Portal>{content()}</Portal>
      )}
    </Show>
  );
}
