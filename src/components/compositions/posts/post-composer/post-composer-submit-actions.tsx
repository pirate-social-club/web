"use client";

import { Button } from "@/components/primitives/button";
import { CardFooter } from "@/components/primitives/card";
import { FormNote } from "@/components/primitives/form-layout";

import { anonymousEligibleTabs } from "./post-composer-config";
import { IdentitySection } from "./post-composer-identity-section";
import { PostComposerAudienceSection } from "./post-composer-sections";
import type { PostComposerController } from "./use-post-composer-controller";

function shouldShowIdentity(controller: PostComposerController) {
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
  const { audience, copy, identity, isMobile, submit, tabs, commerce } = controller;

  if (isMobile) {
    return null;
  }

  return (
    <CardFooter className="flex-wrap justify-between gap-3 border-t border-border-soft p-5">
      <div className="flex flex-wrap items-center gap-3">
        {shouldShowIdentity(controller) && identity.identity ? (
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
  const { audience, copy, identity, isMobile, submit, tabs } = controller;

  if (!isMobile || !submit.mobileEnabled) {
    return null;
  }

  const showIdentity = shouldShowIdentity(controller);

  return (
    <div className="fixed inset-x-0 bottom-0 z-20 border-t border-border-soft bg-background/95 pb-[calc(env(safe-area-inset-bottom)+0.75rem)] pt-3 backdrop-blur-xl">
      <div className="space-y-3 px-4">
        <div className="flex items-center justify-between gap-2">
          {showIdentity && identity.identity ? (
            <IdentitySection
              authorMode={identity.authorMode}
              className="min-w-0 flex-1"
              controlClassName="w-full min-w-0"
              hideLabel
              identity={identity.identity}
              identityMode={identity.identityMode}
              onAuthorModeChange={identity.setAuthorMode}
              onIdentityModeChange={identity.setIdentityMode}
              triggerClassName="h-9 max-w-none w-full px-3 text-sm"
            />
          ) : <div />}
          {tabs.activeTab !== "live" ? (
            <PostComposerAudienceSection
              audience={audience.state}
              className="shrink-0 justify-end"
              copy={copy}
              triggerClassName="h-9 px-3 text-sm"
              updateAudience={audience.update}
            />
          ) : null}
        </div>
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
