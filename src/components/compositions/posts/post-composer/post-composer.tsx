"use client";

import { Card } from "@/components/primitives/card";
import { Type } from "@/components/primitives/type";

import type { PostComposerProps } from "./post-composer.types";
import { ShellPill } from "./post-composer-fields";
import { PostComposerDetailsStep } from "./post-composer-details-step";
import { PostComposerPublishSettings } from "./post-composer-publish-settings";
import { PostComposerSettingsHub } from "./post-composer-settings-hub";
import {
  PostComposerDesktopFooter,
  PostComposerMobileSubmitBar,
} from "./post-composer-submit-actions";
import { PostComposerWriteStep } from "./post-composer-write-step";
import { usePostComposerController } from "./use-post-composer-controller";

export function PostComposer(props: PostComposerProps) {
  const controller = usePostComposerController(props);
  const { community, isMobile, step } = controller;

  if (isMobile) {
    return (
      <div className="w-full space-y-7">
        {step.isWriteStep ? (
          <>
            <div className="flex w-full flex-wrap items-center justify-between gap-3">
              <ShellPill
                avatarSrc={community.avatarSrc}
                className="w-full"
                communities={community.items}
                emptyLabel={community.emptyLabel}
                onSelectCommunity={community.onSelect}
                pickerSearchPlaceholder={community.pickerSearchPlaceholder}
                pickerTitle={community.pickerTitle}
              >
                {community.name}
              </ShellPill>
            </div>

            <PostComposerWriteStep controller={controller} />
          </>
        ) : step.isDetailsStep ? (
          <PostComposerDetailsStep controller={controller} />
        ) : step.isSettingsStep ? (
          <PostComposerSettingsHub controller={controller} />
        ) : (
          <PostComposerPublishSettings controller={controller} />
        )}
        {step.isPublishStep ? <PostComposerMobileSubmitBar controller={controller} /> : null}
      </div>
    );
  }

  return (
    <div className="w-full space-y-4 pt-2">
      <div className="flex items-center justify-between gap-3">
        <Type as="h1" variant="h2">
          {step.isWriteStep
            ? "Create post"
            : step.isDetailsStep
              ? "Post details"
              : step.isSettingsStep
                ? "Post settings"
                : "Post preview"}
        </Type>
        {step.isWriteStep ? (
          <ShellPill
            avatarSrc={community.avatarSrc}
            communities={community.items}
            emptyLabel={community.emptyLabel}
            onSelectCommunity={community.onSelect}
            pickerSearchPlaceholder={community.pickerSearchPlaceholder}
            pickerTitle={community.pickerTitle}
          >
            {community.name}
          </ShellPill>
        ) : null}
      </div>

      <Card className="overflow-hidden bg-card shadow-none">
        {step.isWriteStep ? (
          <PostComposerWriteStep controller={controller} />
        ) : step.isDetailsStep ? (
          <PostComposerDetailsStep controller={controller} />
        ) : step.isSettingsStep ? (
          <PostComposerSettingsHub controller={controller} />
        ) : (
          <PostComposerPublishSettings controller={controller} />
        )}
        <PostComposerDesktopFooter controller={controller} />
      </Card>
    </div>
  );
}
