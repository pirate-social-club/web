"use client";

import type { MembershipGateSummary } from "@pirate/api-contracts";

import { CommunityInteractionGateModal } from "@/components/compositions/community/interaction-gate-modal/community-interaction-gate-modal";
import { AltchaPowWidget } from "@/components/compositions/verification/altcha-pow-widget/altcha-pow-widget";
import { FormNote } from "@/components/primitives/form-layout";
import type { CommunityGateRequirementStatus } from "@/components/compositions/community/gate-requirements.types";
import type { AltchaScope } from "@/lib/api/client-groups-core";
import { getLocaleMessages } from "@/locales";

export interface CommunityProofOfWorkModalProps {
  action: string;
  challengeLoader?: (input: { action: string; scope: AltchaScope }) => Promise<Record<string, unknown>>;
  continueDisabled?: boolean;
  continueLoading?: boolean;
  error?: string | null;
  locale?: string | null;
  onContinue: () => void | Promise<void>;
  onOpenChange: (open: boolean) => void;
  onPayloadChange: (payload: string | null) => void;
  onVerified?: (payload: string) => void | Promise<void>;
  open: boolean;
  retryKey?: number;
  requirements?: MembershipGateSummary[];
  requirementsMode?: "all" | "any" | null;
  requirementStatuses?: CommunityGateRequirementStatus[];
  scope: AltchaScope;
}

export function CommunityProofOfWorkModal({
  action,
  challengeLoader,
  continueDisabled,
  continueLoading,
  error,
  locale,
  onContinue,
  onOpenChange,
  onPayloadChange,
  onVerified,
  open,
  retryKey,
  requirements,
  requirementsMode,
  requirementStatuses,
  scope,
}: CommunityProofOfWorkModalProps) {
  const resolvedLocale = locale === "ar" || locale === "zh" || locale === "pseudo" ? locale : "en";
  const copy = getLocaleMessages(resolvedLocale, "gates").panel;
  const hasAlternative = (requirements ?? []).some((requirement) => requirement.gate_type === "altcha_pow")
    && (requirements ?? []).some((requirement) => requirement.gate_type !== "altcha_pow");
  const resolvedTitle = copy.powOnlyTitle;
  const resolvedDescription = hasAlternative
    ? `${copy.powOnlyDescription} ${copy.powSkipNote}`
    : copy.powOnlyDescription;
  const body = (
    <div className="space-y-3">
      <AltchaPowWidget
        key={`${action}:${scope}:${open ? "open" : "closed"}`}
        action={action}
        challengeLoader={challengeLoader}
        locale={locale}
        onPayloadChange={onPayloadChange}
        onVerified={onVerified}
        retryKey={retryKey}
        scope={scope}
      />
      {error ? <FormNote tone="destructive">{error}</FormNote> : null}
    </div>
  );
  return (
    <CommunityInteractionGateModal
      body={body}
      description={resolvedDescription}
      icon="blocked"
      onOpenChange={onOpenChange}
      open={open}
      primaryAction={{
        disabled: continueDisabled,
        label: "Continue",
        loading: continueLoading,
        onClick: onContinue,
      }}
      requirements={hasAlternative ? [] : requirements}
      requirementsMode={requirementsMode ?? undefined}
      requirementStatuses={hasAlternative ? [] : requirementStatuses}
      title={resolvedTitle}
    />
  );
}
