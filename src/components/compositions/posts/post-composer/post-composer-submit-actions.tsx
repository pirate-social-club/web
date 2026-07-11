"use client";

import * as React from "react";

import { createPortal } from "react-dom";

import { Button } from "@/components/primitives/button";
import { CardFooter } from "@/components/primitives/card";
import { FormNote } from "@/components/primitives/form-layout";
import { logger } from "@/lib/logger";
import type { SubmitProgress } from "./post-composer.types";

import { anonymousEligibleTabs } from "./post-composer-config";
import { submitProgressFraction } from "./submit-progress-fraction";
import {
  canAdvanceComposerWriteStep,
  getNextComposerStep,
  getPreviousComposerStep,
} from "./post-composer-utils";
import type { PostComposerController } from "./use-post-composer-controller";

// Determinate progress ring rendered inside the publish button in place of the
// indeterminate Spinner while a submit runs. Same geometry as Spinner (24
// viewBox, r=9, stroke 3) so the swap is visually seamless; the arc sweeps from
// 12 o'clock by submitProgressFraction. A small floor keeps it from looking
// empty at the start.
function SubmitProgressRing({
  progress,
}: {
  progress: SubmitProgress;
}) {
  const fraction = submitProgressFraction(progress);
  const visualFraction = Math.max(0.04, Math.min(1, fraction));
  const radius = 9;
  const circumference = 2 * Math.PI * radius;

  return (
    <span aria-hidden className="inline-flex">
      <svg aria-hidden className="size-5 -rotate-90" fill="none" viewBox="0 0 24 24">
        <circle cx="12" cy="12" opacity="0.25" r={radius} stroke="currentColor" strokeWidth="3" />
        <circle
          className="transition-[stroke-dashoffset] duration-300 ease-out"
          cx="12"
          cy="12"
          r={radius}
          stroke="currentColor"
          strokeDasharray={circumference}
          strokeDashoffset={circumference * (1 - visualFraction)}
          strokeLinecap="round"
          strokeWidth="3"
        />
      </svg>
    </span>
  );
}

function submitLoadingIndicator(
  progress: SubmitProgress | null | undefined,
): React.ReactNode {
  if (!progress || progress.phase === "done") return undefined;
  return <SubmitProgressRing progress={progress} />;
}

function SubmitProgressStatus({
  progress,
}: {
  progress: SubmitProgress | null | undefined;
}) {
  if (!progress || progress.phase === "done") return null;
  const percent = Math.round(submitProgressFraction(progress) * 100);

  return (
    <span
      aria-label={progress.label}
      aria-valuemax={100}
      aria-valuemin={0}
      aria-valuenow={percent}
      className="sr-only"
      role="progressbar"
    />
  );
}

// A single constant label carries the button through the whole submit — users don't
// care which internal stage is running ("checking rights" vs "checking
// registration"); the progress bar conveys movement. A constant label also keeps
// the button width stable instead of resizing between stages.
function submitButtonContent(
  progress: SubmitProgress | null | undefined,
  fallback: string,
): React.ReactNode {
  if (!progress) return fallback;
  if (progress.phase === "done") return progress.label;
  return "Posting...";
}

export function shouldShowIdentity(controller: PostComposerController) {
  const { commerce, identity, tabs } = controller;

  if (!identity.identity) {
    return false;
  }

  return (
    Boolean(identity.identity.agentLabel)
    || (
      Boolean(identity.identity.allowAnonymousIdentity)
      && anonymousEligibleTabs.includes(tabs.activeTab)
      && !(tabs.activeTab === "video" && commerce.monetizationState.visible)
    )
  );
}

