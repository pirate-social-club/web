"use client";

import { Button } from "@/components/primitives/button";
import { CardFooter } from "@/components/primitives/card";
import { FormNote } from "@/components/primitives/form-layout";
import { cn } from "@/lib/utils";

import { anonymousEligibleTabs } from "./post-composer-config";
import { IdentitySection } from "./post-composer-identity-section";
import { PostComposerAudienceSection } from "./post-composer-sections";
import type { PostComposerController } from "./use-post-composer-controller";

export function PostComposerDesktopFooter({
  controller,
}: {
  controller: PostComposerController;
}) {
  const { audience, copy, identity, isMobile, submit, tabs, commerce } = controller;

  return (
    <CardFooter className={cn("flex-wrap justify-between gap-3 border-t border-border-soft p-5", isMobile && "border-t-0 px-0 pb-0 pt-3")}>
      <div className="flex flex-wrap items-center gap-3">
        {(Boolean(identity.identity?.agentLabel) || (Boolean(identity.identity?.allowAnonymousIdentity) && anonymousEligibleTabs.includes(tabs.activeTab) && !(tabs.activeTab === "video" && commerce.monetizationState.visible))) && identity.identity ? (
          <IdentitySection
            authorMode={identity.authorMode}
            identity={identity.identity}
            identityMode={identity.identityMode}
            onAuthorModeChange={identity.setAuthorMode}
            onIdentityModeChange={identity.setIdentityMode}
          />
        ) : null}
        {tabs.activeTab !== "live" ? (
          <PostComposerAudienceSection
            audience={audience.state}
            copy={copy}
            updateAudience={audience.update}
          />
        ) : null}
      </div>
      {!isMobile ? (
        <div className="ms-auto flex items-center gap-3">
          {submit.error ? <FormNote tone="warning">{submit.error}</FormNote> : null}
          <Button
            disabled={submit.disabled}
            loading={submit.loading}
            onClick={submit.onSubmit}
            size="lg"
          >
            {submit.label}
          </Button>
        </div>
      ) : null}
    </CardFooter>
  );
}

export function PostComposerMobileSubmitBar({
  controller,
}: {
  controller: PostComposerController;
}) {
  const { isMobile, submit } = controller;

  if (!isMobile || !submit.mobileEnabled) {
    return null;
  }

  return (
    <div className="fixed inset-x-0 bottom-0 z-20 border-t border-border-soft bg-background/95 pb-[calc(env(safe-area-inset-bottom)+0.75rem)] pt-3 backdrop-blur-xl">
      <div className="flex items-center justify-end gap-3 px-4">
        {submit.error ? <FormNote tone="warning">{submit.error}</FormNote> : null}
        <Button
          className="w-full"
          disabled={submit.disabled}
          loading={submit.loading}
          onClick={submit.onSubmit}
          size="lg"
        >
          {submit.label}
        </Button>
      </div>
    </div>
  );
}
