"use client";

import * as React from "react";
import {
  ArrowsClockwise,
  Spinner,
} from "@phosphor-icons/react";

import { Button } from "@/components/primitives/button";
import { Card, CardContent } from "@/components/primitives/card";
import { CopyField } from "@/components/primitives/copy-field";
import { FormFieldLabel, FormNote } from "@/components/primitives/form-layout";
import { Input } from "@/components/primitives/input";
import { resolveLocaleLanguageTag, useUiLocale } from "@/lib/ui-locale";
import { getLocaleMessages } from "@/locales";
import type { RoutesMessages } from "@/locales";

import type {
  ImportJobState,
  OnboardingPhase,
  OnboardingRedditBootstrapProps,
  RedditVerificationState,
} from "./onboarding-reddit-bootstrap.types";

const ONBOARDING_PHASES = [
  "import_karma",
  "choose_name",
] as const satisfies readonly OnboardingPhase[];
type OnboardingCopy = RoutesMessages["onboarding"];

function formatMessage(template: string, replacements: Record<string, string>) {
  return template.replace(/\{(\w+)\}/gu, (_, key: string) => replacements[key] ?? `{${key}}`);
}

function OnboardingProgress({
  currentStep,
  currentLabel,
  progressLabel,
  stepCountLabel,
}: {
  currentStep: number;
  currentLabel: string;
  progressLabel: string;
  stepCountLabel: string;
}) {
  const progress = `${(currentStep / ONBOARDING_PHASES.length) * 100}%`;

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-3 text-base text-muted-foreground">
        <span>{progressLabel}</span>
        <span className="tabular-nums">{stepCountLabel}</span>
      </div>
      <div className="text-lg font-semibold text-foreground">{currentLabel}</div>
      <div className="h-1.5 rounded-full bg-muted">
        <div
          className="h-full rounded-full bg-foreground transition-[width]"
          style={{ width: progress }}
        />
      </div>
    </div>
  );
}

