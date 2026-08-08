"use client";

import * as React from "react";
import type { MembershipGateSummary } from "@pirate/api-contracts";

import { CommunityInteractionGateModal } from "@/components/compositions/community/interaction-gate-modal/community-interaction-gate-modal";
import { Button } from "@/components/primitives/button";
import {
  formatGateRequirement,
  type HumanVerificationProvider,
} from "@/lib/identity-gates";
import { getLocaleMessages } from "@/locales";
import { isUiLocaleCode } from "@/lib/ui-locale-core";

export interface CommunityJoinVerificationChooserModalProps {
  choices?: MembershipGateSummary[];
  locale?: string | null;
  onChoose?: (gate: MembershipGateSummary) => void | Promise<void>;
  onChooseProvider?: (provider: HumanVerificationProvider) => void | Promise<void>;
  onOpenChange: (open: boolean) => void;
  open: boolean;
  providerChoices?: HumanVerificationProvider[];
}

const PROVIDER_LABELS: Record<HumanVerificationProvider, string> = {
  self: "Self",
  very: "Very",
  zkpassport: "ZKPassport",
};

export function CommunityJoinVerificationChooserModal({
  choices,
  locale,
  onChoose,
  onChooseProvider,
  onOpenChange,
  open,
  providerChoices = [],
}: CommunityJoinVerificationChooserModalProps) {
  const [selectedKey, setSelectedKey] = React.useState<string | null>(null);
  const resolvedLocale = locale && isUiLocaleCode(locale) ? locale : "en";
  const copy = getLocaleMessages(resolvedLocale, "gates");

  React.useEffect(() => {
    if (!open) setSelectedKey(null);
  }, [open]);

  const body = (
    <div aria-label={copy.modal.chooseOne} className="grid gap-2">
      {providerChoices.map((provider) => {
        const key = `provider:${provider}`;
        return (
          <Button
            className="h-auto min-h-12 justify-start whitespace-normal px-4 py-3 text-left"
            disabled={selectedKey !== null && selectedKey !== key}
            key={key}
            loading={selectedKey === key}
            onClick={async () => {
              setSelectedKey(key);
              try {
                await onChooseProvider?.(provider);
              } finally {
                setSelectedKey(null);
              }
            }}
            variant="secondary"
          >
            Verify with {PROVIDER_LABELS[provider]}
          </Button>
        );
      })}
      {(choices ?? []).map((gate, index) => {
        const label = formatGateRequirement(gate, { locale: resolvedLocale });
        const key = `${gate.gate_type}:${label}:${index}`;
        return (
          <Button
            className="h-auto min-h-12 justify-start whitespace-normal px-4 py-3 text-left"
            disabled={selectedKey !== null && selectedKey !== key}
            key={key}
            loading={selectedKey === key}
            onClick={async () => {
              setSelectedKey(key);
              try {
                await onChoose?.(gate);
              } finally {
                setSelectedKey(null);
              }
            }}
            variant="secondary"
          >
            {label}
          </Button>
        );
      })}
    </div>
  );

  return (
    <CommunityInteractionGateModal
      body={body}
      description={copy.panel.verificationRequiredDescription}
      icon="blocked"
      onOpenChange={onOpenChange}
      open={open}
      title={copy.modal.anyTitle}
    />
  );
}
