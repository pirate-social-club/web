"use client";

import type * as React from "react";
import type { MembershipGateSummary } from "@pirate/api-contracts";

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
import { getLocaleMessages } from "@/locales";
import type {
  CommunityGateRequirementGroup,
  CommunityGateRequirementStatus,
} from "@/components/compositions/community/gate-requirements.types";

export interface CommunityInteractionGateAction {
  label: string;
  disabled?: boolean;
  href?: string;
  loading?: boolean;
  onClick?: () => void | Promise<void>;
  rel?: string;
  target?: string;
}

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
  requirementGroups?: CommunityGateRequirementGroup[];
  requirementsMode?: "all" | "any";
  requirementStatuses?: CommunityGateRequirementStatus[];
  primaryAction?: CommunityInteractionGateAction | null;
  secondaryAction?: CommunityInteractionGateAction | null;
}

type FormattedRequirementItem = {
  label: string;
  status: "met" | "unmet" | "unknown";
};

type FormattedRequirementGroup = {
  mode: "all" | "any";
  items: FormattedRequirementItem[];
};

function formatRequirementSentence(groups: FormattedRequirementGroup[], locale: string): string | null {
  if (groups.length === 0) return null;

  const listLocale = locale === "pseudo" ? "en" : locale;
  const formatList = (items: FormattedRequirementItem[], mode: "all" | "any") => {
    const labels = items.map((item) => item.label);
    if (labels.length === 0) return null;
    if (labels.length === 1) return labels[0];
    return new Intl.ListFormat(listLocale, {
      style: "long",
      type: mode === "any" ? "disjunction" : "conjunction",
    }).format(labels);
  };

  const allParts = groups.filter((group) => group.mode === "all").flatMap((group) => group.items);
  const anyGroups = groups.filter((group) => group.mode === "any");
  const requiredText = formatList(allParts, "all");
  const alternativeTexts = anyGroups.flatMap((group) => {
    const text = formatList(group.items, "any");
    return text ? [text] : [];
  });

  if (alternativeTexts.length > 0) {
    return `Either ${alternativeTexts.join(" or ")} is accepted.`;
  }
  return requiredText ? `Complete ${requiredText}.` : null;
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
  requirementGroups,
  requirementsMode,
  requirementStatuses,
  primaryAction,
  secondaryAction,
}: CommunityInteractionGateModalProps) {
  const { locale } = useUiLocale();
  const isMobile = useIsMobile();
  const copy = getLocaleMessages(locale, "gates").modal;
  const visibleSecondaryAction = hideSecondaryActionOnMobile && isMobile ? null : secondaryAction;
  const requirementProvider = icon === "self" || icon === "very" || icon === "passport" ? icon : null;
  const formatItems = (
    nextRequirements: MembershipGateSummary[],
    nextStatuses?: CommunityGateRequirementStatus[],
  ): FormattedRequirementItem[] => nextRequirements.reduce<FormattedRequirementItem[]>((result, gate, index) => {
    const provider = gate.gate_type === "unique_human" && !gate.accepted_providers?.length
      ? requirementProvider
      : null;
    const label = formatGateRequirement(gate, { locale, provider });
    if (label) {
      result.push({
        label,
        status: nextStatuses?.[index] ?? "unknown",
      });
    }
    return result;
  }, []);
  const fallbackItems = formatItems(requirements ?? [], requirementStatuses);
  const groups: FormattedRequirementGroup[] = requirementGroups?.length
    ? requirementGroups.map((group) => ({
        mode: group.mode,
        items: formatItems(group.requirements, group.requirementStatuses),
      })).filter((group) => group.items.length > 0)
    : fallbackItems.length > 0
      ? [{ mode: requirementsMode ?? "all", items: fallbackItems }]
      : [];
  const hasAnyAlternatives = groups.some((group) => group.mode === "any" && group.items.length > 1);
  const resolvedTitle = hasAnyAlternatives ? copy.anyTitle : title;
  const requirementSentence = groups.some((group) => group.items.length > 1)
    ? formatRequirementSentence(groups, locale)
    : null;
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
          title={resolvedTitle}
        />

        {requirementSentence ? (
          <Type
            as="p"
            className="mt-5 rounded-[var(--radius-lg)] border border-border-soft bg-muted/20 p-4 text-base leading-6 text-foreground sm:mt-6"
            dir="auto"
          >
            {requirementSentence}
          </Type>
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
