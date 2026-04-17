"use client";

import type { JoinEligibility, MembershipGateSummary } from "@pirate/api-contracts";

import { Button } from "@/components/primitives/button";
import { FormNote } from "@/components/primitives/form-layout";
import { Spinner } from "@/components/primitives/spinner";
import { formatGateRequirement, getJoinCtaLabel, isJoinCtaActionable } from "@/lib/identity-gates";

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

function JoinCta({
  eligibility,
  loading,
  onJoin,
}: {
  eligibility: JoinEligibility;
  loading?: boolean;
  onJoin?: () => void;
}) {
  const label = getJoinCtaLabel(eligibility);
  const actionable = isJoinCtaActionable(eligibility);

  return (
    <Button disabled={!actionable} loading={loading} onClick={actionable ? onJoin : undefined}>
      {label}
    </Button>
  );
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
  revealRequirementValues = false,
}: CommunityMembershipGatePanelProps) {
  if (gates.length === 0) return null;

  return (
    <div className="rounded-[var(--radius-3xl)] border border-border-soft bg-card px-5 py-4">
      <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
        <div className="space-y-1">
          {gates.map((gate, index) => (
            <p key={index} className="text-base text-muted-foreground">
              {formatGateRequirement(gate, { audience: revealRequirementValues ? "admin" : "public" })}
            </p>
          ))}
        </div>
        {eligibility && !verificationPrompt ? (
          <JoinCta eligibility={eligibility} loading={joinLoading} onJoin={onJoin} />
        ) : null}
      </div>

      {verificationPrompt ? (
        <div className="mt-4 space-y-3 rounded-[var(--radius-lg)] border border-border-soft bg-muted/20 px-4 py-4">
          <p className="text-base font-semibold text-foreground">{verificationPrompt.title}</p>
          <p className="text-base text-muted-foreground">{verificationPrompt.description}</p>
          {verificationPrompt.href ? (
            <a
              className="inline-block text-base font-medium text-orange-500 underline decoration-orange-500/30 underline-offset-4 hover:decoration-orange-500"
              href={verificationPrompt.href}
              rel="noopener noreferrer"
              target="_blank"
            >
              {verificationPrompt.actionLabel}
            </a>
          ) : null}
          {verificationLoading ? (
            <div className="flex items-center gap-2">
              <Spinner className="size-4" />
              <span className="text-base text-muted-foreground">Processing verification...</span>
            </div>
          ) : null}
          {onCancelVerification ? (
            <div>
              <Button variant="ghost" onClick={onCancelVerification}>
                Cancel
              </Button>
            </div>
          ) : null}
          {verificationError ? <FormNote tone="warning">{verificationError}</FormNote> : null}
        </div>
      ) : null}

      {joinError ? <FormNote className="mt-2" tone="warning">{joinError}</FormNote> : null}
      {joinRequested ? <FormNote className="mt-2">Your join request has been submitted.</FormNote> : null}
    </div>
  );
}
