"use client";

import * as React from "react";
import { At, ArrowLeft, Handshake } from "@phosphor-icons/react";

import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/primitives/accordion";
import { Button } from "@/components/primitives/button";
import { CopyField } from "@/components/primitives/copy-field";
import { FormFieldLabel, FormNote } from "@/components/primitives/form-layout";
import { Input } from "@/components/primitives/input";
import { OptionCard } from "@/components/primitives/option-card";
import { PrefixInput } from "@/components/primitives/prefix-input";
import { IconButton } from "@/components/primitives/icon-button";
import { toast } from "@/components/primitives/sonner";
import {
  getHnsVerificationMode,
  NamespaceVerificationHnsPanel,
} from "@/components/compositions/namespace-verification/namespace-verification-hns-ui";
import {
  applyNamespaceSessionResult,
  NamespaceVerificationChallengeMessage,
} from "@/components/compositions/namespace-verification/namespace-verification-shared";
import type {
  NamespaceFamily,
  NamespaceVerificationCallbacks,
  NamespaceVerificationModalState,
  NamespaceVerificationStartResult,
  SpacesChallengePayload,
} from "@/components/compositions/verify-namespace-modal/verify-namespace-modal.types";

const namespaceFamilyMeta: Record<NamespaceFamily, {
  label: string;
  externalExample: string;
  detail: string;
  rootInputLabel: string;
  rootInputPrefix?: string;
  icon: React.ReactNode;
}> = {
  hns: {
    label: "Handshake",
    externalExample: "infinity",
    detail: "Set up DNS first, then verify root ownership.",
    rootInputLabel: "Handshake root",
    rootInputPrefix: ".",
    icon: <Handshake className="size-5" />,
  },
  spaces: {
    label: "Spaces",
    externalExample: "infinity",
    detail: "Verify root ownership by signing a challenge.",
    rootInputLabel: "Spaces root",
    rootInputPrefix: "@",
    icon: <At className="size-5" />,
  },
};

export interface CommunityNamespaceVerificationPageProps {
  activeSessionId?: string | null;
  callbacks: NamespaceVerificationCallbacks;
  initialFamily?: NamespaceFamily;
  initialRootLabel?: string;
  onBackClick?: () => void;
  onSessionCleared?: () => void;
  onSessionStarted?: (sessionId: string) => void;
  onVerified?: (namespaceVerificationId: string) => void;
}

