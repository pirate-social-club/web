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
import { Button } from "@/components/primitives/button";
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
  requirements?: MembershipGateSummary[];
  primaryAction?: CommunityInteractionGateAction | null;
  secondaryAction?: CommunityInteractionGateAction | null;
}

export function CommunityInteractionGateModal({
  open,
  onOpenChange,
  title,
  description,
  requirements,
  primaryAction,
  secondaryAction,
}: CommunityInteractionGateModalProps) {
  const { dir, locale } = useUiLocale();
  const items = (requirements ?? [])
    .map((gate) => formatGateRequirement(gate, { locale }))
    .filter(Boolean);

  return (
    <Modal onOpenChange={onOpenChange} open={open}>
      <ModalContent className="max-h-[90vh] overflow-y-auto space-y-5 px-5 py-5 sm:max-w-lg sm:space-y-6 sm:px-6" dir={dir} mobileSide="bottom">
        <ModalHeader className="gap-3 text-start">
          <ModalTitle dir="auto">{title}</ModalTitle>
          <ModalDescription dir="auto">{description}</ModalDescription>
        </ModalHeader>

        {items.length > 0 ? (
          <div className="space-y-2 rounded-[var(--radius-lg)] border border-border-soft bg-muted/20 px-4 py-4">
            {items.map((item, index) => (
              <p className="text-base leading-6 text-foreground" dir="auto" key={`${item}-${index}`}>
                {item}
              </p>
            ))}
          </div>
        ) : null}

        <ModalFooter className="mt-1 gap-3">
          {secondaryAction ? (
            <Button
              className="w-full sm:w-auto"
              loading={secondaryAction.loading}
              onClick={() => void secondaryAction.onClick()}
              variant="secondary"
            >
              {secondaryAction.label}
            </Button>
          ) : null}
          {primaryAction ? (
            <Button
              className="w-full sm:w-auto"
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
