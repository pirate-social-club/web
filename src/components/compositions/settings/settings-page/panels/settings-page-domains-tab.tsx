"use client";

import * as React from "react";
import {
  ArrowSquareOut,
  ArrowsClockwise,
  CaretRight,
  Check,
  RedditLogo,
  X,
} from "@phosphor-icons/react";

import { Button } from "@/components/primitives/button";
import { Card, CardContent } from "@/components/primitives/card";
import { CopyField } from "@/components/primitives/copy-field";
import { FormFieldLabel, FormNote } from "@/components/primitives/form-layout";
import { Input } from "@/components/primitives/input";
import { Spinner } from "@/components/primitives/spinner";
import { Type } from "@/components/primitives/type";
import { useUiLocale } from "@/lib/ui-locale";
import { cn } from "@/lib/utils";
import { getLocaleMessages } from "@/locales";
import type { RoutesMessages } from "@/locales";

import type {
  ImportJobState,
  RedditImportSummaryState,
  RedditVerificationState,
  HandleSuggestion,
} from "@/components/compositions/onboarding/reddit-bootstrap/onboarding-reddit-bootstrap.types";

import { SettingsSection } from "./settings-page-panel-primitives";

type OnboardingCopy = RoutesMessages["onboarding"];

export type DomainsTabPhase = "options" | "import_karma" | "choose_name";

export interface DomainsTabProps {
  currentHandle: string;
  handleTier: "generated" | "standard" | "premium";
  redditImportDone: boolean;
  busy?: boolean;
  phaseError?: string | null;
  phase?: DomainsTabPhase;
  redditVerification: RedditVerificationState;
  importJob: ImportJobState;
  redditImportSummary?: RedditImportSummaryState | null;
  generatedHandle?: string;
  handleSuggestion?: HandleSuggestion;
  onPhaseChange?: (phase: DomainsTabPhase) => void;
  onRedditUsernameChange?: (value: string) => void;
  onImportKarmaNext?: () => void;
  onImportKarmaSkip?: () => void;
  onHandleChange?: (value: string) => void;
  onGenerateHandle?: () => void;
  onChooseNameContinue?: () => void;
  onChooseNameBack?: () => void;
}

function formatMessage(template: string, replacements: Record<string, string>) {
  return template.replace(/\{(\w+)\}/gu, (_, key: string) => replacements[key] ?? `{${key}}`);
}

