"use client";

import * as React from "react";
import {
  ArrowRight,
  Spinner,
} from "@phosphor-icons/react";

import { Button } from "@/components/primitives/button";
import { Card, CardContent } from "@/components/primitives/card";
import { CopyField } from "@/components/primitives/copy-field";
import { FormFieldLabel, FormNote } from "@/components/primitives/form-layout";
import { Input } from "@/components/primitives/input";
import { describeHandleAvailability } from "@/lib/onboarding-flow";

import type {
  ImportJobState,
  OnboardingRedditOptionalProps,
  OnboardingChoosePirateUsernameProps,
  OnboardingCommunitySuggestionsProps,
} from "./onboarding-reddit-bootstrap.types";

function Footer({
  nextLabel,
  skipLabel,
  onSkip,
  nextDisabled,
  nextLoading,
  onNext,
}: {
  nextLabel?: string;
  skipLabel?: string;
  onSkip?: () => void;
  nextDisabled?: boolean;
  nextLoading?: boolean;
  onNext: () => void;
}) {
  return (
    <div className="flex items-center justify-between pt-6">
      {onSkip ? (
        <Button onClick={onSkip} variant="outline">
          {skipLabel ?? "Skip"}
        </Button>
      ) : <div />}
      <Button
        className="max-w-xs flex-1"
        disabled={nextDisabled}
        loading={nextLoading}
        onClick={onNext}
        size="lg"
        trailingIcon={<ArrowRight className="size-5" />}
      >
        {nextLabel ?? "Next"}
      </Button>
    </div>
  );
}

export function OnboardingRedditOptional({
  canSkip,
  reddit,
  importJob,
  actions,
  nextLoading,
  onNext,
  onSkip,
  onUsernameChange,
}: OnboardingRedditOptionalProps) {
  const isVerified = reddit.verificationState === "verified";
  const isChecking = reddit.verificationState === "checking";
  const isCodeReady = reddit.verificationState === "code_ready" && reddit.verificationHint;
  const isImporting = importJob.status === "running" || importJob.status === "queued";
  const isImportDone = importJob.status === "succeeded" || importJob.status === "partial_success";

  const canNext =
    (reddit.verificationState === "not_started" && reddit.usernameValue.trim().length > 0)
    || isCodeReady
    || isImportDone
    || (isVerified && !isImporting);

  return (
    <div className="space-y-6">
      {!isVerified && (
        <div className="space-y-2">
          <FormFieldLabel label="Reddit username" />
          <div className="relative">
            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-base text-muted-foreground">u/</span>
            <Input
              className="pl-8"
              disabled={!!isCodeReady || isChecking}
              onChange={(event) => onUsernameChange?.(event.target.value)}
              placeholder="technohippie"
              size="lg"
              value={reddit.usernameValue}
            />
          </div>
        </div>
      )}

      {isCodeReady && reddit.verificationHint ? (
        <div className="space-y-2">
          <FormFieldLabel label={`Reddit ${reddit.codePlacementSurface ?? "profile"} code`} />
          <CopyField value={reddit.verificationHint} />
        </div>
      ) : null}

      {reddit.errorTitle ? (
        <FormNote>{reddit.errorTitle}</FormNote>
      ) : null}

      {isVerified && !isImportDone && (
        <FormNote>
          {isImporting ? (
            <><Spinner className="mr-2 inline size-4" />Importing...</>
          ) : (
            "Starting import..."
          )}
        </FormNote>
      )}

      <Footer
        nextDisabled={!canNext || nextLoading || isImporting}
        nextLabel={actions.primaryLabel}
        nextLoading={nextLoading ?? (isChecking || isImporting)}
        onNext={onNext ?? (() => {})}
        onSkip={canSkip ? (onSkip ?? (() => {})) : undefined}
        skipLabel={actions.tertiaryLabel}
      />
    </div>
  );
}

export function OnboardingChoosePirateUsername({
  handleValue,
  handleSuggestion,
  actions,
  nextLoading,
  onHandleChange,
  onNext,
}: OnboardingChoosePirateUsernameProps) {
  const initialLabel = handleSuggestion?.suggestedLabel ?? "";
  const [uncontrolledHandleValue, setUncontrolledHandleValue] = React.useState(initialLabel);
  const resolvedHandleValue = handleValue ?? uncontrolledHandleValue;

  React.useEffect(() => {
    if (handleValue == null) {
      setUncontrolledHandleValue(initialLabel);
    }
  }, [handleValue, initialLabel]);

  const displayValue = resolvedHandleValue.endsWith(".pirate")
    ? resolvedHandleValue.slice(0, -7)
    : resolvedHandleValue;

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <FormFieldLabel label="Username" />
        <div className="relative">
          <Input
            className="pr-12 font-mono text-lg"
            onChange={(event) => {
              const nextValue = event.target.value;
              onHandleChange?.(nextValue);
              if (handleValue == null) {
                setUncontrolledHandleValue(nextValue);
              }
            }}
            placeholder="your-name"
            size="lg"
            value={displayValue}
          />
          <span className="absolute right-4 top-1/2 -translate-y-1/2 font-mono text-lg text-muted-foreground">.pirate</span>
        </div>
      </div>

      {handleSuggestion ? (
        <FormNote>
          {handleSuggestion.suggestedLabel}.pirate {describeHandleAvailability(handleSuggestion.availability)}
        </FormNote>
      ) : null}

      <Footer nextLabel={actions.primaryLabel} nextLoading={nextLoading} onNext={onNext ?? (() => {})} />
    </div>
  );
}

export function OnboardingCommunitySuggestions({
  communities,
  actions,
  joinedCommunityIds,
  joiningCommunityId,
  nextLoading,
  onJoinCommunity,
  onNext,
  onSkip,
}: OnboardingCommunitySuggestionsProps) {
  const joinedIds = new Set(joinedCommunityIds ?? []);

  return (
    <div className="space-y-6">
      {communities.length > 0 ? (
        <div className="space-y-3">
          {communities.map((community) => (
            <div
              key={community.communityId}
              className="flex items-center justify-between rounded-full border border-border-soft bg-card px-4 py-3"
            >
              <div className="min-w-0">
                <span className="font-medium text-foreground">{community.name}</span>
                <p className="text-base text-muted-foreground">{community.reason}</p>
              </div>
              {onJoinCommunity ? (
                <Button
                  disabled={joinedIds.has(community.communityId)}
                  loading={joiningCommunityId === community.communityId}
                  onClick={() => onJoinCommunity(community.communityId)}
                  variant={joinedIds.has(community.communityId) ? "outline" : "secondary"}
                >
                  {joinedIds.has(community.communityId) ? "Joined" : "Join"}
                </Button>
              ) : null}
            </div>
          ))}
        </div>
      ) : (
        <FormNote>No community suggestions yet. Join some from your feed later.</FormNote>
      )}

      <Footer
        nextLabel={actions.primaryLabel}
        nextLoading={nextLoading}
        onNext={onNext ?? (() => {})}
        onSkip={onSkip ?? (() => {})}
        skipLabel={actions.tertiaryLabel}
      />
    </div>
  );
}

export function OnboardingRedditBootstrap(
  props: OnboardingRedditOptionalProps,
) {
  return <OnboardingRedditOptional {...props} />;
}
