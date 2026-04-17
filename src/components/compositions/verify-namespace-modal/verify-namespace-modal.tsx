"use client";

import * as React from "react";
import { At } from "@phosphor-icons/react";
import { Handshake } from "@phosphor-icons/react";

import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/primitives/accordion";
import { Button } from "@/components/primitives/button";
import { CopyField } from "@/components/primitives/copy-field";
import {
  FormFieldLabel,
  FormNote,
} from "@/components/primitives/form-layout";
import { Input } from "@/components/primitives/input";
import {
  Modal,
  ModalContent,
  ModalDescription,
  ModalFooter,
  ModalHeader,
  ModalTitle,
} from "@/components/compositions/modal/modal";
import { OptionCard } from "@/components/primitives/option-card";
import { PrefixInput } from "@/components/primitives/prefix-input";
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
  NamespaceVerificationModalState,
  NamespaceVerificationCallbacks,
  NamespaceVerificationStartResult,
  SpacesChallengePayload,
  VerifyNamespaceModalProps,
} from "./verify-namespace-modal.types";

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
    externalExample: "kanye",
    detail: "Set up DNS first, then verify root ownership.",
    rootInputLabel: "Handshake root",
    rootInputPrefix: ".",
    icon: <Handshake className="size-5" />,
  },
  spaces: {
    label: "Spaces",
    externalExample: "kanye",
    detail: "Verify root ownership by signing a challenge.",
    rootInputLabel: "Spaces root",
    rootInputPrefix: "@",
    icon: <At className="size-5" />,
  },
};

