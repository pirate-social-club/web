"use client";

import * as React from "react";

import { Button } from "@/components/primitives/button";
import { CopyField } from "@/components/primitives/copy-field";
import { Type } from "@/components/primitives/type";
import { defaultRouteCopy } from "../../system/route-copy-defaults";
import { useResettableTimeout } from "@/hooks/use-resettable-timeout";
import { cn } from "@/lib/utils";
import { Check, Copy } from "@phosphor-icons/react";

import type {
  NamespaceFamily,
  NamespaceVerificationModalState,
  NamespaceVerificationOperationClass,
  NamespaceVerificationStartResult,
  SpacesChallengePayload,
} from "@/components/compositions/verification/verify-namespace-modal/verify-namespace-modal.types";

type NamespaceSessionStateSetters = {
  setSessionId: React.Dispatch<React.SetStateAction<string | null>>;
  setChallengeHost: React.Dispatch<React.SetStateAction<string | null>>;
  setChallengeTxtValue: React.Dispatch<React.SetStateAction<string | null>>;
  setChallengePayload: React.Dispatch<React.SetStateAction<SpacesChallengePayload | null>>;
  setActiveFamily: React.Dispatch<React.SetStateAction<NamespaceFamily>>;
  setRootLabel: React.Dispatch<React.SetStateAction<string>>;
  setSignature: React.Dispatch<React.SetStateAction<string>>;
  setOperationClass: React.Dispatch<React.SetStateAction<NamespaceVerificationOperationClass | null>>;
  setPirateDnsAuthorityVerified: React.Dispatch<React.SetStateAction<boolean | null>>;
  setSetupNameservers: React.Dispatch<React.SetStateAction<string[] | null>>;
  setFailureReason: React.Dispatch<React.SetStateAction<string | null>>;
  setState: React.Dispatch<React.SetStateAction<NamespaceVerificationModalState>>;
  onSessionCleared?: () => void;
};

export function applyNamespaceSessionResult(
  setters: NamespaceSessionStateSetters,
  result: NamespaceVerificationStartResult,
) {
  setters.setSessionId(result.namespaceVerificationSessionId);
  setters.setChallengeHost(result.challengeHost);
  setters.setChallengeTxtValue(result.challengeTxtValue);
  setters.setChallengePayload(result.challengePayload);
  setters.setActiveFamily(result.family);
  setters.setRootLabel(result.rootLabel);
  setters.setSignature("");
  setters.setOperationClass(result.operationClass);
  setters.setPirateDnsAuthorityVerified(result.pirateDnsAuthorityVerified);
  setters.setSetupNameservers(result.setupNameservers);
  setters.setFailureReason(null);

  if (result.status === "verified") {
    setters.setState("verified");
    setters.onSessionCleared?.();
    return;
  }

  if (result.status === "dns_setup_required") {
    setters.setState("dns_setup_required");
    return;
  }

  if (result.status === "expired") {
    setters.setState("expired");
    return;
  }

  if (result.status === "challenge_pending") {
    setters.setState("challenge_pending");
    return;
  }

  if (result.status === "verifying") {
    setters.setState("verifying");
    return;
  }

  if (result.status === "failed" || result.status === "disputed") {
    setters.setState("failed");
    setters.setFailureReason(result.status === "disputed" ? "conflicting_proof_detected" : null);
    return;
  }

  if (result.status === "draft" || result.status === "inspecting") {
    setters.setState("starting");
    return;
  }

  setters.setState("challenge_ready");
}

function CopyBlock({ value }: { value: string }) {
  const [copied, setCopied] = React.useState(false);
  const { schedule: scheduleCopiedReset } = useResettableTimeout();

  const handleCopy = React.useCallback(async () => {
    await navigator.clipboard.writeText(value);
    setCopied(true);
    scheduleCopiedReset(() => setCopied(false), 2000);
  }, [scheduleCopiedReset, value]);

  return (
    <div className="flex items-start gap-2 overflow-hidden rounded-2xl border border-input bg-background p-3 shadow-sm">
      <pre className="min-w-0 flex-1 whitespace-pre-wrap break-all font-mono text-sm leading-5 text-foreground select-all">
        {value}
      </pre>
      <Button
        aria-label={copied ? "Copied" : "Copy value"}
        className="size-9 shrink-0"
        onClick={handleCopy}
        size="icon"
        variant="secondary"
      >
        {copied ? <Check className="size-5" /> : <Copy className="size-5" />}
      </Button>
    </div>
  );
}

function buildSpacesPublishCommand(challengePayload: SpacesChallengePayload) {
  const root = `@${challengePayload.root_label}`;
  const publisher = "github.com/pirate-social-club/pirate-spaces-publisher@v0.1.0";
  return [
    `go run ${publisher} publish ${shellQuote(root)} \\`,
    "  --wallet-export '/PATH/TO/YOUR/WALLET_EXPORT.json' \\",
    `  --web ${shellQuote(challengePayload.web_url)} \\`,
    `  --freedom ${shellQuote(challengePayload.freedom_url)} \\`,
    `  --txt ${shellQuote(`${challengePayload.txt_key}=${challengePayload.txt_value}`)}`,
  ].join("\n");
}

function shellQuote(value: string) {
  return `'${value.replace(/'/g, "'\\''")}'`;
}

type NamespaceVerificationSpacesPanelProps = {
  busy: boolean;
  challengePayload: SpacesChallengePayload;
  className?: string;
  onAbandon: () => void;
  showAbandonAction?: boolean;
};

export function NamespaceVerificationSpacesPanel({
  busy,
  challengePayload,
  className,
  onAbandon,
  showAbandonAction = true,
}: NamespaceVerificationSpacesPanelProps) {
  const copy = defaultRouteCopy;
  const mc = copy.moderation.namespaceVerification;
  const publishCommand = React.useMemo(
    () => buildSpacesPublishCommand(challengePayload),
    [challengePayload],
  );

  return (
    <div className={cn("space-y-6", className)}>
      <ol className="space-y-6">
        <li className="space-y-3">
          <div className="text-base font-medium text-foreground">
            1. {mc.publishStepLabels[0]}
          </div>
          <Type as="p" variant="body">
            {mc.spacesStep1Instruction}
          </Type>
          <CopyField value={mc.spacesStep1Command} />
        </li>
        <li className="space-y-3">
          <div className="text-base font-medium text-foreground">
            2. {mc.publishStepLabels[1]}
          </div>
          <Type as="p" variant="body">
            {mc.spacesStep2Instruction}
          </Type>
          <CopyField value={mc.spacesStep2Command} />
        </li>
        <li className="space-y-3">
          <div className="text-base font-medium text-foreground">
            3. {mc.publishStepLabels[2]}
          </div>
          <Type as="p" variant="body">
            {mc.spacesStep3Instruction}
          </Type>
          <CopyBlock value={publishCommand} />
        </li>
      </ol>
      {showAbandonAction ? (
        <div className="border-t border-border-soft pt-4">
          <Button
            disabled={busy}
            onClick={onAbandon}
            size="sm"
            variant="ghost"
          >
            {mc.verifyDifferent}
          </Button>
        </div>
      ) : null}
    </div>
  );
}
