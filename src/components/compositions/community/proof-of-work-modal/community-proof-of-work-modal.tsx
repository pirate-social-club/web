"use client";

import type { MembershipGateSummary } from "@pirate/api-contracts";

import { CommunityInteractionGateModal, type CommunityInteractionGateRequirementStatus } from "@/components/compositions/community/interaction-gate-modal/community-interaction-gate-modal";
import { AltchaPowWidget } from "@/components/compositions/verification/altcha-pow-widget/altcha-pow-widget";
import type { AltchaScope } from "@/lib/api/client-groups-core";

export interface CommunityProofOfWorkModalProps {
  action: string;
  challengeLoader?: (input: { action: string; scope: AltchaScope }) => Promise<Record<string, unknown>>;
  continueDisabled?: boolean;
  continueLoading?: boolean;
  description?: string;
  locale?: string | null;
  onContinue: () => void | Promise<void>;
  onOpenChange: (open: boolean) => void;
  onPayloadChange: (payload: string | null) => void;
  open: boolean;
  requirements?: MembershipGateSummary[];
  requirementStatuses?: CommunityInteractionGateRequirementStatus[];
  scope: AltchaScope;
  title?: string;
}

export function CommunityProofOfWorkModal({
  action,
  challengeLoader,
  continueDisabled,
  continueLoading,
  description = "This runs locally and usually takes a few seconds.",
  locale,
  onContinue,
  onOpenChange,
  onPayloadChange,
  open,
  requirements,
  requirementStatuses,
  scope,
  title = "Checking browser",
}: CommunityProofOfWorkModalProps) {
  return (
    <CommunityInteractionGateModal
      body={(
        <AltchaPowWidget
          key={`${action}:${scope}:${open ? "open" : "closed"}`}
          action={action}
          challengeLoader={challengeLoader}
          locale={locale}
          onPayloadChange={onPayloadChange}
          scope={scope}
        />
      )}
      description={description}
      icon="blocked"
      onOpenChange={onOpenChange}
      open={open}
      primaryAction={{
        disabled: continueDisabled,
        label: "Continue",
        loading: continueLoading,
        onClick: onContinue,
      }}
      requirements={requirements}
      requirementStatuses={requirementStatuses}
      title={title}
    />
  );
}
