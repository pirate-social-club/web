"use client";

import * as React from "react";
import type { JoinEligibility, MembershipGateSummary } from "@pirate/api-contracts";
import { ArrowSquareOut } from "@phosphor-icons/react";
import QRCode from "qrcode";

import { Button } from "@/components/primitives/button";
import { VerificationAppDownloadLinks } from "@/components/compositions/verification-app-download-links/verification-app-download-links";
import { FormNote } from "@/components/primitives/form-layout";
import { CardShell } from "@/components/primitives/layout-shell";
import { Spinner } from "@/components/primitives/spinner";
import {
  getJoinCtaLabel,
  getPassportPromptCapabilities,
  getVerificationPromptCopy,
  isJoinCtaActionable,
} from "@/lib/identity-gates";
import { useUiLocale } from "@/lib/ui-locale";
import { getLocaleMessages } from "@/locales";

type VerificationPrompt = {
  title: string;
  description: string;
  actionLabel: string;
  href?: string | null;
  qrValue?: string | null;
};

export interface CommunityMembershipGatePanelProps {
  gates: MembershipGateSummary[];
  eligibility?: JoinEligibility | null;
  joinLoading?: boolean;
  joinRequested?: boolean;
  joinError?: string | null;
  verificationPrompt?: VerificationPrompt | null;
  verificationLoading?: boolean;
  verificationError?: string | null;
  onJoin?: () => void;
  onCancelVerification?: () => void;
  revealRequirementValues?: boolean;
}

function VerificationQr({ value }: { value: string }) {
  const { locale } = useUiLocale();
  const copy = getLocaleMessages(locale, "routes").common;
  const [src, setSrc] = React.useState<string | null>(null);
  const [error, setError] = React.useState(false);

  React.useEffect(() => {
    let cancelled = false;

    void QRCode.toDataURL(value, {
      errorCorrectionLevel: "M",
      margin: 1,
      width: 320,
    })
      .then((nextSrc: string) => {
        if (cancelled) return;
        setSrc(nextSrc);
        setError(false);
      })
      .catch(() => {
        if (cancelled) return;
        setSrc(null);
        setError(true);
      });

    return () => {
      cancelled = true;
    };
  }, [value]);

  if (error) {
    return <FormNote tone="warning">{copy.qrRenderError}</FormNote>;
  }

  if (!src) {
    return (
      <div className="flex min-h-64 items-center justify-center rounded-[var(--radius-lg)] border border-border-soft bg-card">
        <Spinner className="size-5" />
      </div>
    );
  }

  return (
    <div className="flex justify-center rounded-[var(--radius-lg)] border border-border-soft bg-card p-4">
      <img
        alt={copy.selfVerificationQrCode}
        className="size-64 max-w-full rounded-[var(--radius-md)]"
        height={256}
        src={src}
        width={256}
      />
    </div>
  );
}

function getEligibilityText(eligibility: JoinEligibility | null | undefined): {
  description: string | null;
  title: string;
} {
  switch (eligibility?.status) {
    case "joinable":
      return { title: "Ready to join", description: "You meet this community's access requirements." };
    case "requestable":
      return { title: "Request access", description: "Ask the moderators to approve your membership." };
    case "verification_required":
      return { title: "Verification required", description: "Complete verification to join." };
    case "gate_failed":
      return { title: "Not eligible", description: "You do not meet this community's access requirements." };
    case "already_joined":
      return { title: "Joined", description: null };
    case "banned":
      return { title: "Unavailable", description: "You are not eligible to join this community." };
    default:
      return { title: "Access required", description: "This community has membership requirements." };
  }
}

function formatPassportScore(score: number): string {
  return Number.isInteger(score) ? String(score) : score.toFixed(1).replace(/\.0$/u, "");
}

function getRequiredPassportScore(eligibility: JoinEligibility | null | undefined): number | null {
  if (typeof eligibility?.wallet_score_status?.required_score === "number") {
    return eligibility.wallet_score_status.required_score;
  }
  let requiredScore: number | null = null;
  for (const gate of eligibility?.membership_gate_summaries ?? []) {
    if (gate.gate_type === "wallet_score" && typeof gate.minimum_score === "number") {
      requiredScore = requiredScore == null ? gate.minimum_score : Math.max(requiredScore, gate.minimum_score);
    }
  }
  return requiredScore;
}