export function CommunityNamespaceVerificationPage({
  activeSessionId,
  callbacks,
  initialFamily,
  initialRootLabel = "",
  onBackClick,
  onSessionCleared,
  onSessionStarted,
  onVerified,
}: CommunityNamespaceVerificationPageProps) {
  const [rootLabel, setRootLabel] = React.useState(initialRootLabel);
  const rootLabelRef = React.useRef(rootLabel);
  rootLabelRef.current = rootLabel;
  const [activeFamily, setActiveFamily] = React.useState<NamespaceFamily>(initialFamily ?? "hns");
  const [state, setState] = React.useState<NamespaceVerificationModalState>("idle");
  const [sessionId, setSessionId] = React.useState<string | null>(null);
  const [challengeHost, setChallengeHost] = React.useState<string | null>(null);
  const [challengeTxtValue, setChallengeTxtValue] = React.useState<string | null>(null);
  const [challengePayload, setChallengePayload] = React.useState<SpacesChallengePayload | null>(null);
  const [signature, setSignature] = React.useState("");
  const [namespaceVerificationId, setNamespaceVerificationId] = React.useState<string | null>(null);
  const [failureReason, setFailureReason] = React.useState<string | null>(null);
  const [operationClass, setOperationClass] =
    React.useState<NamespaceVerificationStartResult["operationClass"]>(null);
  const [pirateDnsAuthorityVerified, setPirateDnsAuthorityVerified] =
    React.useState<NamespaceVerificationStartResult["pirateDnsAuthorityVerified"]>(null);
  const [setupNameservers, setSetupNameservers] =
    React.useState<NamespaceVerificationStartResult["setupNameservers"]>(null);
  const [resuming, setResuming] = React.useState(false);

  const callbacksRef = React.useRef(callbacks);
  callbacksRef.current = callbacks;
  const handleSessionCleared = React.useCallback(() => {
    onSessionCleared?.();
  }, [onSessionCleared]);

  const resetChallengeState = React.useCallback(() => {
    setSessionId(null);
    setChallengeHost(null);
    setChallengeTxtValue(null);
    setChallengePayload(null);
    setSignature("");
    setOperationClass(null);
    setPirateDnsAuthorityVerified(null);
    setSetupNameservers(null);
  }, []);

  const applySessionResult = React.useCallback((result: NamespaceVerificationStartResult) => {
    applyNamespaceSessionResult({
      setSessionId,
      setChallengeHost,
      setChallengeTxtValue,
      setChallengePayload,
      setActiveFamily,
      setRootLabel,
      setSignature,
      setOperationClass,
      setPirateDnsAuthorityVerified,
      setSetupNameservers,
      setFailureReason,
      setState,
      onSessionCleared: handleSessionCleared,
    }, result);
  }, [handleSessionCleared]);

  React.useEffect(() => {
    setRootLabel(initialRootLabel);
    setActiveFamily(initialFamily ?? "hns");
    setState("idle");
    resetChallengeState();
    setNamespaceVerificationId(null);
    setFailureReason(null);

    if (!activeSessionId) {
      return;
    }

    setResuming(true);
    setState("starting");
    void callbacksRef.current.onGetSession({ namespaceVerificationSessionId: activeSessionId })
      .then((result) => {
        applySessionResult(result);
      })
      .catch(() => {
        setState("idle");
        resetChallengeState();
        onSessionCleared?.();
      })
      .finally(() => {
        setResuming(false);
      });
  }, [activeSessionId, applySessionResult, initialFamily, initialRootLabel, onSessionCleared, resetChallengeState]);

  const handleStart = React.useCallback(() => {
    const trimmed = rootLabel.trim().replace(/^[@.]/, "");
    if (!trimmed) return;

    setState("starting");
    setFailureReason(null);

    void callbacks.onStartSession({ family: activeFamily, rootLabel: trimmed })
      .then((result) => {
        applySessionResult(result);
        onSessionStarted?.(result.namespaceVerificationSessionId);
      })
      .catch((error: unknown) => {
        setState("idle");
        toast.error(error instanceof Error ? error.message : "Could not start verification");
      });
  }, [activeFamily, applySessionResult, callbacks, onSessionStarted, rootLabel]);

  const handleVerify = React.useCallback(() => {
    if (!sessionId) return;

    setState("verifying");
    setFailureReason(null);

    const completeInput: Parameters<NamespaceVerificationCallbacks["onCompleteSession"]>[0] = {
      namespaceVerificationSessionId: sessionId,
      family: activeFamily,
    };

    if (activeFamily === "spaces" && challengePayload && signature.trim()) {
      completeInput.signaturePayload = {
        signature: signature.trim(),
        signer_pubkey: challengePayload.root_pubkey,
      };
    }

    void callbacks.onCompleteSession(completeInput)
      .then((result) => {
        if (result.status === "verified" && result.namespaceVerificationId) {
          setState("verified");
          setNamespaceVerificationId(result.namespaceVerificationId);
          onVerified?.(result.namespaceVerificationId);
          onSessionCleared?.();
        } else if (result.status === "dns_setup_required") {
          setState("dns_setup_required");
          setFailureReason(null);
        } else if (result.status === "challenge_pending") {
          setState("challenge_pending");
          setFailureReason(null);
        } else if (result.status === "expired") {
          setState("expired");
        } else {
          setState("failed");
          setFailureReason(result.failureReason);
        }
      })
      .catch((error: unknown) => {
        setState("failed");
        toast.error(error instanceof Error ? error.message : "Could not verify namespace");
      });
  }, [activeFamily, callbacks, challengePayload, onSessionCleared, onVerified, sessionId, signature]);

  const handleRestart = React.useCallback(() => {
    if (!sessionId) {
      const trimmed = rootLabelRef.current.trim().replace(/^[@.]/, "");
      if (!trimmed) {
        setState("idle");
        resetChallengeState();
        return;
      }

      setState("starting");
      setFailureReason(null);

      void callbacks.onStartSession({ family: activeFamily, rootLabel: trimmed })
        .then((result) => {
          applySessionResult(result);
          onSessionStarted?.(result.namespaceVerificationSessionId);
        })
        .catch((error: unknown) => {
          setState("idle");
          resetChallengeState();
          toast.error(error instanceof Error ? error.message : "Could not start verification");
        });
      return;
    }

    setState("starting");
    void callbacks.onCompleteSession({
      namespaceVerificationSessionId: sessionId,
      family: activeFamily,
      restartChallenge: true,
    })
      .then((result) => {
        if (result.status === "expired") {
          setState("expired");
          return;
        }

        void callbacks.onGetSession({ namespaceVerificationSessionId: sessionId })
          .then((sessionResult) => {
            applySessionResult(sessionResult);
          })
          .catch((error: unknown) => {
            setState("idle");
            resetChallengeState();
            toast.error(error instanceof Error ? error.message : "Could not refresh verification");
          });
      })
      .catch((error: unknown) => {
        setState("failed");
        toast.error(error instanceof Error ? error.message : "Could not refresh verification");
      });
  }, [activeFamily, applySessionResult, callbacks, onSessionStarted, resetChallengeState, sessionId]);

  const handleAbandon = React.useCallback(() => {
    onSessionCleared?.();
    setState("idle");
    resetChallengeState();
    setNamespaceVerificationId(null);
    setFailureReason(null);
  }, [onSessionCleared, resetChallengeState]);

  const isIdle = state === "idle";
  const isStarting = state === "starting";
  const isChallengeReady = state === "challenge_ready";
  const isChallengePending = state === "challenge_pending";
  const isDnsSetupRequired = state === "dns_setup_required";
  const isVerifying = state === "verifying";
  const isVerified = state === "verified";
  const isFailed = state === "failed";
  const isExpired = state === "expired";
  const busy = isStarting || isVerifying;
  const hasRootInput = rootLabel.trim().replace(/^[@.]/, "").length > 0;
  const isHns = activeFamily === "hns";
  const isSpaces = activeFamily === "spaces";
  const meta = namespaceFamilyMeta[activeFamily];
  const canSubmitSignature = isSpaces ? signature.trim().length > 0 : true;
  const hnsMode = isHns
    ? getHnsVerificationMode({
      state,
      challengeHost,
      challengeTxtValue,
      pirateDnsAuthorityVerified,
      operationClass,
    })
    : null;
  const shouldShowResumeState =
    resuming
    || (Boolean(activeSessionId)
      && !sessionId
      && state !== "verified"
      && state !== "expired"
      && state !== "failed"
      && state !== "challenge_ready"
      && state !== "challenge_pending");

  return (
    <section className="mx-auto flex w-full max-w-[64rem] flex-col gap-8">
      <div className="flex items-start justify-between gap-6">
        <div className="flex min-w-0 items-start gap-4">
          <IconButton aria-label="Back" onClick={onBackClick} variant="ghost">
            <ArrowLeft className="size-6" />
          </IconButton>
          <div className="min-w-0 space-y-2">
            <h1 className="text-[2.25rem] font-semibold tracking-tight">Verify namespace</h1>
            <p className="text-base text-muted-foreground">
              Attach a verified route to this community.
            </p>
          </div>
        </div>
        {isVerified ? <Button onClick={() => onBackClick?.()}>Done</Button> : null}
      </div>

      <div className="space-y-6">
        {(isIdle || isStarting) && !shouldShowResumeState ? (
          <>
            <div className="space-y-2">
              {(Object.keys(namespaceFamilyMeta) as NamespaceFamily[]).map((family) => {
                const option = namespaceFamilyMeta[family];

                return (
                  <OptionCard
                    description={option.detail}
                    icon={option.icon}
                    key={family}
                    onClick={() => setActiveFamily(family)}
                    selected={family === activeFamily}
                    title={option.label}
                  />
                );
              })}
            </div>

            <div className="space-y-2">
              <FormFieldLabel label={meta.rootInputLabel} />
              <PrefixInput
                disabled={busy}
                onChange={(event) => {
                  setRootLabel(event.target.value);
                }}
                placeholder={meta.externalExample}
                prefix={meta.rootInputPrefix ?? ""}
                value={rootLabel}
              />
            </div>

            {isHns ? (
              <FormNote>
                Start with nameserver setup when the root does not already have authoritative DNS. Only add TXT after that path is live.
              </FormNote>
            ) : null}
          </>
        ) : null}

        {shouldShowResumeState ? (
          <div className="flex items-center justify-center py-12 text-base text-muted-foreground">
            Resuming verification...
          </div>
        ) : null}

        {(isDnsSetupRequired || isChallengeReady || isChallengePending || isVerifying) && isHns && hnsMode ? (
          <NamespaceVerificationHnsPanel
            challengeHost={challengeHost}
            challengePending={isChallengePending}
            challengeTxtValue={challengeTxtValue}
            mode={hnsMode}
            onAbandon={handleAbandon}
            rootLabel={rootLabel}
            setupNameservers={setupNameservers}
          />
        ) : null}

        {(isChallengeReady || isVerifying) && isSpaces && challengePayload ? (
          <section className="space-y-4 rounded-[var(--radius-2xl)] border border-border-soft bg-card px-5 py-5">
            <FormNote>Copy the digest, sign it with your root key, then paste the signature.</FormNote>
            <div className="space-y-3">
              <div className="space-y-1.5">
                <div className="text-base text-muted-foreground">Digest</div>
                <CopyField value={challengePayload.digest} />
              </div>
              <div className="space-y-1.5">
                <FormFieldLabel label="Signature" />
                <Input
                  disabled={busy}
                  onChange={(event) => {
                    setSignature(event.target.value);
                  }}
                  placeholder="Paste your signature"
                  value={signature}
                />
              </div>
            </div>
            <Accordion collapsible type="single">
              <AccordionItem className="border-b-0" value="details">
                <AccordionTrigger className="py-1 text-base text-muted-foreground hover:no-underline">
                  Challenge details
                </AccordionTrigger>
                <AccordionContent className="pb-0">
                    <NamespaceVerificationChallengeMessage value={challengePayload.message} />
                  </AccordionContent>
                </AccordionItem>
              </Accordion>
            <button
              className="text-base text-muted-foreground transition-colors hover:text-foreground"
              onClick={handleAbandon}
              type="button"
            >
              Verify a different namespace
            </button>
          </section>
        ) : null}

        {isVerified ? (
          <div className="rounded-[var(--radius-2xl)] border border-border-soft bg-card px-5 py-4">
            <div className="text-base font-semibold text-foreground">Root verified.</div>
          </div>
        ) : null}

        {(isFailed || isExpired) ? (
          <FormNote tone="warning">
            {isExpired
              ? "Verification expired. Generate a new challenge."
              : failureReason
                ? failureReason.replace(/_/g, " ")
                : isHns && hnsMode === "dns_setup_required"
                  ? "Set nameservers first, then refresh the session."
                  : isHns
                  ? "Could not verify this root. Check the TXT record and try again."
                  : "Could not verify this root. Check the signature and try again."}
          </FormNote>
        ) : null}
      </div>

      <div className="flex justify-end gap-3 border-t border-border-soft pt-6">
        {isDnsSetupRequired ? (
          <>
            <Button onClick={handleAbandon} variant="outline">Cancel</Button>
            <Button loading={isStarting} onClick={handleRestart}>Check setup</Button>
          </>
        ) : null}
        {isChallengePending ? (
          <>
            <Button onClick={handleAbandon} variant="outline">Cancel</Button>
            <Button loading={isVerifying} onClick={handleVerify}>Check again</Button>
          </>
        ) : null}
        {(isFailed || isExpired) ? (
          <>
            <Button onClick={handleAbandon} variant="outline">Cancel</Button>
            {isFailed && isHns ? <Button loading={isVerifying} onClick={handleVerify}>Check again</Button> : null}
            <Button onClick={handleRestart}>{isHns ? "Get new record" : "New challenge"}</Button>
          </>
        ) : null}
        {(isIdle || isStarting) ? (
          <>
            <Button onClick={handleAbandon} variant="outline">Cancel</Button>
            <Button disabled={!hasRootInput} loading={isStarting} onClick={handleStart}>
              {isHns ? "Continue" : "Get challenge"}
            </Button>
          </>
        ) : null}
        {(isChallengeReady || isVerifying) ? (
          <Button disabled={!canSubmitSignature} loading={isVerifying} onClick={handleVerify}>
            {isHns && hnsMode === "pirate_managed" ? "Check again" : "Verify"}
          </Button>
        ) : null}
      </div>
    </section>
  );
}
