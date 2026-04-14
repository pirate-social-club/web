"use client";

import * as React from "react";
import {
  ArrowRight,
  ArrowsClockwise,
  Spinner,
} from "@phosphor-icons/react";

import { Button } from "@/components/primitives/button";
import { Card, CardContent } from "@/components/primitives/card";
import { CopyField } from "@/components/primitives/copy-field";
import { FormFieldLabel, FormNote } from "@/components/primitives/form-layout";
import { Input } from "@/components/primitives/input";
import { Stepper } from "@/components/primitives/stepper";

import type {
  ImportJobState,
  OnboardingPhase,
  OnboardingRedditBootstrapProps,
  RedditVerificationState,
  SuggestedCommunity,
} from "./onboarding-reddit-bootstrap.types";

const STEPS = [
  { label: "Import karma" },
  { label: "Choose name" },
  { label: "Suggested communities" },
];

function extractVerificationCode(hint: string | undefined): string | null {
  if (!hint) return null;
  const match = hint.match(/`([^`]+)`/);
  if (match?.[1]) {
    return match[1];
  }
  return hint.trim() || null;
}

function formatLastChecked(value: string | undefined): string | null {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return new Intl.DateTimeFormat(undefined, {
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
  }).format(date);
}

function phaseToStep(phase: OnboardingPhase): number {
  switch (phase) {
    case "import_karma": return 1;
    case "choose_name": return 2;
    case "suggested_communities": return 3;
  }
}

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

function ImportKarmaPhase({
  busy = false,
  phaseError,
  reddit,
  importJob,
  canSkip,
  nextLabel,
  skipLabel,
  onNext,
  onSkip,
  onUsernameChange,
}: {
  busy?: boolean;
  phaseError?: string | null;
  reddit: RedditVerificationState;
  importJob: ImportJobState;
  canSkip: boolean;
  nextLabel?: string;
  skipLabel?: string;
  onNext: () => void;
  onSkip: () => void;
  onUsernameChange?: (value: string) => void;
}) {
  const isVerified = reddit.verificationState === "verified";
  const isChecking = reddit.verificationState === "checking";
  const isFailed = reddit.verificationState === "failed" || reddit.verificationState === "rate_limited";
  const isCodeReady = reddit.verificationState === "code_ready" && reddit.verificationHint;
  const isImporting = importJob.status === "running" || importJob.status === "queued";
  const isImportDone = importJob.status === "succeeded" || importJob.status === "partial_success";
  const verificationCode = extractVerificationCode(reddit.verificationHint);
  const lastCheckedLabel = formatLastChecked(reddit.lastCheckedAt);
  const resolvedNextLabel = isImportDone
    ? "Continue"
    : isVerified
      ? "Import karma"
      : isCodeReady
        ? "Check again"
        : "Get code";

  const canNext =
    !busy && (
      (reddit.verificationState === "not_started" && reddit.usernameValue.trim().length > 0)
      || isCodeReady
      || isImportDone
    )

  return (
    <div className="space-y-6">
      {!isVerified && (
        <div className="space-y-2">
          <FormFieldLabel label="Reddit username" />
          <div className="relative">
            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-base text-muted-foreground">u/</span>
            <Input
              className="pl-8"
              disabled={busy || !!isCodeReady || isChecking}
              onChange={(e) => onUsernameChange?.(e.target.value)}
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
          <FormNote>
            Add this code to your Reddit profile Description:
            {" "}
            <a
              className="underline underline-offset-4"
              href="https://www.reddit.com/settings/profile"
              rel="noreferrer"
              target="_blank"
            >
              reddit.com/settings/profile
            </a>
          </FormNote>
          <CopyField value={verificationCode ?? reddit.verificationHint} />
          <FormNote tone="default">
            {busy
              ? "Checking Reddit now..."
              : lastCheckedLabel
                ? `Checked Reddit at ${lastCheckedLabel}. The code is not visible yet. Save your profile, wait a few seconds, then click Check again.`
                : "After saving your Reddit profile Description, wait a few seconds and click Check again."}
          </FormNote>
        </div>
      ) : null}

      {isFailed && reddit.errorTitle ? (
        <FormNote tone="warning">{reddit.errorTitle}</FormNote>
      ) : null}

      {phaseError ? (
        <FormNote tone="warning">{phaseError}</FormNote>
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
        nextDisabled={!canNext}
        nextLabel={nextLabel ?? resolvedNextLabel}
        nextLoading={busy || isChecking}
        onNext={onNext}
        onSkip={!busy && canSkip ? onSkip : undefined}
        skipLabel={skipLabel}
      />
    </div>
  );
}

function ChooseNamePhase({
  busy = false,
  phaseError,
  handleSuggestion,
  nextLabel,
  onGenerateHandle,
  handleValue,
  onHandleChange,
  onContinue,
}: {
  busy?: boolean;
  phaseError?: string | null;
  handleSuggestion?: { suggestedLabel: string; availability: string };
  nextLabel?: string;
  onGenerateHandle: () => void;
  handleValue: string;
  onHandleChange: (value: string) => void;
  onContinue: () => void;
}) {
  const displayValue = handleValue.endsWith(".pirate")
    ? handleValue.slice(0, -7)
    : handleValue;
  const canContinue = displayValue.trim().length > 0;

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <FormFieldLabel label="Handle" />
        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <Input
              className="pr-12 font-mono text-lg"
              onChange={(e) => onHandleChange(e.target.value)}
              placeholder="Choose your handle"
              size="lg"
              value={displayValue}
            />
            <span className="absolute right-4 top-1/2 -translate-y-1/2 font-mono text-lg text-muted-foreground">.pirate</span>
          </div>
          <Button
            aria-label="Generate a new handle"
            className="size-16 shrink-0"
            disabled={busy}
            onClick={onGenerateHandle}
            size="icon"
            variant="secondary"
          >
            <ArrowsClockwise className="size-5" />
          </Button>
        </div>
      </div>

      {handleSuggestion ? (
        <FormNote>
          {handleSuggestion.availability === "available"
            ? `${handleSuggestion.suggestedLabel}.pirate is available`
            : `${handleSuggestion.suggestedLabel}.pirate is taken`}
        </FormNote>
      ) : null}

      {phaseError ? (
        <FormNote tone="warning">{phaseError}</FormNote>
      ) : null}

      <Footer nextDisabled={!canContinue} nextLabel={nextLabel} nextLoading={busy} onNext={onContinue} />
    </div>
  );
}

function SuggestedCommunitiesPhase({
  busy = false,
  phaseError,
  communities,
  nextLabel,
  skipLabel,
  onContinue,
  onSkip,
}: {
  busy?: boolean;
  phaseError?: string | null;
  communities: SuggestedCommunity[];
  nextLabel?: string;
  skipLabel?: string;
  onContinue: () => void;
  onSkip: () => void;
}) {
  return (
    <div className="space-y-6">
      {communities.length > 0 ? (
        <div className="space-y-3">
          {communities.map((community) => (
            <div
              key={community.communityId}
              className="flex items-center justify-between rounded-full border border-border-soft bg-card px-4 py-3"
            >
              <span className="font-medium text-foreground">{community.name}</span>
              <span className="text-base text-muted-foreground">{community.reason}</span>
            </div>
          ))}
        </div>
      ) : (
        <FormNote>No community suggestions yet. Join some from your feed later.</FormNote>
      )}

      {phaseError ? (
        <FormNote tone="warning">{phaseError}</FormNote>
      ) : null}

      <Footer
        nextLabel={nextLabel}
        nextLoading={busy}
        onNext={onContinue}
        onSkip={onSkip}
        skipLabel={skipLabel}
      />
    </div>
  );
}

export function OnboardingRedditBootstrap({
  generatedHandle,
  canSkip,
  busy = false,
  phaseError = null,
  phase,
  reddit,
  importJob,
  snapshot,
  handleSuggestion,
  actions,
  callbacks,
}: OnboardingRedditBootstrapProps) {
  const currentStep = phaseToStep(phase);

  return (
    <div className="mx-auto w-full max-w-2xl space-y-6">
      <Stepper currentStep={currentStep} steps={STEPS} />

      <Card className="overflow-hidden border-border shadow-none">
        <CardContent className="p-5">
          {phase === "import_karma" ? (
            <ImportKarmaPhase
              busy={busy}
              canSkip={canSkip}
              importJob={importJob}
              nextLabel={actions.primaryLabel}
              onNext={callbacks?.onImportKarmaNext ?? (() => {})}
              onSkip={callbacks?.onImportKarmaSkip ?? (() => {})}
              onUsernameChange={callbacks?.onUsernameChange}
              phaseError={phaseError}
              reddit={reddit}
              skipLabel={actions.tertiaryLabel}
            />
          ) : null}
          {phase === "choose_name" ? (
            <ChooseNamePhase
              busy={busy}
              handleSuggestion={handleSuggestion}
              handleValue={generatedHandle}
              nextLabel={actions.primaryLabel}
              onContinue={callbacks?.onChooseNameContinue ?? (() => {})}
              onGenerateHandle={callbacks?.onGenerateHandle ?? (() => {})}
              onHandleChange={callbacks?.onHandleChange ?? (() => {})}
              phaseError={phaseError}
            />
          ) : null}
          {phase === "suggested_communities" ? (
            <SuggestedCommunitiesPhase
              busy={busy}
              communities={snapshot?.suggestedCommunities ?? []}
              nextLabel={actions.primaryLabel}
              onContinue={callbacks?.onSuggestedCommunitiesContinue ?? (() => {})}
              onSkip={callbacks?.onSuggestedCommunitiesSkip ?? (() => {})}
              phaseError={phaseError}
              skipLabel={actions.tertiaryLabel}
            />
          ) : null}
        </CardContent>
      </Card>
    </div>
  );
}