function extractVerificationCode(hint: string | undefined): string | null {
  if (!hint) return null;
  const match = hint.match(/`([^`]+)`/);
  if (match?.[1]) {
    return match[1];
  }
  return hint.trim() || null;
}

function formatLastChecked(value: string | undefined, localeTag: string): string | null {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return new Intl.DateTimeFormat(localeTag, {
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
  }).format(date);
}

function phaseToStep(phase: OnboardingPhase): number {
  return ONBOARDING_PHASES.indexOf(phase) + 1;
}

function Footer({
  nextLabel,
  skipLabel,
  onSkip,
  nextDisabled,
  nextLoading,
  onNext,
  copy,
}: {
  nextLabel?: string;
  skipLabel?: string;
  onSkip?: () => void;
  nextDisabled?: boolean;
  nextLoading?: boolean;
  onNext: () => void;
  copy: OnboardingCopy;
}) {
  return (
    <div className="flex flex-col-reverse gap-3 pt-6 sm:flex-row sm:items-center sm:justify-between">
      {onSkip ? (
        <Button className="w-full sm:w-auto" onClick={onSkip} variant="outline">
          {skipLabel ?? copy.actions.skip}
        </Button>
      ) : <div />}
      <Button
        className="w-full sm:max-w-xs sm:flex-1"
        disabled={nextDisabled}
        loading={nextLoading}
        onClick={onNext}
        size="lg"
      >
        {nextLabel ?? copy.actions.next}
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
  copy,
  localeTag,
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
  copy: OnboardingCopy;
  localeTag: string;
}) {
  const isVerified = reddit.verificationState === "verified";
  const isChecking = reddit.verificationState === "checking";
  const isFailed = reddit.verificationState === "failed" || reddit.verificationState === "rate_limited";
  const isCodeReady = reddit.verificationState === "code_ready" && reddit.verificationHint;
  const isImporting = importJob.status === "running" || importJob.status === "queued";
  const isImportDone = importJob.status === "succeeded" || importJob.status === "partial_success";
  const verificationCode = extractVerificationCode(reddit.verificationHint);
  const lastCheckedLabel = formatLastChecked(reddit.lastCheckedAt, localeTag);
  const resolvedNextLabel = isImportDone
    ? copy.actions.continue
    : isVerified
      ? copy.importKarmaAction
      : isCodeReady
        ? copy.actions.checkAgain
        : copy.actions.getCode;
  const surfaceLabel = copy.surfaces[reddit.codePlacementSurface ?? "profile"];

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
          <FormFieldLabel label={copy.fields.redditUsername} />
          <div className="relative" dir="ltr">
            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-base text-muted-foreground">u/</span>
            <Input
              className="pl-8 text-start"
              disabled={busy || !!isCodeReady || isChecking}
              dir="ltr"
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
          <FormFieldLabel
            label={formatMessage(copy.fields.redditCode, { surface: surfaceLabel })}
          />
          <FormNote>
            {copy.notes.addCodeToProfile}
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
              ? copy.notes.checkingRedditNow
              : lastCheckedLabel
                ? formatMessage(copy.notes.checkedRedditAt, { time: lastCheckedLabel })
                : copy.notes.saveProfileThenCheckAgain}
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
            <><Spinner className="mr-2 inline size-4" />{copy.notes.importing}</>
          ) : (
            copy.notes.startingImport
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
        copy={copy}
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
  copy,
}: {
  busy?: boolean;
  phaseError?: string | null;
  handleSuggestion?: { suggestedLabel: string; availability: string };
  nextLabel?: string;
  onGenerateHandle: () => void;
  handleValue: string;
  onHandleChange: (value: string) => void;
  onContinue: () => void;
  copy: OnboardingCopy;
}) {
  const displayValue = handleValue.endsWith(".pirate")
    ? handleValue.slice(0, -7)
    : handleValue;
  const canContinue = displayValue.trim().length > 0;

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <FormFieldLabel label={copy.fields.handle} />
        <div className="flex items-center gap-2">
          <div className="relative flex-1" dir="ltr">
            <Input
              className="pr-12 text-start font-mono text-lg"
              dir="ltr"
              onChange={(e) => onHandleChange(e.target.value)}
              placeholder={copy.placeholders.handle}
              size="lg"
              value={displayValue}
            />
            <span className="absolute right-4 top-1/2 -translate-y-1/2 font-mono text-lg text-muted-foreground">.pirate</span>
          </div>
          <Button
            aria-label={copy.actions.generateHandle}
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
            ? formatMessage(copy.notes.handleAvailable, { handle: handleSuggestion.suggestedLabel })
            : formatMessage(copy.notes.handleTaken, { handle: handleSuggestion.suggestedLabel })}
        </FormNote>
      ) : null}

      {phaseError ? (
        <FormNote tone="warning">{phaseError}</FormNote>
      ) : null}

      <Footer copy={copy} nextDisabled={!canContinue} nextLabel={nextLabel} nextLoading={busy} onNext={onContinue} />
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
  handleSuggestion,
  actions = {},
  callbacks,
}: OnboardingRedditBootstrapProps) {
  const { locale } = useUiLocale();
  const localeTag = resolveLocaleLanguageTag(locale);
  const copy = getLocaleMessages(locale, "routes").onboarding;
  const currentStep = phaseToStep(phase);
  const numberFormatter = new Intl.NumberFormat(localeTag);
  const stepLabels = [
    copy.importKarmaAction,
    copy.chooseNameAction,
  ];
  const currentLabel = stepLabels[currentStep - 1] ?? "";
  const stepCountLabel = formatMessage(copy.stepCount, {
    current: numberFormatter.format(currentStep),
    total: numberFormatter.format(ONBOARDING_PHASES.length),
  });

  return (
    <div className="mx-auto w-full max-w-2xl space-y-6">
      <OnboardingProgress
        currentLabel={currentLabel}
        currentStep={currentStep}
        progressLabel={copy.progressLabel}
        stepCountLabel={stepCountLabel}
      />

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
              copy={copy}
              localeTag={localeTag}
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
              copy={copy}
            />
          ) : null}
        </CardContent>
      </Card>
    </div>
  );
}