function getPassportPrompt(
  eligibility: JoinEligibility | null | undefined,
): VerificationPrompt | null {
  if (!eligibility) return null;
  const shouldShowPassportPrompt = (
    eligibility.status === "verification_required"
    && eligibility.suggested_verification_provider === "passport"
  ) || (
    eligibility.status === "gate_failed"
    && eligibility.failure_reason === "wallet_score_too_low"
  );
  if (!shouldShowPassportPrompt) return null;

  const capabilities = getPassportPromptCapabilities(eligibility);
  const activeCapabilities: JoinEligibility["missing_capabilities"] = capabilities.length > 0 ? capabilities : ["wallet_score"];
  const copy = getVerificationPromptCopy("passport", activeCapabilities);
  const requiredScore = getRequiredPassportScore(eligibility);
  if (requiredScore == null) {
    return { ...copy, href: "https://app.passport.xyz/" };
  }

  const requiredScoreLabel = formatPassportScore(requiredScore);
  const currentScore = eligibility.wallet_score_status?.current_score;
  const needsSanctionsClear = activeCapabilities.includes("sanctions_clear");
  const scoreDescription = typeof currentScore === "number"
    ? `Your score is ${formatPassportScore(currentScore)}. Need ${requiredScoreLabel}+ to join.`
    : `No Passport score found. Need ${requiredScoreLabel}+ to join.`;
  const description = needsSanctionsClear
    ? `${scoreDescription} Complete Passport screening too.`
    : scoreDescription;

  return {
    title: `Passport score ${requiredScoreLabel}+ required`,
    description,
    actionLabel: copy.actionLabel,
    href: "https://app.passport.xyz/",
  };
}

export function CommunityMembershipGatePanel({
  gates,
  eligibility,
  joinLoading,
  joinRequested,
  joinError,
  verificationPrompt,
  verificationLoading,
  verificationError,
  onJoin,
  onCancelVerification,
}: CommunityMembershipGatePanelProps) {
  if (gates.length === 0) return null;

  const passportPrompt: VerificationPrompt | null = !verificationPrompt
    ? getPassportPrompt(eligibility)
    : null;
  const activePrompt = verificationPrompt ?? passportPrompt;
  const isVeryVerificationRequired = !activePrompt
    && eligibility?.status === "verification_required"
    && eligibility.suggested_verification_provider === "very";
  const eligibilityText = getEligibilityText(eligibility);
  const title = isVeryVerificationRequired
    ? "Scan your palm to join"
    : activePrompt?.title ?? (joinRequested ? "Request submitted" : eligibilityText.title);
  const description = isVeryVerificationRequired
    ? null
    : activePrompt?.description
    ?? (joinRequested ? "Your join request has been submitted." : joinError ?? eligibilityText.description);
  const showEligibilityAction = eligibility
    && !activePrompt
    && isJoinCtaActionable(eligibility)
    && eligibility.status !== "gate_failed"
    && eligibility.status !== "already_joined"
    && eligibility.status !== "banned";
  const showPromptAction = activePrompt?.href;
  const descriptionTone = joinError ? "text-amber-700" : "text-muted-foreground";

  return (
    <CardShell className="px-5 py-5">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="min-w-0 space-y-1.5">
          <p className="text-lg font-semibold leading-7 text-foreground">{title}</p>
          {description ? (
            <p className={`text-base leading-6 ${descriptionTone}`}>{description}</p>
          ) : null}
        </div>

        {showPromptAction ? (
          <Button asChild className="w-full shrink-0 md:w-auto" variant="secondary">
            <a className="gap-2" href={activePrompt.href ?? undefined} rel="noopener noreferrer" target="_blank">
              <span>{activePrompt.actionLabel}</span>
              <ArrowSquareOut className="size-5" />
            </a>
          </Button>
        ) : null}

        {showEligibilityAction ? (
          <Button
            className={isVeryVerificationRequired ? "h-12 w-full shrink-0 px-7 text-base md:w-auto" : "w-full shrink-0 md:w-auto"}
            loading={joinLoading}
            onClick={onJoin}
            size={isVeryVerificationRequired ? "lg" : "default"}
          >
            {getJoinCtaLabel(eligibility)}
          </Button>
        ) : null}
      </div>

      {activePrompt?.qrValue ? (
        <div className="mt-4">
          <VerificationQr value={activePrompt.qrValue} />
        </div>
      ) : null}

      {isVeryVerificationRequired ? (
        <VerificationAppDownloadLinks
          app="very"
          className="mt-4 flex flex-wrap items-center gap-x-3 gap-y-1 text-base text-muted-foreground"
          variant="inline"
        />
      ) : null}

      {verificationLoading || onCancelVerification || verificationError ? (
        <div className="mt-4 flex flex-col gap-3">
          {verificationLoading ? (
            <div className="flex items-center gap-2 text-base text-muted-foreground">
              <Spinner className="size-4" />
              <span>Processing verification...</span>
            </div>
          ) : null}
          {onCancelVerification ? (
            <Button className="w-fit" variant="ghost" onClick={onCancelVerification}>
              Cancel
            </Button>
          ) : null}
          {verificationError ? <FormNote tone="warning">{verificationError}</FormNote> : null}
        </div>
      ) : null}
    </CardShell>
  );
}
