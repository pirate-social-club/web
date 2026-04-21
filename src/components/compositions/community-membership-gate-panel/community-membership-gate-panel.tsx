"use client";

import * as React from "react";
import type { JoinEligibility, MembershipGateSummary } from "@pirate/api-contracts";
import QRCode from "qrcode";

import { Button } from "@/components/primitives/button";
import { FormNote } from "@/components/primitives/form-layout";
import { CardShell } from "@/components/primitives/layout-shell";
import { Spinner } from "@/components/primitives/spinner";
import { getJoinCtaLabel, isJoinCtaActionable } from "@/lib/identity-gates";
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

  return (
    <CardShell className="px-5 py-4">
      <div className="flex justify-end">
        {eligibility && !verificationPrompt ? (
          <JoinCta eligibility={eligibility} loading={joinLoading} onJoin={onJoin} />
        ) : null}
      </div>

      {verificationPrompt ? (
        <div className="mt-4 space-y-3 rounded-[var(--radius-lg)] border border-border-soft bg-muted/20 px-4 py-4">
          <p className="text-base font-semibold text-foreground">{verificationPrompt.title}</p>
          <p className="text-base text-muted-foreground">{verificationPrompt.description}</p>
          {verificationPrompt.qrValue ? <VerificationQr value={verificationPrompt.qrValue} /> : null}
          {verificationPrompt.href ? (
            <Button asChild variant="secondary">
              <a href={verificationPrompt.href} rel="noopener noreferrer" target="_blank">
                {verificationPrompt.actionLabel}
              </a>
            </Button>
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
    </CardShell>
  );
}
