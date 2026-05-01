"use client";

import { Button } from "@/components/primitives/button";
import { cn } from "@/lib/utils";

import type { CreateCommunityComposerController } from "./use-create-community-composer-controller";

export function CreateCommunityFooterActions({
  controller,
}: {
  controller: CreateCommunityComposerController;
}) {
  const { copy, footer, isMobile } = controller;

  return (
    <div className={cn("flex gap-3", isMobile && "w-full justify-end")}>
      {footer.activeStep > 1 ? (
        <Button className={cn(isMobile && "shrink-0")} onClick={footer.handleBack} variant="secondary">
          {copy.back}
        </Button>
      ) : null}
      {footer.activeStep < 3 ? (
        <Button
          aria-label={footer.nextDisabledReason ? `${copy.next}: ${footer.nextDisabledReason}` : copy.next}
          className={cn(isMobile && "flex-1")}
          data-disabled-reason={footer.nextDisabledReason ?? undefined}
          disabled={!footer.canProceed}
          onClick={footer.handleNext}
          title={footer.nextDisabledReason ?? undefined}
        >
          {copy.next}
        </Button>
      ) : (
        <Button className={cn(isMobile && "flex-1")} disabled={!footer.canCreateCommunity} loading={footer.submitting} onClick={footer.handleCreate}>
          {copy.createCommunityAction}
        </Button>
      )}
    </div>
  );
}
