"use client";

import * as React from "react";
import { DownloadSimple, UploadSimple } from "@phosphor-icons/react";

import { Button } from "@/components/primitives/button";
import { useRouteMessages } from "@/app/authenticated-routes/route-core";
import { cn } from "@/lib/utils";

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

function buildSpacesNostrEvent(challengePayload: SpacesChallengePayload) {
  if (challengePayload.nostr_event) {
    return challengePayload.nostr_event;
  }
  const root = `@${challengePayload.root_label}`;
  return {
    created_at: Math.floor(new Date(challengePayload.issued_at).getTime() / 1000),
    kind: 27235,
    tags: [
      ["space", root],
      ["pirate", "namespace-verification"],
      ["domain", challengePayload.domain],
      ["nonce", challengePayload.nonce],
      ["root", root],
    ],
    content: challengePayload.message,
  };
}

function downloadJson(filename: string, value: unknown) {
  const blob = new Blob([`${JSON.stringify(value, null, 2)}\n`], {
    type: "application/json",
  });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  document.body.append(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}

type NamespaceVerificationSpacesPanelProps = {
  busy: boolean;
  challengePayload: SpacesChallengePayload;
  className?: string;
  onAbandon: () => void;
  onSignatureChange: (value: string) => void;
  signature: string;
};

export function NamespaceVerificationSpacesPanel({
  busy,
  challengePayload,
  className,
  onAbandon,
  onSignatureChange,
  signature,
}: NamespaceVerificationSpacesPanelProps) {
  const { copy } = useRouteMessages();
  const mc = copy.moderation.namespaceVerification;
  const fileInputRef = React.useRef<HTMLInputElement | null>(null);
  const unsignedEvent = React.useMemo(
    () => buildSpacesNostrEvent(challengePayload),
    [challengePayload],
  );
  const signedEventLoaded = signature.trim().length > 0;

  const handleDownload = React.useCallback(() => {
    downloadJson(`pirate-space-${challengePayload.root_label}-verify.json`, unsignedEvent);
  }, [challengePayload.root_label, unsignedEvent]);

  const handleSignedFileChange = React.useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0] ?? null;
      if (!file) return;
      void file.text().then((text) => {
        onSignatureChange(text);
      });
      event.target.value = "";
    },
    [onSignatureChange],
  );

  return (
    <div className={cn("space-y-4", className)}>
      <ol className="space-y-4">
        <li className="space-y-2">
          <div className="text-base font-medium text-foreground">
            1. {mc.signingStepLabels[0]}
          </div>
          <Button
            disabled={busy}
            leadingIcon={<DownloadSimple className="size-5" />}
            onClick={handleDownload}
            variant="outline"
          >
            {mc.downloadEventJson}
          </Button>
        </li>
        <li className="space-y-2">
          <div className="text-base font-medium text-foreground">
            2. {mc.signingStepLabels[1]}
          </div>
          <div className="rounded-lg border border-input bg-background p-3 text-base leading-6 text-muted-foreground">
            {mc.akronSignInstruction}
          </div>
        </li>
        <li className="space-y-2">
          <div className="text-base font-medium text-foreground">
            3. {mc.signingStepLabels[2]}
          </div>
          <input
            accept="application/json,.json"
            className="hidden"
            disabled={busy}
            onChange={handleSignedFileChange}
            ref={fileInputRef}
            type="file"
          />
          <Button
            disabled={busy}
            leadingIcon={<UploadSimple className="size-5" />}
            onClick={() => fileInputRef.current?.click()}
            variant={signedEventLoaded ? "secondary" : "outline"}
          >
            {signedEventLoaded ? mc.signedEventLoaded : mc.uploadSignedEventJson}
          </Button>
        </li>
        {signature.trim() && !signature.trim().startsWith("{") ? (
          <li className="space-y-2">
            <div className="text-base font-medium text-foreground">
              {mc.signatureLabel}
            </div>
            <NamespaceVerificationChallengeMessage value={signature} />
          </li>
        ) : null}
      </ol>
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
