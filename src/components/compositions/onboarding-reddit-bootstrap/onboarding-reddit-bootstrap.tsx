"use client";

import * as React from "react";
import {
  ArrowSquareOut,
  ArrowsClockwise,
  Check,
  Flag,
  RedditLogo,
  X,
} from "@phosphor-icons/react";

import { Button } from "@/components/primitives/button";
import { Card, CardContent } from "@/components/primitives/card";
import { Chip } from "@/components/primitives/chip";
import { CopyField } from "@/components/primitives/copy-field";
import { FormFieldLabel, FormNote } from "@/components/primitives/form-layout";
import { Input } from "@/components/primitives/input";
import { Spinner } from "@/components/primitives/spinner";
import { Type } from "@/components/primitives/type";
import { resolveLocaleLanguageTag, useUiLocale } from "@/lib/ui-locale";
import { getLocaleMessages } from "@/locales";
import type { RoutesMessages } from "@/locales";

import type {
  ImportJobState,
  OnboardingRedditBootstrapProps,
  RedditImportSummaryState,
  RedditVerificationState,
} from "./onboarding-reddit-bootstrap.types";

type OnboardingCopy = RoutesMessages["onboarding"];

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

function formatOptionalNumber(value: number | null | undefined, localeTag: string): string | null {
  if (typeof value !== "number" || !Number.isFinite(value)) return null;
  return new Intl.NumberFormat(localeTag).format(value);
}

function RedditImportSummary({
  localeTag,
  summary,
}: {
  localeTag: string;
  summary?: RedditImportSummaryState | null;
}) {
  const karma = formatOptionalNumber(summary?.globalKarma, localeTag);
  const topSubreddits = summary?.topSubreddits?.slice(0, 3) ?? [];

  return (
    <div className="space-y-4 rounded-md border border-border bg-background p-4">
      <div className="space-y-1">
        <p className="text-base font-semibold text-foreground">
          Imported u/{summary?.redditUsername ?? "reddit"}
        </p>
        <p className="text-base text-muted-foreground">Your Reddit activity is ready.</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-[minmax(8rem,0.4fr)_1fr]">
        <div>
          <p className="text-base text-muted-foreground">Karma</p>
          <p className="mt-1 text-lg font-semibold text-foreground">{karma ?? "Not found"}</p>
        </div>
        <div>
          <p className="text-base text-muted-foreground">Top subreddits</p>
          {topSubreddits.length > 0 ? (
            <div className="mt-2 flex flex-wrap gap-2">
              {topSubreddits.map((entry) => (
                <Chip disabled key={entry.subreddit} size="sm" variant="outline">
                  r/{entry.subreddit}
                </Chip>
              ))}
            </div>
          ) : (
            <p className="mt-1 text-base text-muted-foreground">Not found</p>
          )}
        </div>
      </div>
    </div>
  );
}

function OnboardingCardHeader({
  icon,
  subtitle,
  title,
}: {
  icon?: React.ReactNode;
  subtitle?: string;
  title: string;
}) {
  return (
    <div className="space-y-3 text-start">
      <div className="flex items-center gap-3">
        <span
          aria-hidden="true"
          className="grid size-12 shrink-0 place-items-center rounded-full border border-border-soft bg-muted/45 text-foreground"
        >
          {icon ?? <RedditLogo className="size-7" weight="fill" />}
        </span>
        <Type as="h2" variant="h2" className="min-w-0 leading-7 sm:leading-8">
          {title}
        </Type>
      </div>
      {subtitle ? (
        <Type as="p" variant="caption" className="w-full max-w-none sm:text-lg">
          {subtitle}
        </Type>
      ) : null}
    </div>
  );
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
    <div className={onSkip ? "grid gap-3 pt-3 sm:grid-cols-2" : "grid gap-3 pt-3"}>
      {onSkip ? (
        <Button className="h-14 w-full text-lg" onClick={onSkip} variant="outline">
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
  redditImportSummary,
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
  redditImportSummary?: RedditImportSummaryState | null;
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
  const showUsernameField = !isCodeReady && (!isVerified || isImporting);
  const verificationCode = extractVerificationCode(reddit.verificationHint);
  const fieldError = phaseError ?? (isFailed ? reddit.errorTitle : null);
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
    );
  const headerTitle = isCodeReady ? "Verify Reddit" : copy.importKarmaAction;
  const headerSubtitle = isCodeReady
    ? undefined
    : isImportDone
      ? "Your Reddit activity is ready."
      : "Bring your Reddit karma to Pirate for better names and recommendations.";

  return (
    <div className="space-y-6">
      <OnboardingCardHeader subtitle={headerSubtitle} title={headerTitle} />

      {showUsernameField ? (
        <div className="space-y-2">
          <FormFieldLabel label={copy.fields.redditUsername} />
          <div className="relative" dir="ltr">
            <span className="absolute start-4 top-1/2 -translate-y-1/2 text-base text-muted-foreground">u/</span>
            <Input
              className="ps-8 text-start"
              disabled={busy || !!isCodeReady || isChecking || isImporting}
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
              Loading...
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
              Paste into your{" "}
              <a
                className="inline-flex items-center gap-1 underline underline-offset-4"
                href="https://www.reddit.com/settings/profile"
                rel="noreferrer"
                target="_blank"
              >
                Reddit profile description
                <ArrowSquareOut className="size-4" />
              </a>
            </FormNote>
          </div>
          <CopyField value={verificationCode ?? reddit.verificationHint} />
          {fieldError ? (
            <FormNote tone="warning">{fieldError}</FormNote>
          ) : null}
        </div>
      ) : null}

      {isImportDone ? (
        <RedditImportSummary localeTag={localeTag} summary={redditImportSummary} />
      ) : null}

      {isVerified && !isImportDone && !isImporting ? (
        <FormNote>{copy.notes.startingImport}</FormNote>
      ) : null}

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
      <OnboardingCardHeader
        icon={<Flag className="size-7" />}
        subtitle="Pirate domains are URLs that can be sold or traded. Choose wisely."
        title="Claim Domain"
      />

      <div className="space-y-2">
        <FormFieldLabel label="Domain" />
        <div className="flex items-center gap-2">
          <div className="relative flex-1" dir="ltr">
            <Input
              className="pe-12 text-start font-mono text-lg"
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
                Available
              </>
            ) : (
              <>
                <X className="size-4" weight="bold" />
                Not available
              </>
            )}
          </FormNote>
        ) : null}

        {phaseError ? (
          <FormNote tone="warning">{phaseError}</FormNote>
        ) : null}
      </div>

      <Footer copy={copy} nextDisabled={!canContinue} nextLabel={nextLabel ?? "Claim Domain"} nextLoading={busy} onNext={onContinue} />
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
  redditImportSummary,
  handleSuggestion,
  actions = {},
  callbacks,
}: OnboardingRedditBootstrapProps) {
  const { locale } = useUiLocale();
  const localeTag = resolveLocaleLanguageTag(locale);
  const copy = getLocaleMessages(locale, "routes").onboarding;

  return (
    <div className="mx-auto w-full max-w-2xl">
      <Card className="overflow-hidden border-border shadow-none">
        <CardContent className="p-5">
          {phase === "import_karma" ? (
            <ImportKarmaPhase
              busy={busy}
              canSkip={canSkip}
              importJob={importJob}
              redditImportSummary={redditImportSummary}
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
