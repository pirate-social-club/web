"use client";

import type { JoinEligibility, MembershipGateSummary } from "@pirate/api-contracts";
import { ArrowSquareOut } from "@phosphor-icons/react";

import { ActionCalloutPanel } from "@/components/compositions/community/action-callout-panel/action-callout-panel";
import { VerificationIconBadge } from "@/components/compositions/verification/verification-modal-header/verification-modal-header";
import { Button } from "@/components/primitives/button";
import { VerificationAppDownloadLinks } from "@/components/compositions/verification/verification-app-download-links/verification-app-download-links";
import { FormNote } from "@/components/primitives/form-layout";
import { Spinner } from "@/components/primitives/spinner";
import {
  getJoinCtaLabel,
  getPassportPromptCapabilities,
  getVerificationPromptCopy,
  isJoinCtaActionable,
} from "@/lib/identity-gates";
import { Type } from "@/components/primitives/type";

type VerificationPrompt = {
  title: string;
  description: string;
  actionLabel: string;
  href?: string | null;
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

function getEligibilityText(eligibility: JoinEligibility | null | undefined): {
  description: string | null;
  title: string;
} {
  switch (eligibility?.status) {
    case "joinable":
      return { title: "Ready to join", description: "You meet this community's access requirements." };
    case "requestable":
      return { title: "Request access", description: "Ask the moderators to approve your membership." };
    case "pending_request":
      return { title: "Request submitted", description: "The moderators will review your request." };
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
  const scoreDescription = typeof currentScore === "number"
    ? `Your score is ${formatPassportScore(currentScore)}. Need ${requiredScoreLabel}+ to join.`
    : `No Passport score found. Need ${requiredScoreLabel}+ to join.`;

  return {
    title: `Passport score ${requiredScoreLabel}+ required`,
    description: scoreDescription,
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
  const passportPrompt: VerificationPrompt | null = !verificationPrompt
    ? getPassportPrompt(eligibility)
    : null;
  const activePrompt = verificationPrompt ?? passportPrompt;
  const isVeryVerificationRequired = !activePrompt
    && eligibility?.status === "verification_required"
    && eligibility.suggested_verification_provider === "very";
  const eligibilityText = getEligibilityText(eligibility);
  const isInlineVerificationRequired = !activePrompt
    && eligibility?.status === "verification_required"
    && !isVeryVerificationRequired;
  const title = isVeryVerificationRequired
    ? "Scan your palm to join"
    : isInlineVerificationRequired
      ? "Verify your identity to join"
    : activePrompt?.title ?? (joinRequested ? "Request submitted" : eligibilityText.title);
  const description = isVeryVerificationRequired
    ? null
    : isInlineVerificationRequired
      ? "Complete the ID check, then return to join."
    : activePrompt?.description
    ?? (joinRequested ? "Your join request has been submitted." : joinError ?? eligibilityText.description);
  const showEligibilityAction = eligibility
    && !activePrompt
    && isJoinCtaActionable(eligibility)
    && eligibility.status !== "gate_failed"
    && eligibility.status !== "already_joined"
    && eligibility.status !== "banned";
  const showPromptAction = activePrompt?.href;
  const descriptionTone = joinError ? "text-warning" : "text-muted-foreground";
  const verificationIcon = isVeryVerificationRequired
    ? "very"
    : isInlineVerificationRequired
      ? "self"
      : null;
  const action = showPromptAction ? (
    <Button asChild className="h-14 w-full shrink-0 px-9 text-lg shadow-sm md:w-auto md:min-w-44" size="lg" variant="secondary">
      <a className="gap-2" href={activePrompt.href ?? undefined} rel="noopener noreferrer" target="_blank">
        <span>{activePrompt.actionLabel}</span>
        <ArrowSquareOut className="size-5" />
      </a>
    </Button>
  ) : showEligibilityAction ? (
    <Button
      className="h-14 w-full shrink-0 px-9 text-lg shadow-sm md:w-auto md:min-w-44"
      loading={joinLoading}
      onClick={onJoin}
      size="lg"
    >
      {getJoinCtaLabel(eligibility)}
    </Button>
  ) : null;

  return (
    <ActionCalloutPanel
      action={action}
      description={description}
      descriptionClassName={descriptionTone}
      icon={verificationIcon ? <VerificationIconBadge icon={verificationIcon} /> : null}
      title={title}
    >
      {isVeryVerificationRequired ? (
        <VerificationAppDownloadLinks app="very" className="flex flex-wrap items-center gap-x-3 gap-y-1 text-base text-muted-foreground" variant="inline" />
      ) : null}

      {verificationLoading || onCancelVerification || verificationError ? (
        <div className="mt-4 flex flex-col gap-3">
          {verificationLoading ? (
            <Type as="div" variant="caption" className="flex items-center gap-2 ">
              <Spinner className="size-4" />
              <span>Processing verification...</span>
            </Type>
          ) : null}
          {onCancelVerification ? (
            <Button className="w-fit" variant="ghost" onClick={onCancelVerification}>
              Cancel
            </Button>
          ) : null}
          {verificationError ? <FormNote tone="warning">{verificationError}</FormNote> : null}
        </div>
      ) : null}
    </ActionCalloutPanel>
  );
}
