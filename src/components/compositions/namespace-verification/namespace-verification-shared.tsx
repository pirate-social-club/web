"use client";

import * as React from "react";

import { Button } from "@/components/primitives/button";
import { FormFieldLabel } from "@/components/primitives/form-layout";
import { Input } from "@/components/primitives/input";
import { useRouteMessages } from "@/app/authenticated-routes/route-core";
import { cn } from "@/lib/utils";
import { buildSpacesSigningHelperSteps } from "./spaces-signing-helper";

import type {
  NamespaceFamily,
  NamespaceVerificationModalState,
  NamespaceVerificationOperationClass,
  NamespaceVerificationStartResult,
  SpacesChallengePayload,
} from "@/components/compositions/verify-namespace-modal/verify-namespace-modal.types";

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

export function NamespaceVerificationChallengeMessage({ value }: { value: string }) {
  const { copy } = useRouteMessages();
  const mc = copy.moderation.namespaceVerification.shared;
  const [copied, setCopied] = React.useState(false);

  const handleCopy = React.useCallback(async () => {
    await navigator.clipboard.writeText(value);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 2000);
  }, [value]);

  return (
    <div className="rounded-xl border border-input bg-background p-3">
      <pre className="mb-3 whitespace-pre-wrap break-all font-mono text-base leading-6 text-muted-foreground">
        {value}
      </pre>
      <Button className="h-9 text-base" onClick={handleCopy} size="sm" variant="outline">
        {copied ? mc.copied : mc.copyMessage}
      </Button>
    </div>
  );
}

type NamespaceVerificationSpacesPanelProps = {
  busy: boolean;
  challengePayload: SpacesChallengePayload;
  className?: string;
  modal?: boolean;
  onAbandon: () => void;
  onSignatureChange: (value: string) => void;
  signature: string;
};

export function NamespaceVerificationSpacesPanel({
  busy,
  challengePayload,
  className,
  modal = false,
  onAbandon,
  onSignatureChange,
  signature,
}: NamespaceVerificationSpacesPanelProps) {
  const { copy } = useRouteMessages();
  const mc = copy.moderation.namespaceVerification;
  const signingHelperSteps = React.useMemo(
    () => buildSpacesSigningHelperSteps(challengePayload),
    [challengePayload],
  );

  return (
    <div className={cn("space-y-4", className)}>
      <ol className="space-y-4">
        {signingHelperSteps.map((step, index) => (
          <li className="space-y-2" key={step}>
            <div className="text-base font-medium text-foreground">
              {index + 1}. {mc.signingStepLabels[index] ?? mc.signingStepLabels[2]}
            </div>
            <NamespaceVerificationChallengeMessage value={step} />
          </li>
        ))}
      </ol>
      <div className="space-y-3">
        <div className="space-y-1.5">
          <FormFieldLabel label={mc.signatureLabel} />
          <Input
            disabled={busy}
            onChange={(event) => onSignatureChange(event.target.value)}
            placeholder={modal ? mc.signaturePlaceholderModal : mc.signaturePlaceholder}
            value={signature}
          />
        </div>
      </div>
      <button
        className="text-base text-muted-foreground transition-colors hover:text-foreground"
        onClick={onAbandon}
        type="button"
      >
        {mc.verifyDifferent}
      </button>
    </div>
  );
}
