"use client";

import { Type } from "@/components/primitives/type";

import { Card, CardHeader } from "@/components/primitives/card";

import type { PostComposerProps } from "./post-composer.types";
import { ShellPill } from "./post-composer-fields";
import { PostComposerFormBody } from "./post-composer-form-body";
import {
  PostComposerDesktopFooter,
  PostComposerMobileSubmitBar,
} from "./post-composer-submit-actions";
import { PostComposerTabs } from "./post-composer-tabs";
import { usePostComposerController } from "./use-post-composer-controller";

export function PostComposer(props: PostComposerProps) {
  const controller = usePostComposerController(props);
  const { community, copy, isMobile, isRtl, tabs } = controller;

  if (isMobile) {
    return (
      <div className="w-full space-y-5 pb-36">
        <div className="flex w-full flex-wrap items-center justify-between gap-3">
          <ShellPill
            avatarSrc={community.avatarSrc}
            className="h-14 w-full justify-between rounded-full border border-border-soft bg-card px-4 py-3"
            communities={community.items}
            emptyLabel={community.emptyLabel}
            onSelectCommunity={community.onSelect}
            pickerTitle={community.pickerTitle}
          >
            {community.name}
          </ShellPill>
        </div>

        <PostComposerTabs
          activeTab={tabs.activeTab}
          isMobile={isMobile}
          isRtl={isRtl}
          labels={tabs.labels}
          onTabChange={tabs.onTabChange}
          visibleTabs={tabs.visibleTabs}
        />

        <PostComposerFormBody controller={controller} />
        <PostComposerMobileSubmitBar controller={controller} />
      </div>
    );
  }

  return (
    <div className="w-full space-y-4">
      <Type as="h1" variant="h1">{copy.title}</Type>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <ShellPill
          avatarSrc={community.avatarSrc}
          communities={community.items}
          emptyLabel={community.emptyLabel}
          onSelectCommunity={community.onSelect}
          pickerTitle={community.pickerTitle}
        >
          {community.name}
        </ShellPill>
      </div>

      <Card className="overflow-hidden bg-card shadow-none">
        <CardHeader className="border-b border-border-soft px-0 pb-0 pt-0">
          <PostComposerTabs
            activeTab={tabs.activeTab}
            isMobile={isMobile}
            isRtl={isRtl}
            labels={tabs.labels}
            onTabChange={tabs.onTabChange}
            visibleTabs={tabs.visibleTabs}
          />
        </CardHeader>

        <PostComposerFormBody controller={controller} />
        <PostComposerDesktopFooter controller={controller} />
      </Card>

      <PostComposerMobileSubmitBar controller={controller} />
    </div>
  );
}