export function PostComposerDesktopFooter({
  controller,
}: {
  controller: PostComposerController;
}) {
  const { copy, fields, isMobile, media, primary, song, step, submit, tabs } = controller;

  if (isMobile) {
    return null;
  }

  if (step.isWriteStep) {
    const canAdvanceWrite = canAdvanceComposerWriteStep({
      body: fields.textBodyValue,
      imageUploadPresent: Boolean(media.activeImageUpload),
      linkUrl: fields.linkUrlValue,
      liveState: primary.liveState,
      mode: tabs.activeTab,
      songAudioUploadPresent: Boolean(song.state.primaryAudioUpload),
      title: fields.titleValue,
      videoUploadPresent: Boolean(media.videoState.primaryVideoUpload),
    });

    return (
      <CardFooter className="justify-end gap-3 border-t border-border-soft p-5">
        <Button
          disabled={!canAdvanceWrite}
          key="continue"
          onClick={() => step.set(getNextComposerStep("write", tabs.activeTab))}
          size="lg"
        >
          {copy.actions.continue}
        </Button>
      </CardFooter>
    );
  }

  if (step.isSettingsStep) {
    return (
      <CardFooter className="justify-between gap-3 border-t border-border-soft p-5">
        <Button
          key="back"
          onClick={() => step.set(getPreviousComposerStep("settings", tabs.activeTab) ?? "write")}
          size="lg"
          variant="outline"
        >
          {copy.actions.back}
        </Button>
        <Button
          disabled={submit.continueDisabled}
          key="continue"
          onClick={() => step.set("publish")}
          size="lg"
        >
          {copy.actions.continue}
        </Button>
      </CardFooter>
    );
  }

  if (step.isDetailsStep) {
    return (
      <CardFooter className="justify-between gap-3 border-t border-border-soft p-5">
        <Button
          key="back"
          onClick={() => step.set("write")}
          size="lg"
          variant="outline"
        >
          {copy.actions.back}
        </Button>
        <Button
          disabled={submit.continueDisabled}
          key="continue"
          onClick={() => step.set("settings")}
          size="lg"
        >
          {copy.actions.continue}
        </Button>
      </CardFooter>
    );
  }

  const publishLabel = tabs.activeTab === "live" ? submit.label : copy.actions.publish;

  return (
    <CardFooter className="justify-between gap-3 border-t border-border-soft p-5">
      {step.isPublishStep ? (
        <Button
          key="back"
          onClick={() => step.set(getPreviousComposerStep("publish", tabs.activeTab) ?? "settings")}
          size="lg"
          variant="outline"
        >
          {copy.actions.back}
        </Button>
      ) : <span />}
      <div className="flex min-w-0 flex-1 items-center justify-end gap-3 lg:ms-auto">
        {submit.error ? <FormNote tone="warning">{submit.error}</FormNote> : null}
        <SubmitProgressStatus progress={submit.progress} />
        <Button
          className="min-w-40 justify-center"
          disabled={submit.disabled || submit.progress?.phase === "done"}
          key="publish"
          loading={submit.loading && submit.progress?.phase !== "done"}
          loadingIndicator={submitLoadingIndicator(submit.progress)}
          onClick={() => {
            logger.info("[post-composer] desktop publish button clicked", {
              activeTab: tabs.activeTab,
              disabled: submit.disabled,
              loading: submit.loading,
              step: step.current,
            });
            submit.onSubmit?.();
          }}
          size="lg"
        >
          {submitButtonContent(submit.loading ? submit.progress : null, publishLabel)}
        </Button>
      </div>
    </CardFooter>
  );
}

export function PostComposerMobileSubmitBar({
  controller,
}: {
  controller: PostComposerController;
}) {
  const { copy, fields, isMobile, media, primary, song, step, submit, tabs } = controller;

  if (!isMobile || !submit.mobileEnabled) {
    return null;
  }

  let bar: React.ReactNode = null;

  if (step.isWriteStep) {
    const canAdvanceWrite = canAdvanceComposerWriteStep({
      body: fields.textBodyValue,
      imageUploadPresent: Boolean(media.activeImageUpload),
      linkUrl: fields.linkUrlValue,
      liveState: primary.liveState,
      mode: tabs.activeTab,
      songAudioUploadPresent: Boolean(song.state.primaryAudioUpload),
      title: fields.titleValue,
      videoUploadPresent: Boolean(media.videoState.primaryVideoUpload),
    });

    bar = (
      <div className="fixed inset-x-0 bottom-0 z-20 border-t border-border-soft bg-background/95 pb-[calc(env(safe-area-inset-bottom)+0.75rem)] pt-3 backdrop-blur-xl">
        <div className="px-4">
          <Button
            className="w-full"
            disabled={!canAdvanceWrite}
            onClick={() => step.set(getNextComposerStep("write", tabs.activeTab))}
            size="lg"
          >
            {copy.actions.continue}
          </Button>
        </div>
      </div>
    );
  } else {
    const publishLabel = tabs.activeTab === "live" ? submit.label : copy.actions.publish;

    bar = (
      <div className="fixed inset-x-0 bottom-0 z-20 border-t border-border-soft bg-background/95 pb-[calc(env(safe-area-inset-bottom)+0.75rem)] pt-3 backdrop-blur-xl">
        <div className="space-y-3 px-4">
          {submit.error ? <FormNote tone="warning">{submit.error}</FormNote> : null}
          <div>
            <SubmitProgressStatus progress={submit.progress} />
            <Button
              className="w-full"
              disabled={submit.disabled || submit.progress?.phase === "done"}
              loading={submit.loading && submit.progress?.phase !== "done"}
              loadingIndicator={submitLoadingIndicator(submit.progress)}
              onClick={() => {
                logger.info("[post-composer] mobile publish button clicked", {
                  activeTab: tabs.activeTab,
                  disabled: submit.disabled,
                  loading: submit.loading,
                  step: step.current,
                });
                submit.onSubmit?.();
              }}
              size="lg"
            >
              {submitButtonContent(submit.loading ? submit.progress : null, publishLabel)}
            </Button>
          </div>
        </div>
      </div>
    );
  }

  if (typeof document === "undefined") return bar;

  return createPortal(bar, document.body);
}
