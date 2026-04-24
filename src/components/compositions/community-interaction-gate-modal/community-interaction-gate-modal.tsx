"use client";

import type { MembershipGateSummary } from "@pirate/api-contracts";

import {
  Modal,
  ModalContent,
  ModalDescription,
  ModalFooter,
  ModalHeader,
  ModalTitle,
} from "@/components/compositions/modal/modal";
import { VerificationIconBadge, type VerificationModalIconKind } from "@/components/compositions/verification-modal-header/verification-modal-header";
import { Button } from "@/components/primitives/button";
import { cn } from "@/lib/utils";
import { typeVariants } from "@/components/primitives/type";
import { formatGateRequirement } from "@/lib/identity-gates";
import { useUiLocale } from "@/lib/ui-locale";

export interface CommunityInteractionGateAction {
  label: string;
  loading?: boolean;
  onClick: () => void | Promise<void>;
}

export interface CommunityInteractionGateModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: string;
  icon?: VerificationModalIconKind | null;
  requirements?: MembershipGateSummary[];
  primaryAction?: CommunityInteractionGateAction | null;
  secondaryAction?: CommunityInteractionGateAction | null;
}

export function CommunityInteractionGateModal({
  open,
  onOpenChange,
  title,
  description,
  icon,
  requirements,
  primaryAction,
  secondaryAction,
}: CommunityInteractionGateModalProps) {
  const { dir, locale } = useUiLocale();
  const items = (requirements ?? [])
    .map((gate) => formatGateRequirement(gate, { locale }))
    .filter(Boolean);
  const actionCount = Number(Boolean(primaryAction)) + Number(Boolean(secondaryAction));
  const hasActions = actionCount > 0;
  const hasTwoActions = actionCount === 2;

  return (
    <Modal onOpenChange={onOpenChange} open={open}>
      <ModalContent
        className="flex max-h-[90vh] min-h-[17rem] flex-col overflow-y-auto px-5 pb-[calc(1.25rem+env(safe-area-inset-bottom))] pt-5 sm:min-h-72 sm:max-w-lg sm:px-6 sm:pb-6 sm:pt-6"
        dir={dir}
        mobileSide="bottom"
      >
        <ModalHeader className="space-y-3 pr-10 text-start">
          <div className="flex items-center gap-3">
            {icon ? <VerificationIconBadge icon={icon} /> : null}
            <ModalTitle className={cn(typeVariants({ variant: "h2" }), "min-w-0 leading-7 sm:leading-8")} dir="auto">
              {title}
            </ModalTitle>
          </div>
          <ModalDescription className="max-w-[42ch] text-base leading-7" dir="auto">
            {description}
          </ModalDescription>
        </ModalHeader>

        {items.length > 0 ? (
          <div className="mt-5 space-y-2 rounded-[var(--radius-lg)] border border-border-soft bg-muted/20 px-4 py-4 sm:mt-6">
            {items.map((item, index) => (
              <p className="text-base leading-6 text-foreground" dir="auto" key={`${item}-${index}`}>
                {item}
              </p>
            ))}
          </div>
        ) : null}

        <ModalFooter className={`flex-col gap-3 ${hasActions ? "mt-auto pt-8 sm:pt-10" : "mt-auto"} ${hasTwoActions ? "sm:grid sm:grid-cols-2 sm:justify-stretch" : "sm:flex sm:justify-end"}`}>
          {secondaryAction ? (
            <Button
              className={`h-12 w-full ${hasTwoActions ? "" : "sm:w-2/5"}`}
              loading={secondaryAction.loading}
              onClick={() => void secondaryAction.onClick()}
              variant="secondary"
            >
              {secondaryAction.label}
            </Button>
          ) : null}
          {primaryAction ? (
            <Button
              className={`h-12 w-full ${hasTwoActions ? "" : "sm:w-2/5"}`}
              loading={primaryAction.loading}
              onClick={() => void primaryAction.onClick()}
            >
              {primaryAction.label}
            </Button>
          ) : null}
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
}
