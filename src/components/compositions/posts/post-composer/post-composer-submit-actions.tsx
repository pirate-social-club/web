"use client";

import * as React from "react";

import { createPortal } from "react-dom";

import { Button } from "@/components/primitives/button";
import { CardFooter } from "@/components/primitives/card";
import { FormNote } from "@/components/primitives/form-layout";
import { logger } from "@/lib/logger";
import type { SubmitProgress } from "./post-composer.types";

import { anonymousEligibleTabs } from "./post-composer-config";
import {
  canAdvanceComposerWriteStep,
  getNextComposerStep,
  getPreviousComposerStep,
} from "./post-composer-utils";
import type { PostComposerController } from "./use-post-composer-controller";

// Fraction (0–1) to fill the progress bar for multi-step flows, or null when the
// flow can't be measured (single-slow-step activity flows over `fetch`, which has
// no byte-progress) — in that case the bar animates indeterminately instead.
// A byte-percentage detail (e.g. video upload "63%") interpolates within the
// current step so the longest stage advances smoothly rather than jumping.
function submitProgressFraction(progress: SubmitProgress): number | null {
  if (progress.display !== "pipeline") return null;
  const total = Math.max(progress.totalSteps, 1);
  const reached = Math.min(Math.max(progress.currentIndex, 0), total);
  const pctMatch = progress.detail?.match(/^(\d+(?:\.\d+)?)%$/);
  if (pctMatch) {
    const within = Math.min(Math.max(Number(pctMatch[1]) / 100, 0), 1);
    return ((reached - 1) + within) / total;
  }
  return reached / total;
}

// Progress strip pinned to the container's top border. Rendered as a separate
// element (not inside the fixed-height button) so it never causes layout shift.
// Determinate fill for multi-step flows; indeterminate sweep when unmeasurable.
function SubmitProgressBar({
  progress,
  loading,
}: {
  progress: SubmitProgress | null | undefined;
  loading: boolean;
}) {
  if (!loading || !progress || progress.phase === "done") return null;
  const fraction = submitProgressFraction(progress);

  return (
    <div
      aria-hidden
      className="pointer-events-none absolute inset-x-0 top-0 h-0.5 overflow-hidden"
    >
      {fraction == null ? (
        <div className="absolute inset-y-0 animate-submit-progress-indeterminate rounded-full bg-primary" />
      ) : (
        <div
          className="absolute inset-y-0 left-0 rounded-full bg-primary transition-[width] duration-500 ease-out"
          style={{ width: `${Math.round(fraction * 100)}%` }}
        />
      )}
    </div>
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
    <CardFooter className="relative justify-between gap-3 border-t border-border-soft p-5">
      <SubmitProgressBar loading={submit.loading} progress={submit.progress} />
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
        <Button
          className="min-w-40 justify-center"
          disabled={submit.disabled || submit.progress?.phase === "done"}
          key="publish"
          loading={submit.loading && submit.progress?.phase !== "done"}
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
          {submitButtonContent(submit.progress, publishLabel)}
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
        <SubmitProgressBar loading={submit.loading} progress={submit.progress} />
        <div className="space-y-3 px-4">
          {submit.error ? <FormNote tone="warning">{submit.error}</FormNote> : null}
          <div>
            <Button
              className="w-full"
              disabled={submit.disabled || submit.progress?.phase === "done"}
              loading={submit.loading && submit.progress?.phase !== "done"}
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
              {submitButtonContent(submit.progress, publishLabel)}
            </Button>
          </div>
        </div>
      </div>
    );
  }

  if (typeof document === "undefined") return bar;

  return createPortal(bar, document.body);
}
