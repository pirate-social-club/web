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
import { CopyField } from "@/components/primitives/copy-field";
import { FormFieldLabel, FormNote } from "@/components/primitives/form-layout";
import { Input } from "@/components/primitives/input";
import { Spinner } from "@/components/primitives/spinner";
import { Type } from "@/components/primitives/type";
import { useUiLocale } from "@/lib/ui-locale";
import { getLocaleMessages } from "@/locales";
import { cn } from "@/lib/utils";
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

function resolveDomainEligibilityLength(importedScore: number | null | undefined): string {
  if (typeof importedScore === "number" && Number.isFinite(importedScore)) {
    if (importedScore >= 100_000) return "5";
    if (importedScore >= 50_000) return "6";
    if (importedScore >= 10_000) return "7";
  }
  return "8+";
}

function resolveRedditProfileHref(username: string | undefined): string {
  const normalizedUsername = username?.trim().replace(/^u\//iu, "");
  if (!normalizedUsername) return "https://www.reddit.com/settings/profile";

  return `https://www.reddit.com/user/${encodeURIComponent(normalizedUsername)}/`;
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
        <Type as="p" variant="body" className="w-full max-w-none leading-7 text-muted-foreground sm:text-lg sm:leading-8">
          {subtitle}
        </Type>
      ) : null}
    </div>
  );
}

function Footer({
  fixedBottom = false,
  nextLabel,
  skipLabel,
  onSkip,
  nextDisabled,
  nextLoading,
  onNext,
  copy,
}: {
  fixedBottom?: boolean;
  nextLabel?: string;
  skipLabel?: string;
  onSkip?: () => void;
  nextDisabled?: boolean;
  nextLoading?: boolean;
  onNext: () => void;
  copy: OnboardingCopy;
}) {
  if (fixedBottom) {
    return (
      <div className="fixed inset-x-0 bottom-0 z-20 border-t border-border-soft bg-background/95 pb-[calc(env(safe-area-inset-bottom)+0.75rem)] pt-3 backdrop-blur-xl">
        <div className={cn("grid gap-3 px-4", onSkip && "sm:grid-cols-2")}>
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
      </div>
    );
  }

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
  footerFixedBottom = false,
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
  footerFixedBottom?: boolean;
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
  const redditProfileHref = footerFixedBottom
    ? resolveRedditProfileHref(reddit.verifiedUsername ?? reddit.usernameValue)
    : "https://www.reddit.com/settings/profile";
  const openProfileInNewTab = !footerFixedBottom;
  const keepFooterInline = footerFixedBottom && showUsernameField;

  return (
    <div className="space-y-6">
      <OnboardingCardHeader subtitle={headerSubtitle} title={headerTitle} />

      {showUsernameField ? (
        <div className="space-y-2">
          <FormFieldLabel label={copy.fields.redditUsername} />
          <div className="flex h-16 items-center gap-2 rounded-full border border-input bg-background px-5 shadow-sm focus-within:border-border focus-within:ring-1 focus-within:ring-border-soft" dir="ltr">
            <span className="shrink-0 text-base text-muted-foreground">u/</span>
            <Input
              className="h-auto min-w-0 flex-1 rounded-none border-0 bg-transparent px-0 py-0 text-start shadow-none focus-visible:border-transparent focus-visible:ring-0 disabled:opacity-80"
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
                rel={openProfileInNewTab ? "noreferrer" : undefined}
                target={openProfileInNewTab ? "_blank" : undefined}
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
        </div>
      ) : null}

      {isVerified && !isImportDone && !isImporting ? (
        <FormNote>{copy.notes.startingImport}</FormNote>
      ) : null}

      <Footer
        fixedBottom={footerFixedBottom && !keepFooterInline}
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
  footerFixedBottom = false,
  phaseError,
  canGoBack = false,
  handleSuggestion,
  headerIcon,
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
  footerFixedBottom?: boolean;
  phaseError?: string | null;
  canGoBack?: boolean;
  handleSuggestion?: { suggestedLabel: string; availability: string; reason?: string };
  headerIcon?: React.ReactNode;
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
      <OnboardingCardHeader
        icon={headerIcon ?? <Flag className="size-7" />}
        subtitle={headerSubtitle ?? copy.claimDomain.subtitle}
        title={headerTitle ?? copy.claimDomain.title}
      />

      <div className="space-y-2">
        <FormFieldLabel label={copy.claimDomain.domainLabel} />
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
        fixedBottom={footerFixedBottom}
        nextDisabled={!canContinue}
        nextLabel={nextLabel ?? copy.claimDomain.title}
        nextLoading={busy}
        onNext={onContinue}
        onSkip={!busy && canGoBack ? onBack : undefined}
        skipLabel={backLabel ?? copy.actions.back}
      />
    </div>
  );
}