export function VerifyNamespaceModal({
  open,
  onOpenChange,
  onVerified,
  callbacks,
  initialRootLabel = "",
  initialFamily,
  forceMobile,
  activeSessionId,
  onSessionStarted,
  onSessionCleared,
}: VerifyNamespaceModalProps) {
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
  const onSessionStartedRef = React.useRef(onSessionStarted);
  onSessionStartedRef.current = onSessionStarted;
  const onSessionClearedRef = React.useRef(onSessionCleared);
  onSessionClearedRef.current = onSessionCleared;
  const handleSessionCleared = React.useCallback(() => {
    onSessionClearedRef.current?.();
  }, []);

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
    if (!open) return;

    if (activeSessionId) {
      setResuming(true);
      setState("starting");
      void callbacksRef.current.onGetSession({ namespaceVerificationSessionId: activeSessionId })
        .then((result) => {
          applySessionResult(result);
        })
        .catch(() => {
          setState("idle");
          resetChallengeState();
          onSessionClearedRef.current?.();
        })
        .finally(() => {
          setResuming(false);
        });
      return;
    }

    setRootLabel(initialRootLabel);
    setActiveFamily(initialFamily ?? "hns");
    setState("idle");
    resetChallengeState();
    setNamespaceVerificationId(null);
    setFailureReason(null);
  }, [open, activeSessionId, applySessionResult, initialRootLabel, initialFamily, resetChallengeState]);

  const handleStart = React.useCallback(() => {
    const trimmed = rootLabel.trim().replace(/^[@.]/, "");
    if (!trimmed) return;

    setState("starting");
    setFailureReason(null);

    void callbacks.onStartSession({ family: activeFamily, rootLabel: trimmed })
      .then((result) => {
        applySessionResult(result);
        onSessionStartedRef.current?.(result.namespaceVerificationSessionId);
      })
      .catch((error: unknown) => {
        setState("idle");
        toast.error(error instanceof Error ? error.message : "Could not start verification");
      });
  }, [activeFamily, applySessionResult, callbacks, rootLabel]);

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
          onSessionClearedRef.current?.();
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
  }, [callbacks, sessionId, activeFamily, challengePayload, signature, onVerified]);

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
          onSessionStartedRef.current?.(result.namespaceVerificationSessionId);
        })
        .catch((error: unknown) => {
          setState("idle");
          resetChallengeState();
          toast.error(error instanceof Error ? error.message : "Could not start verification");
        });
      return;
    }

    setState("starting");
    setFailureReason(null);

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
  }, [activeFamily, applySessionResult, callbacks, resetChallengeState, sessionId]);

  const handleAbandon = React.useCallback(() => {
    onSessionClearedRef.current?.();
    setState("idle");
    resetChallengeState();
    setNamespaceVerificationId(null);
    setFailureReason(null);
  }, [resetChallengeState]);

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

  return (
    <Modal forceMobile={forceMobile} onOpenChange={onOpenChange} open={open}>
      <ModalContent className="border-border bg-background p-6 sm:w-[min(100%-2rem,34rem)] sm:max-w-[34rem]">
        <ModalHeader className="pr-10 text-left">
          <ModalTitle className="text-[1.6rem] leading-tight tracking-tight sm:text-[1.85rem]">
            Verify namespace
          </ModalTitle>
          <ModalDescription className="max-w-[34ch] text-base leading-7">
            Verify control of a namespace so it can be attached to this community.
          </ModalDescription>
        </ModalHeader>

        <div className="mt-6 space-y-5">
          {(isIdle || isStarting) && !resuming ? (
            <>
              <div className="space-y-2">
                {(Object.keys(namespaceFamilyMeta) as NamespaceFamily[]).map((family) => {
                  const option = namespaceFamilyMeta[family];

                  return (
                    <OptionCard
                      key={family}
                      description={option.detail}
                      icon={option.icon}
                      selected={family === activeFamily}
                      title={option.label}
                      onClick={() => setActiveFamily(family)}
                    />
                  );
                })}
              </div>

              <div>
                <FormFieldLabel className="mb-1.5" label={meta.rootInputLabel} />
                <PrefixInput
                  disabled={busy}
                  onChange={(e) => {
                    setRootLabel(e.target.value);
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

          {resuming ? (
            <div className="flex items-center justify-center py-8 text-base text-muted-foreground">
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
            <div className="space-y-4">
              <FormNote>Copy the digest, sign it with your root key, then paste the signature.</FormNote>
              <div className="space-y-3">
                <div>
                  <p className="mb-1.5 text-base text-muted-foreground">Digest</p>
                  <CopyField value={challengePayload.digest} />
                </div>
                <div>
                  <FormFieldLabel className="mb-1.5" label="Signature" />
                  <Input
                    disabled={busy}
                    onChange={(e) => {
                      setSignature(e.target.value);
                    }}
                    placeholder="Paste your schnorr signature here"
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
                className="text-base text-muted-foreground hover:text-foreground"
                type="button"
                onClick={handleAbandon}
              >
                Verify a different namespace
              </button>
            </div>
          ) : null}

          {isVerified ? (
            <div className="rounded-[var(--radius-lg)] border border-border-soft bg-muted/20 px-4 py-3">
              <p className="text-base font-medium text-foreground">Root verified.</p>
            </div>
          ) : null}

          {(isFailed || isExpired) ? (
            <div className="space-y-3">
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
            </div>
          ) : null}
        </div>

        <ModalFooter className="mt-6 border-t border-border/70 pt-4 sm:pt-5">
          <div className="flex w-full justify-end gap-3">
            {isVerified ? (
              <Button onClick={() => onOpenChange(false)}>Done</Button>
            ) : null}
            {isDnsSetupRequired ? (
              <>
                <Button onClick={() => onOpenChange(false)} variant="outline">Close</Button>
                <Button loading={isStarting} onClick={handleRestart}>Check setup</Button>
              </>
            ) : null}
            {isChallengePending ? (
              <>
                <Button onClick={() => onOpenChange(false)} variant="outline">Close</Button>
                <Button loading={isVerifying} onClick={handleVerify}>Check again</Button>
              </>
            ) : null}
            {(isFailed || isExpired) ? (
              <>
                <Button onClick={() => onOpenChange(false)} variant="outline">Cancel</Button>
                {isFailed && isHns ? (
                  <Button loading={isVerifying} onClick={handleVerify}>Check again</Button>
                ) : null}
                <Button onClick={handleRestart}>{isHns ? "Continue" : "New challenge"}</Button>
              </>
            ) : null}
            {isIdle || isStarting ? (
              <>
                <Button onClick={() => onOpenChange(false)} variant="outline">Cancel</Button>
                <Button disabled={!hasRootInput} loading={isStarting} onClick={handleStart}>{isHns ? "Continue" : "Get challenge"}</Button>
              </>
            ) : null}
            {(isChallengeReady || isVerifying) ? (
              <Button disabled={!canSubmitSignature} loading={isVerifying} onClick={handleVerify}>
                {isHns && hnsMode === "pirate_managed" ? "Check again" : "Verify"}
              </Button>
            ) : null}
          </div>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
}
