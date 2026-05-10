"use client";

import type * as React from "react";
import type { MembershipGateSummary } from "@pirate/api-contracts";
import { CheckCircle, Circle } from "@phosphor-icons/react";

import {
  Modal,
  ModalFooter,
} from "@/components/compositions/system/modal/modal";
import {
  StandardModalContent,
  StandardModalHeader,
} from "@/components/compositions/system/modal/standard-modal-layout";
import { VerificationIconBadge, type VerificationModalIconKind } from "@/components/compositions/verification/verification-modal-header/verification-modal-header";
import { Button } from "@/components/primitives/button";
import { Type } from "@/components/primitives/type";
import { VerificationAppDownloadLinks } from "@/components/compositions/verification/verification-app-download-links/verification-app-download-links";
import { useIsMobile } from "@/hooks/use-mobile";
import { cn } from "@/lib/utils";
import { formatGateRequirement } from "@/lib/identity-gates";
import { useUiLocale } from "@/lib/ui-locale";

export interface CommunityInteractionGateAction {
  label: string;
  disabled?: boolean;
  href?: string;
  loading?: boolean;
  onClick?: () => void | Promise<void>;
  rel?: string;
  target?: string;
}

export type CommunityInteractionGateRequirementStatus = "met" | "unmet" | "unknown";

export interface CommunityInteractionGateModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: string;
  body?: React.ReactNode;
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
  body,
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
  const items = (requirements ?? []).reduce<Array<{ label: string; status: "met" | "unmet" | "unknown" }>>((result, gate, index) => {
    const label = formatGateRequirement(gate, { locale, provider: requirementProvider });
    if (label) {
      result.push({
        label,
        status: requirementStatuses?.[index] ?? "unknown",
      });
    }
    return result;
  }, []);
  const actionCount = Number(Boolean(primaryAction)) + Number(Boolean(visibleSecondaryAction));
  const hasActions = actionCount > 0;
  const hasTwoActions = actionCount === 2;
  const renderAction = (action: CommunityInteractionGateAction, variant?: "secondary") => {
    if (action.href) {
      return (
        <Button
          asChild
          className="h-12 w-full"
          disabled={action.disabled}
          loading={action.loading}
          variant={variant}
        >
          <a
            href={action.href}
            onClick={() => void action.onClick?.()}
            rel={action.rel ?? (action.target === "_blank" ? "noopener noreferrer" : undefined)}
            target={action.target}
          >
            {action.label}
          </a>
        </Button>
      );
    }

    return (
      <Button
        className="h-12 w-full"
        disabled={action.disabled || !action.onClick}
        loading={action.loading}
        onClick={() => void action.onClick?.()}
        variant={variant}
      >
        {action.label}
      </Button>
    );
  };

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
          <div className="mt-5 space-y-2 rounded-[var(--radius-lg)] border border-border-soft bg-muted/20 p-4 sm:mt-6" role="list">
            {items.map((item) => (
              <div className="flex items-start gap-2 text-base leading-6 text-foreground" dir="auto" key={`${item.status}:${item.label}`} role="listitem">
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

        {body ? (
          <div className="mt-6">
            {body}
          </div>
        ) : null}

        {icon === "self" || icon === "very" ? (
          <div className="mt-8 space-y-6">
            <div className="flex items-center gap-4">
              <span aria-hidden="true" className="h-px flex-1 bg-border-soft" />
              <Type as="p" className="shrink-0 text-muted-foreground" variant="caption">
                Don&apos;t have the app?
              </Type>
              <span aria-hidden="true" className="h-px flex-1 bg-border-soft" />
            </div>
            <VerificationAppDownloadLinks app={icon} variant="full" />
          </div>
        ) : null}

        <ModalFooter
          className={cn(
            "grid grid-cols-1 gap-3 sm:justify-stretch",
            hasActions ? "mt-auto pt-8 sm:pt-10" : "mt-auto",
            hasTwoActions ? "sm:grid-cols-2" : null,
          )}
        >
          {visibleSecondaryAction ? renderAction(visibleSecondaryAction, "secondary") : null}
          {primaryAction ? renderAction(primaryAction) : null}
        </ModalFooter>
      </StandardModalContent>
    </Modal>
  );
}
