"use client";

import * as React from "react";

import { createPortal } from "react-dom";

import { Button } from "@/components/primitives/button";
import { CardFooter } from "@/components/primitives/card";
import { FormNote } from "@/components/primitives/form-layout";

import { anonymousEligibleTabs } from "./post-composer-config";
import {
  canAdvanceComposerWriteStep,
  getNextComposerStep,
  getPreviousComposerStep,
} from "./post-composer-utils";
import type { PostComposerController } from "./use-post-composer-controller";

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
  const { copy, fields, isMobile, media, song, step, submit, tabs } = controller;

  if (isMobile) {
    return null;
  }

  if (step.isWriteStep && tabs.activeTab !== "live") {
    const canAdvanceWrite = canAdvanceComposerWriteStep({
      body: fields.textBodyValue,
      imageUploadPresent: Boolean(media.activeImageUpload),
      linkUrl: fields.linkUrlValue,
      mode: tabs.activeTab,
      songAudioUploadPresent: Boolean(song.state.primaryAudioUpload),
      title: fields.titleValue,
      videoUploadPresent: Boolean(media.videoState.primaryVideoUpload),
    });

    return (
      <CardFooter className="justify-end gap-3 border-t border-border-soft p-5">
        <Button
          disabled={!canAdvanceWrite || submit.disabled}
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
          onClick={() => step.set(getPreviousComposerStep("settings", tabs.activeTab) ?? "write")}
          size="lg"
          variant="outline"
        >
          {copy.actions.back}
        </Button>
        <Button
          disabled={submit.continueDisabled}
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
          onClick={() => step.set("write")}
          size="lg"
          variant="outline"
        >
          {copy.actions.back}
        </Button>
        <Button
          disabled={submit.continueDisabled}
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
          onClick={() => step.set(getPreviousComposerStep("publish", tabs.activeTab) ?? "settings")}
          size="lg"
          variant="outline"
        >
          {copy.actions.back}
        </Button>
      ) : <span />}
      <div className="flex items-center justify-end gap-3 lg:ms-auto">
        {submit.error ? <FormNote tone="warning">{submit.error}</FormNote> : null}
        <Button
          disabled={submit.disabled}
          loading={submit.loading}
          onClick={submit.onSubmit}
          size="lg"
        >
          {publishLabel}
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
  const { copy, fields, isMobile, media, song, step, submit, tabs } = controller;

  if (!isMobile || !submit.mobileEnabled) {
    return null;
  }

  let bar: React.ReactNode = null;

  if (step.isWriteStep && tabs.activeTab !== "live") {
    const canAdvanceWrite = canAdvanceComposerWriteStep({
      body: fields.textBodyValue,
      imageUploadPresent: Boolean(media.activeImageUpload),
      linkUrl: fields.linkUrlValue,
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
            disabled={!canAdvanceWrite || submit.disabled}
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
            <Button
              className="w-full"
              disabled={submit.disabled}
              loading={submit.loading}
              onClick={submit.onSubmit}
              size="lg"
            >
              {publishLabel}
            </Button>
          </div>
        </div>
      </div>
    );
  }

  if (typeof document === "undefined") return bar;

  return createPortal(bar, document.body);
}
