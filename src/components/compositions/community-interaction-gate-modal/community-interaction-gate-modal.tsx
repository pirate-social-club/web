"use client";

import type { MembershipGateSummary } from "@pirate/api-contracts";
import { CheckCircle, Circle } from "@phosphor-icons/react";

import {
  Modal,
  ModalFooter,
} from "@/components/compositions/modal/modal";
import {
  StandardModalContent,
  StandardModalHeader,
} from "@/components/compositions/modal/standard-modal-layout";
import { VerificationIconBadge, type VerificationModalIconKind } from "@/components/compositions/verification-modal-header/verification-modal-header";
import { Button } from "@/components/primitives/button";
import { useIsMobile } from "@/hooks/use-mobile";
import { cn } from "@/lib/utils";
import { formatGateRequirement } from "@/lib/identity-gates";
import { useUiLocale } from "@/lib/ui-locale";

export interface CommunityInteractionGateAction {
  label: string;
  loading?: boolean;
  onClick: () => void | Promise<void>;
}

export type CommunityInteractionGateRequirementStatus = "met" | "unmet" | "unknown";

export interface CommunityInteractionGateModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: string;
  icon?: VerificationModalIconKind | null;
  hideCloseButtonOnMobile?: boolean;
  hideSecondaryActionOnMobile?: boolean;
  requirements?: MembershipGateSummary[];
  requirementStatuses?: CommunityInteractionGateRequirementStatus[];
  primaryAction?: CommunityInteractionGateAction | null;
  secondaryAction?: CommunityInteractionGateAction | null;
}

export function CommunityInteractionGateModal({
  open,
  onOpenChange,
  title,
  description,
  icon,
  hideCloseButtonOnMobile = false,
  hideSecondaryActionOnMobile = false,
  requirements,
  requirementStatuses,
  primaryAction,
  secondaryAction,
}: CommunityInteractionGateModalProps) {
  const { locale } = useUiLocale();
  const isMobile = useIsMobile();
  const visibleSecondaryAction = hideSecondaryActionOnMobile && isMobile ? null : secondaryAction;
  const requirementProvider = icon === "self" || icon === "very" || icon === "passport" ? icon : null;
  const items = (requirements ?? [])
    .map((gate, index) => ({
      label: formatGateRequirement(gate, { locale, provider: requirementProvider }),
      status: requirementStatuses?.[index] ?? "unknown",
    }))
    .filter((item) => Boolean(item.label));
  const actionCount = Number(Boolean(primaryAction)) + Number(Boolean(visibleSecondaryAction));
  const hasActions = actionCount > 0;
  const hasTwoActions = actionCount === 2;

  return (
    <Modal onOpenChange={onOpenChange} open={open}>
      <StandardModalContent
        hideCloseButtonOnMobile={hideCloseButtonOnMobile}
      >
        <StandardModalHeader
          description={description}
          icon={icon ? <VerificationIconBadge className="size-16" icon={icon} iconClassName="size-8" /> : null}
          title={title}
        />

        {items.length > 1 ? (
          <div className="mt-5 space-y-2 rounded-[var(--radius-lg)] border border-border-soft bg-muted/20 px-4 py-4 sm:mt-6" role="list">
            {items.map((item, index) => (
              <div className="flex items-start gap-2 text-base leading-6 text-foreground" dir="auto" key={`${item.label}-${index}`} role="listitem">
                {item.status === "met" ? (
                  <CheckCircle aria-label="Met" className="mt-0.5 size-5 shrink-0 text-success" weight="fill" />
                ) : (
                  <Circle aria-label={item.status === "unmet" ? "Not met" : "Required"} className="mt-0.5 size-5 shrink-0 text-muted-foreground" weight="regular" />
                )}
                <span className="min-w-0">{item.label}</span>
              </div>
            ))}
          </div>
        ) : null}

        <ModalFooter
          className={cn(
            "grid grid-cols-1 gap-3 sm:justify-stretch",
            hasActions ? "mt-auto pt-8 sm:pt-10" : "mt-auto",
            hasTwoActions ? "sm:grid-cols-2" : null,
          )}
        >
          {visibleSecondaryAction ? (
            <Button
              className="h-12 w-full"
              loading={visibleSecondaryAction.loading}
              onClick={() => void visibleSecondaryAction.onClick()}
              variant="secondary"
            >
              {visibleSecondaryAction.label}
            </Button>
          ) : null}
          {primaryAction ? (
            <Button
              className="h-12 w-full"
              loading={primaryAction.loading}
              onClick={() => void primaryAction.onClick()}
            >
              {primaryAction.label}
            </Button>
          ) : null}
        </ModalFooter>
      </StandardModalContent>
    </Modal>
  );
}
