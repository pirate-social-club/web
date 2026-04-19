"use client";

import * as React from "react";
import { toast } from "@/components/primitives/sonner";
import {
  getHnsVerificationMode,
} from "@/components/compositions/namespace-verification/namespace-verification-hns-ui";
import {
  applyNamespaceSessionResult,
} from "@/components/compositions/namespace-verification/namespace-verification-shared";

import type {
  NamespaceFamily,
  NamespaceVerificationModalState,
  NamespaceVerificationCallbacks,
  NamespaceVerificationStartResult,
  SpacesChallengePayload,
  VerifyNamespaceModalProps,
} from "./verify-namespace-modal.types";
import { VerifyNamespaceModalView } from "./verify-namespace-modal.view";

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
    <VerifyNamespaceModalView
      activeFamily={activeFamily}
      busy={busy}
      canSubmitSignature={canSubmitSignature}
      challengeHost={challengeHost}
      challengePayload={challengePayload}
      challengeTxtValue={challengeTxtValue}
      failureReason={failureReason}
      forceMobile={forceMobile}
      hnsMode={hnsMode}
      isChallengePending={isChallengePending}
      isChallengeReady={isChallengeReady}
      isDnsSetupRequired={isDnsSetupRequired}
      isExpired={isExpired}
      isFailed={isFailed}
      isHns={isHns}
      isIdle={isIdle}
      isSpaces={isSpaces}
      isStarting={isStarting}
      isVerified={isVerified}
      isVerifying={isVerifying}
      onAbandon={handleAbandon}
      onFamilyChange={setActiveFamily}
      onOpenChange={onOpenChange}
      onRestart={handleRestart}
      onRootLabelChange={setRootLabel}
      onSignatureChange={setSignature}
      onStart={handleStart}
      onVerify={handleVerify}
      open={open}
      resuming={resuming}
      rootLabel={rootLabel}
      setupNameservers={setupNameservers}
      signature={signature}
    />
  );
}
