"use client";

import { Type } from "@/components/primitives/type";

import { Card, CardContent, CardFooter } from "@/components/primitives/card";
import { FormNote } from "@/components/primitives/form-layout";
import { cn } from "@/lib/utils";

import { CreateCommunityAccessStep } from "./create-community-access-step";
import { CreateCommunityBasicsStep } from "./create-community-basics-step";
import { CreateCommunityFooterActions } from "./create-community-footer-actions";
import { CommunityReviewStep } from "./create-community-composer.sections";
import type { CreateCommunityComposerProps } from "./create-community-composer.types";
import { useCreateCommunityComposerController } from "./use-create-community-composer-controller";

export function CreateCommunityComposer(props: CreateCommunityComposerProps) {
  const controller = useCreateCommunityComposerController(props);
  const {
    basics,
    copy,
    creatorVerificationMessage,
    effectiveDefaultAgeGatePolicy,
    isMobile,
    review,
    step,
  } = controller;
  const footerActions = <CreateCommunityFooterActions controller={controller} />;

  return (
    <div className={cn("mx-auto w-full max-w-6xl space-y-4", isMobile && "mx-0 max-w-none space-y-5")}>
      <Type as="h1" variant="h2" className="hidden md:block">
        {step === 1 ? copy.title : step === 2 ? "Community settings" : "Preview"}
      </Type>
      {creatorVerificationMessage ? (
        <div className="rounded-[var(--radius-lg)] border border-warning/20 bg-warning/5 px-4 py-3">
          <Type as="p" variant="body-strong">{copy.verificationRequired}</Type>
          <FormNote className="mt-1">{creatorVerificationMessage}</FormNote>
        </div>
      ) : null}

      <Card className={cn("overflow-hidden border-border bg-card shadow-none", isMobile && "overflow-visible border-0 bg-transparent")}>
        <CardContent className={cn("space-y-8 p-6 md:p-7", isMobile && "space-y-7 p-0")}>
          {step === 1 ? (
            <CreateCommunityBasicsStep controller={controller} />
          ) : null}

          {step === 2 ? (
            <CreateCommunityAccessStep controller={controller} />
          ) : null}

          {step === 3 ? (
            <CommunityReviewStep
              ageGateLabel={effectiveDefaultAgeGatePolicy === "18_plus" ? "18+" : copy.ageGateNoneLabel}
              anonymousPostingLabel={review.anonymousPostingLabel}
              anonymousScopeLabel={review.anonymousScopeLabel}
              avatarLabel={review.avatarLabel}
              bannerLabel={review.bannerLabel}
              copy={copy}
              creatorVerificationMessage={creatorVerificationMessage}
              databaseRegionLabel={review.databaseRegionLabel}
              description={basics.activeDescription}
              displayName={basics.activeDisplayName}
              gateRequirementSummary={review.gateRequirementSummary}
              membershipLabel={review.membershipLabel}
            />
          ) : null}
        </CardContent>

        {!isMobile ? (
          <CardFooter className="justify-end border-t border-border-soft p-5">
            {footerActions}
          </CardFooter>
        ) : null}
      </Card>

      {isMobile ? (
        <div className="fixed inset-x-0 bottom-0 z-20 border-t border-border-soft bg-background/95 pb-[calc(env(safe-area-inset-bottom)+0.75rem)] pt-3 backdrop-blur-xl">
          <div className="flex items-center justify-end gap-3 px-4">
            {footerActions}
          </div>
        </div>
      ) : null}
    </div>
  );
}