function extractVerificationCode(hint: string | undefined): string | null {
  if (!hint) return null;
  const match = hint.match(/`([^`]+)`/);
  if (match?.[1]) {
    return match[1];
  }
  return hint.trim() || null;
}

function resolveTierLabel(tier: string): string {
  switch (tier) {
    case "generated": return "Auto-generated";
    case "standard": return "Standard";
    case "premium": return "Premium";
    default: return tier;
  }
}

function resolveDomainEligibilityLength(importedScore: number | null | undefined): string {
  if (typeof importedScore === "number" && Number.isFinite(importedScore)) {
    if (importedScore >= 100_000) return "5";
    if (importedScore >= 50_000) return "6";
    if (importedScore >= 10_000) return "7";
  }
  return "8+";
}

function formatCheckedTime(value: string | undefined): string | null {
  if (!value) return null;
  const timestamp = Date.parse(value);
  if (!Number.isFinite(timestamp)) return null;
  return new Date(timestamp).toLocaleTimeString([], {
    hour: "numeric",
    minute: "2-digit",
  });
}

function Footer({
  nextLabel,
  skipLabel,
  skipDisabled,
  onSkip,
  nextDisabled,
  nextLoading,
  onNext,
  copy,
}: {
  nextLabel?: string;
  skipLabel?: string;
  skipDisabled?: boolean;
  onSkip?: () => void;
  nextDisabled?: boolean;
  nextLoading?: boolean;
  onNext: () => void;
  copy: OnboardingCopy;
}) {
  return (
    <div className={onSkip ? "grid gap-3 pt-3 sm:grid-cols-2" : "grid gap-3 pt-3"}>
      {onSkip ? (
        <Button className="h-14 w-full text-lg" disabled={skipDisabled} onClick={onSkip} variant="outline">
          {skipLabel ?? copy.actions.skip}
        </Button>
      ) : null}
      <Button
        className="h-14 w-full text-lg"
        disabled={nextDisabled}
        loading={nextLoading}
        onClick={onNext}
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
}) {
  const isVerified = reddit.verificationState === "verified";
  const isChecking = reddit.verificationState === "checking";
  const isFailed = reddit.verificationState === "failed" || reddit.verificationState === "rate_limited";
  const isCodeReady = reddit.verificationState === "code_ready" && Boolean(reddit.verificationHint);
  const isImporting = importJob.status === "running" || importJob.status === "queued";
  const isImportDone = importJob.status === "succeeded" || importJob.status === "partial_success";
  const showUsernameField = !isCodeReady && (!isVerified || isImporting);
  const verificationCode = extractVerificationCode(reddit.verificationHint);
  const fieldError = phaseError ?? (isFailed ? reddit.errorTitle : null);
  const surfaceLabel = copy.surfaces[reddit.codePlacementSurface ?? "profile"];
  const checkedTime = formatCheckedTime(reddit.lastCheckedAt);
  const checkedNote = checkedTime
    ? formatMessage(
        reddit.failureCode === "different_code_found"
          ? copy.notes.checkedRedditDifferentCode
          : copy.notes.checkedRedditAt,
        { time: checkedTime },
      )
    : null;
  const redditProfileHref = "https://www.reddit.com/settings/profile";

  const canNext =
    !busy && (
      (reddit.verificationState === "not_started" && reddit.usernameValue.trim().length > 0)
      || isCodeReady
      || isImportDone
    );
  const resolvedNextLabel = isImportDone
    ? copy.actions.continue
    : isVerified
      ? copy.importKarmaAction
      : isCodeReady
        ? reddit.lastCheckedAt ? copy.actions.checkAgain : copy.actions.check
        : copy.actions.getCode;
  const headerTitle = isCodeReady
    ? copy.redditImport.title
    : isImportDone
      ? copy.redditImport.doneTitle
      : copy.importKarmaAction;
  const headerSubtitle = isCodeReady
    ? undefined
    : isImportDone
      ? copy.redditImport.doneSubtitle
      : copy.redditImport.subtitle;

  return (
    <div className="space-y-6">
      <div className="space-y-3 text-start">
        <div className="flex items-center gap-3">
          <span
            aria-hidden="true"
            className="grid size-12 shrink-0 place-items-center rounded-full border border-border-soft bg-muted/45 text-foreground"
          >
            <RedditLogo className="size-7" weight="fill" />
          </span>
          <Type as="h2" variant="h2" className="min-w-0 leading-7 sm:leading-8">
            {headerTitle}
          </Type>
        </div>
        {headerSubtitle ? (
          <Type as="p" variant="body" className="w-full max-w-none leading-7 text-muted-foreground sm:text-lg sm:leading-8">
            {headerSubtitle}
          </Type>
        ) : null}
      </div>

      {showUsernameField ? (
        <div className="space-y-2">
          <FormFieldLabel label={copy.fields.redditUsername} />
          <div className="flex h-16 items-center gap-2 rounded-full border border-input bg-background px-5 shadow-sm focus-within:border-border focus-within:ring-1 focus-within:ring-border-soft" dir="ltr">
            <span className="shrink-0 text-base text-muted-foreground">u/</span>
            <Input
              className="h-auto min-w-0 flex-1 rounded-none border-0 bg-transparent px-0 py-0 text-start shadow-none focus-visible:border-transparent focus-visible:ring-0 disabled:opacity-80"
              disabled={busy || isCodeReady || isChecking || isImporting}
              dir="ltr"
              onChange={(e) => onUsernameChange?.(e.target.value)}
              placeholder={copy.placeholders.redditUsername}
              size="lg"
              value={reddit.usernameValue}
            />
          </div>
          {isImporting ? (
            <FormNote>
              <Spinner className="me-2 inline size-4" />
              {copy.notes.importing}
            </FormNote>
          ) : null}
          {!isImporting && fieldError ? (
            <FormNote tone="warning">{fieldError}</FormNote>
          ) : null}
        </div>
      ) : null}

      {isCodeReady && reddit.verificationHint ? (
        <div className="space-y-2">
          <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
            <FormFieldLabel
              label={formatMessage(copy.fields.redditCode, { surface: surfaceLabel })}
            />
            <FormNote>
              {copy.redditImport.pasteIntoProfile}{" "}
              <a
                className="inline-flex items-center gap-1 underline underline-offset-4"
                href={redditProfileHref}
                rel="noreferrer"
                target="_blank"
              >
                {copy.redditImport.redditProfileDescription}
                <ArrowSquareOut className="size-4" />
              </a>
            </FormNote>
          </div>
          <CopyField value={verificationCode ?? reddit.verificationHint} />
          {fieldError ? (
            <FormNote tone="warning">{fieldError}</FormNote>
          ) : null}
          {!fieldError && checkedNote ? (
            <FormNote tone="warning">
              {checkedNote}
            </FormNote>
          ) : null}
        </div>
      ) : null}

      {isVerified && !isImportDone && !isImporting ? (
        <FormNote>{copy.notes.startingImport}</FormNote>
      ) : null}

      <Footer
        nextDisabled={!canNext}
        nextLabel={nextLabel ?? resolvedNextLabel}
        nextLoading={busy || isChecking}
        onNext={onNext}
        onSkip={canSkip ? onSkip : undefined}
        skipDisabled={busy}
        skipLabel={skipLabel}
        copy={copy}
      />
    </div>
  );
}

function ChooseNamePhase({
  busy = false,
  phaseError,
  canGoBack = false,
  handleSuggestion,
  headerSubtitle,
  headerTitle,
  backLabel,
  nextLabel,
  onBack,
  onGenerateHandle,
  handleValue,
  onHandleChange,
  onContinue,
  copy,
}: {
  busy?: boolean;
  phaseError?: string | null;
  canGoBack?: boolean;
  handleSuggestion?: HandleSuggestion;
  headerSubtitle?: string;
  headerTitle?: string;
  backLabel?: string;
  nextLabel?: string;
  onBack?: () => void;
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
  const suggestionMessage = handleSuggestion?.availability === "available"
    ? copy.claimDomain.available
    : handleSuggestion?.reason ?? copy.claimDomain.notAvailable;

  return (
    <div className="space-y-6">
      <div className="space-y-3 text-start">
        <div className="flex items-center gap-3">
          <span
            aria-hidden="true"
            className="grid size-12 shrink-0 place-items-center rounded-full border border-border-soft bg-muted/45 text-foreground"
          >
            <RedditLogo className="size-7" weight="fill" />
          </span>
          <Type as="h2" variant="h2" className="min-w-0 leading-7 sm:leading-8">
            {headerTitle ?? copy.claimDomain.title}
          </Type>
        </div>
        {headerSubtitle ? (
          <Type as="p" variant="body" className="w-full max-w-none leading-7 text-muted-foreground sm:text-lg sm:leading-8">
            {headerSubtitle}
          </Type>
        ) : null}
      </div>

      <div className="space-y-2">
        <FormFieldLabel label={copy.claimDomain.domainLabel} />
        <div className="flex items-center gap-2">
          <div className="relative flex-1" dir="ltr">
            <Input
              className="pe-16 text-start font-mono text-lg"
              dir="ltr"
              onChange={(e) => onHandleChange(e.target.value)}
              placeholder={copy.placeholders.handle}
              size="lg"
              value={displayValue}
            />
            <span className="absolute end-4 top-1/2 -translate-y-1/2 font-mono text-lg text-muted-foreground">.pirate</span>
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

        {handleSuggestion ? (
          <FormNote
            className="inline-flex items-center gap-2"
            tone={handleSuggestion.availability === "available" ? "default" : "warning"}
          >
            {handleSuggestion.availability === "available" ? (
              <>
                <Check className="size-4" weight="bold" />
                {suggestionMessage}
              </>
            ) : (
              <>
                <X className="size-4" weight="bold" />
                {suggestionMessage}
              </>
            )}
          </FormNote>
        ) : null}

        {phaseError ? (
          <FormNote tone="warning">{phaseError}</FormNote>
        ) : null}
      </div>

      <Footer
        copy={copy}
        nextDisabled={!canContinue}
        nextLabel={nextLabel ?? copy.claimDomain.title}
        nextLoading={busy}
        onNext={onContinue}
        onSkip={canGoBack ? onBack : undefined}
        skipDisabled={busy}
        skipLabel={backLabel ?? copy.actions.back}
      />
    </div>
  );
}

export function DomainsTab({
  currentHandle,
  handleTier,
  redditImportDone,
  busy = false,
  phaseError = null,
  phase: controlledPhase,
  redditVerification,
  importJob,
  redditImportSummary,
  generatedHandle,
  handleSuggestion,
  onPhaseChange,
  onRedditUsernameChange,
  onImportKarmaNext,
  onImportKarmaSkip,
  onHandleChange,
  onGenerateHandle,
  onChooseNameContinue,
  onChooseNameBack,
}: DomainsTabProps) {
  const { locale } = useUiLocale();
  const copy = getLocaleMessages(locale, "routes").onboarding;
  const [internalPhase, setInternalPhase] = React.useState<DomainsTabPhase>("options");
  const phase = controlledPhase ?? internalPhase;
  const setPhase = (next: DomainsTabPhase) => {
    if (controlledPhase !== undefined) {
      onPhaseChange?.(next);
    } else {
      setInternalPhase(next);
    }
  };

  const importSucceeded = importJob.status === "succeeded" || importJob.status === "partial_success";
  const importDone = phase === "import_karma" && importSucceeded;
  const canReturnToRedditImport = phase === "choose_name" && !importSucceeded;

  React.useEffect(() => {
    if (importDone && controlledPhase === undefined) {
      setPhase("choose_name");
    }
  }, [importDone]);

  const importedDomainEligibility = resolveDomainEligibilityLength(redditImportSummary?.importedRedditScore);
  const importedDoneSubtitle = formatMessage(copy.redditImport.doneSubtitle, {
    domainLength: importedDomainEligibility,
  });
  const handleImportKarmaNext = () => {
    onImportKarmaNext?.();
    setPhase("import_karma");
  };
  const handleImportKarmaSkip = () => {
    onImportKarmaSkip?.();
    setPhase("options");
  };
  const handleChooseNameBack = () => {
    onChooseNameBack?.();
    setPhase("import_karma");
  };

  return (
    <div className="space-y-8">
      {phase === "options" ? (
        <SettingsSection title="Upgrade your name">
          <Type as="p" className="text-muted-foreground">
            Your name is {currentHandle}
          </Type>

          <Card className="overflow-hidden border-border bg-card shadow-none">
            <div className="divide-y divide-border-soft">
              <button
                className="flex w-full items-center justify-between gap-4 px-5 py-4 text-start opacity-40"
                disabled
                type="button"
              >
                <span className="flex min-w-0 flex-col items-start gap-0.5">
                  <Type as="span" variant="label">Buy name</Type>
                  <Type as="span" className="text-muted-foreground">
                    Choose from available .pirate names
                  </Type>
                  <Type as="span" variant="caption" className="mt-0.5 text-muted-foreground">
                    Coming later
                  </Type>
                </span>
                <CaretRight className="size-5 shrink-0 text-muted-foreground" />
              </button>

              <button
                className="flex w-full items-center justify-between gap-4 px-5 py-4 text-start transition-colors hover:bg-muted/30"
                disabled={redditImportDone || busy}
                onClick={() => setPhase("import_karma")}
                type="button"
              >
                <span className="flex min-w-0 flex-col items-start gap-0.5">
                  <Type as="span" variant="label">Import Reddit</Type>
                  <Type as="span" className="text-muted-foreground">
                    Use your Reddit karma to unlock a better domain
                  </Type>
                </span>
                <CaretRight className="size-5 shrink-0 text-muted-foreground" />
              </button>
            </div>
          </Card>
        </SettingsSection>
      ) : null}

      {phase === "import_karma" || phase === "choose_name" ? (
        <Card className="overflow-hidden border-border bg-card shadow-none">
          <CardContent className="p-5">
            {importDone ? (
              <ChooseNamePhase
                busy={busy}
                canGoBack={false}
                handleSuggestion={handleSuggestion}
                handleValue={generatedHandle ?? ""}
                headerSubtitle={importedDoneSubtitle}
                headerTitle={copy.redditImport.doneTitle}
                nextLabel="Claim domain"
                onContinue={onChooseNameContinue ?? (() => {})}
                onGenerateHandle={onGenerateHandle ?? (() => {})}
                onHandleChange={onHandleChange ?? (() => {})}
                phaseError={phaseError}
                copy={copy}
              />
            ) : phase === "import_karma" ? (
              <ImportKarmaPhase
                busy={busy}
                canSkip
                importJob={importJob}
                nextLabel="Import Reddit"
                onNext={handleImportKarmaNext}
                onSkip={handleImportKarmaSkip}
                onUsernameChange={onRedditUsernameChange}
                phaseError={phaseError}
                reddit={redditVerification}
                skipLabel="Back"
                copy={copy}
              />
            ) : (
              <ChooseNamePhase
                busy={busy}
                backLabel="Back"
                canGoBack={canReturnToRedditImport}
                handleSuggestion={handleSuggestion}
                handleValue={generatedHandle ?? ""}
                headerSubtitle={importSucceeded ? importedDoneSubtitle : undefined}
                headerTitle={importSucceeded ? copy.redditImport.doneTitle : undefined}
                nextLabel="Claim domain"
                onBack={handleChooseNameBack}
                onContinue={onChooseNameContinue ?? (() => {})}
                onGenerateHandle={onGenerateHandle ?? (() => {})}
                onHandleChange={onHandleChange ?? (() => {})}
                phaseError={phaseError}
                copy={copy}
              />
            )}
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}
