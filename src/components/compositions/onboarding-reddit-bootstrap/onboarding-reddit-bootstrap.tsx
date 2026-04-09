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
  SuggestedClub,
} from "./onboarding-reddit-bootstrap.types";

const STEPS = [
  { label: "Import karma" },
  { label: "Choose name" },
  { label: "Suggested clubs" },
];

function phaseToStep(phase: OnboardingPhase): number {
  switch (phase) {
    case "import_karma": return 1;
    case "choose_name": return 2;
    case "suggested_clubs": return 3;
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
  reddit,
  importJob,
  canSkip,
  nextLabel,
  skipLabel,
  onNext,
  onSkip,
}: {
  reddit: RedditVerificationState;
  importJob: ImportJobState;
  canSkip: boolean;
  nextLabel?: string;
  skipLabel?: string;
  onNext: () => void;
  onSkip: () => void;
}) {
  const isVerified = reddit.verificationState === "verified";
  const isChecking = reddit.verificationState === "checking";
  const isFailed = reddit.verificationState === "failed" || reddit.verificationState === "rate_limited";
  const isCodeReady = reddit.verificationState === "code_ready" && reddit.verificationHint;
  const isImporting = importJob.status === "running" || importJob.status === "queued";
  const isImportDone = importJob.status === "succeeded" || importJob.status === "partial_success";

  const canNext =
    (reddit.verificationState === "not_started" && reddit.usernameValue.trim().length > 0)
    || isCodeReady
    || isImportDone;

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
              onChange={() => {}}
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

      {isFailed && reddit.errorTitle ? (
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
        nextDisabled={!canNext}
        nextLabel={nextLabel}
        nextLoading={isChecking}
        onNext={onNext}
        onSkip={canSkip ? onSkip : undefined}
        skipLabel={skipLabel}
      />
    </div>
  );
}

function ChooseNamePhase({
  handleSuggestion,
  nextLabel,
  onGenerateHandle,
  handleValue,
  onHandleChange,
  onContinue,
}: {
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

      <Footer nextLabel={nextLabel} onNext={onContinue} />
    </div>
  );
}

function SuggestedClubsPhase({
  clubs,
  nextLabel,
  skipLabel,
  onContinue,
  onSkip,
}: {
  clubs: SuggestedClub[];
  nextLabel?: string;
  skipLabel?: string;
  onContinue: () => void;
  onSkip: () => void;
}) {
  return (
    <div className="space-y-6">
      {clubs.length > 0 ? (
        <div className="space-y-3">
          {clubs.map((club) => (
            <div
              key={club.clubId}
              className="flex items-center justify-between rounded-full border border-border-soft bg-card px-4 py-3"
            >
              <span className="font-medium text-foreground">{club.name}</span>
              <span className="text-base text-muted-foreground">{club.reason}</span>
            </div>
          ))}
        </div>
      ) : (
        <FormNote>No club suggestions yet. Join some from your feed later.</FormNote>
      )}

      <Footer
        nextLabel={nextLabel}
        onNext={onContinue}
        onSkip={onSkip}
        skipLabel={skipLabel}
      />
    </div>
  );
}

export function OnboardingRedditBootstrap({
  generatedHandle,
  cleanupRenameAvailable,
  canSkip,
  canContinue,
  phase,
  reddit,
  importJob,
  snapshot,
  handleSuggestion,
  actions,
}: OnboardingRedditBootstrapProps) {
  void cleanupRenameAvailable;
  void canContinue;

  const currentStep = phaseToStep(phase);

  return (
    <div className="mx-auto w-full max-w-2xl space-y-6">
      <Stepper currentStep={currentStep} steps={STEPS} />

      <Card className="overflow-hidden border-border shadow-none">
        <CardContent className="p-5">
          {phase === "import_karma" ? (
            <ImportKarmaPhase
              canSkip={canSkip}
              importJob={importJob}
              nextLabel={actions.primaryLabel}
              onNext={() => {}}
              onSkip={() => {}}
              reddit={reddit}
              skipLabel={actions.tertiaryLabel}
            />
          ) : null}
          {phase === "choose_name" ? (
            <ChooseNamePhase
              handleSuggestion={handleSuggestion}
              handleValue={generatedHandle}
              nextLabel={actions.primaryLabel}
              onContinue={() => {}}
              onGenerateHandle={() => {}}
              onHandleChange={() => {}}
            />
          ) : null}
          {phase === "suggested_clubs" ? (
            <SuggestedClubsPhase
              clubs={snapshot?.suggestedClubs ?? []}
              nextLabel={actions.primaryLabel}
              onContinue={() => {}}
              onSkip={() => {}}
              skipLabel={actions.tertiaryLabel}
            />
          ) : null}
        </CardContent>
      </Card>
    </div>
  );
}