export function OnboardingRedditBootstrap({
  generatedHandle,
  canSkip,
  busy = false,
  layout = "card",
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
  const copy = getLocaleMessages(locale, "routes").onboarding;
  const importDone = phase === "import_karma" && (
    importJob.status === "succeeded" || importJob.status === "partial_success"
  );
  const canReturnToRedditImport = phase === "choose_name"
    && importJob.status !== "succeeded"
    && importJob.status !== "partial_success";
  const importedDomainEligibility = resolveDomainEligibilityLength(redditImportSummary?.importedRedditScore);
  const importedDoneSubtitle = formatMessage(copy.redditImport.doneSubtitle, {
    domainLength: importedDomainEligibility,
  });
  const footerFixedBottom = layout === "mobile";
  const content = (
    <>
      {importDone ? (
        <ChooseNamePhase
          busy={busy}
          footerFixedBottom={footerFixedBottom}
          canGoBack={false}
          handleSuggestion={handleSuggestion}
          handleValue={generatedHandle}
          headerIcon={<RedditLogo className="size-7" weight="fill" />}
          headerSubtitle={importedDoneSubtitle}
          headerTitle={copy.redditImport.doneTitle}
          nextLabel={actions.primaryLabel}
          onContinue={callbacks?.onChooseNameContinue ?? (() => {})}
          onGenerateHandle={callbacks?.onGenerateHandle ?? (() => {})}
          onHandleChange={callbacks?.onHandleChange ?? (() => {})}
          phaseError={phaseError}
          copy={copy}
        />
      ) : phase === "import_karma" ? (
        <ImportKarmaPhase
          busy={busy}
          canSkip={canSkip}
          footerFixedBottom={footerFixedBottom}
          importJob={importJob}
          nextLabel={actions.primaryLabel}
          onNext={callbacks?.onImportKarmaNext ?? (() => {})}
          onSkip={callbacks?.onImportKarmaSkip ?? (() => {})}
          onUsernameChange={callbacks?.onUsernameChange}
          phaseError={phaseError}
          reddit={reddit}
          skipLabel={actions.tertiaryLabel}
          copy={copy}
        />
      ) : null}
      {phase === "choose_name" ? (
        <ChooseNamePhase
          busy={busy}
          footerFixedBottom={footerFixedBottom}
          backLabel={actions.tertiaryLabel}
          canGoBack={canReturnToRedditImport}
          handleSuggestion={handleSuggestion}
          handleValue={generatedHandle}
          nextLabel={actions.primaryLabel}
          onBack={callbacks?.onChooseNameBack ?? (() => {})}
          onContinue={callbacks?.onChooseNameContinue ?? (() => {})}
          onGenerateHandle={callbacks?.onGenerateHandle ?? (() => {})}
          onHandleChange={callbacks?.onHandleChange ?? (() => {})}
          phaseError={phaseError}
          copy={copy}
        />
      ) : null}
    </>
  );

  if (layout === "mobile") {
    return (
      <div className="mx-auto w-full max-w-2xl">
        {content}
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-2xl">
      <Card className="overflow-hidden border-border">
        <CardContent className="p-5">
          {content}
        </CardContent>
      </Card>
    </div>
  );
}
