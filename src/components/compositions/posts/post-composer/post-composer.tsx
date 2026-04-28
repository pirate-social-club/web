"use client";

import { Type } from "@/components/primitives/type";

import { Card, CardHeader } from "@/components/primitives/card";
import { cn } from "@/lib/utils";

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

  return (
    <div className={cn("w-full space-y-4", isMobile && "space-y-5")}>
      {!isMobile ? <Type as="h1" variant="h1">{copy.title}</Type> : null}

      <div className={cn("flex flex-wrap items-center justify-between gap-3", isMobile && "w-full")}>
        <ShellPill
          avatarSrc={community.avatarSrc}
          className={cn(isMobile && "h-14 w-full justify-between rounded-full border border-border-soft bg-card px-4 py-3")}
          communities={community.items}
          emptyLabel={community.emptyLabel}
          onSelectCommunity={community.onSelect}
          pickerTitle={community.pickerTitle}
        >
          {community.name}
        </ShellPill>
      </div>

      <Card className={cn("overflow-hidden bg-card shadow-none", isMobile && "border-0 bg-transparent overflow-visible")}>
        <CardHeader className={cn("border-b border-border-soft px-0 pb-0 pt-0", isMobile && "border-b-0")}>
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
