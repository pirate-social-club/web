"use client";

import type { MembershipGateSummary } from "@pirate/api-contracts";

import { CommunityInteractionGateModal, type CommunityInteractionGateRequirementStatus } from "@/components/compositions/community/interaction-gate-modal/community-interaction-gate-modal";
import { AltchaPowWidget } from "@/components/compositions/verification/altcha-pow-widget/altcha-pow-widget";
import type { AltchaScope } from "@/lib/api/client-groups-core";
import { getProofOfWorkGateRequirements } from "@/lib/identity-gates";

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

function getProofOfWorkRequirementStatuses(
  requirements: MembershipGateSummary[] | null | undefined,
  requirementStatuses: CommunityInteractionGateRequirementStatus[] | null | undefined,
): CommunityInteractionGateRequirementStatus[] | undefined {
  if (!requirementStatuses) {
    return undefined;
  }
  if (!requirements?.length) {
    return requirementStatuses.length > 0 ? [requirementStatuses[0]] : undefined;
  }

  const proofOfWorkStatuses = requirements.flatMap((requirement, index) =>
    requirement.gate_type === "altcha_pow"
      ? [requirementStatuses[index] ?? "unknown"]
      : []
  );
  return proofOfWorkStatuses.length > 0 ? proofOfWorkStatuses : undefined;
}

export function CommunityProofOfWorkModal({
  action,
  challengeLoader,
  continueDisabled,
  continueLoading,
  description = "This usually takes a few seconds and runs only on this device.",
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
  const proofOfWorkRequirements = getProofOfWorkGateRequirements(requirements);
  const proofOfWorkRequirementStatuses = getProofOfWorkRequirementStatuses(
    requirements,
    requirementStatuses,
  );

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
      requirements={proofOfWorkRequirements}
      requirementStatuses={proofOfWorkRequirementStatuses}
      secondaryAction={{
        label: "Cancel",
        onClick: () => onOpenChange(false),
      }}
      title={title}
    />
  );
}
