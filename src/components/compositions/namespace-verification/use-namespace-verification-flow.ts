"use client";

import * as React from "react";
import { toast } from "@/components/primitives/sonner";
import {
  applyNamespaceSessionResult,
} from "@/components/compositions/namespace-verification/namespace-verification-shared";
import {
  getHnsVerificationMode,
} from "@/components/compositions/namespace-verification/namespace-verification-hns-ui";
import {
  canonicalizeNamespaceRootInput,
  canonicalizeNamespaceRootLabel,
} from "@/components/compositions/namespace-verification/namespace-labels";

import type {
  NamespaceFamily,
  NamespaceVerificationModalState,
  NamespaceVerificationCallbacks,
  NamespaceVerificationStartResult,
  NamespaceVerificationOperationClass,
  SpacesChallengePayload,
} from "@/components/compositions/verify-namespace-modal/verify-namespace-modal.types";

export type UseNamespaceVerificationFlowOptions = {
  callbacks: NamespaceVerificationCallbacks;
  initialRootLabel?: string;
  initialFamily?: NamespaceFamily;
  activeSessionId?: string | null;
  enabled?: boolean;
  onSessionStarted?: (sessionId: string) => void;
  onSessionCleared?: () => void;
  onVerified?: (namespaceVerificationId: string) => void;
};

export type UseNamespaceVerificationFlowReturn = {
  state: NamespaceVerificationModalState;
  rootLabel: string;
  activeFamily: NamespaceFamily;
  sessionId: string | null;
  challengeHost: string | null;
  challengeTxtValue: string | null;
  challengePayload: SpacesChallengePayload | null;
  signature: string;
  namespaceVerificationId: string | null;
  failureReason: string | null;
  operationClass: NamespaceVerificationOperationClass | null;
  pirateDnsAuthorityVerified: boolean | null;
  setupNameservers: string[] | null;
  rootLabelError: string | null;
  canonicalNamespaceKey: string | null;
  routePreviewPath: string | null;
  resuming: boolean;
  isIdle: boolean;
  isStarting: boolean;
  isChallengeReady: boolean;
  isChallengePending: boolean;
  isDnsSetupRequired: boolean;
  isVerifying: boolean;
  isVerified: boolean;
  isFailed: boolean;
  isExpired: boolean;
  busy: boolean;
  canStart: boolean;
  isHns: boolean;
  isSpaces: boolean;
  canSubmitSignature: boolean;
  hnsMode: ReturnType<typeof getHnsVerificationMode>;
  shouldShowResumeState: boolean;
  actions: {
    setRootLabel: (value: string) => void;
    setActiveFamily: (family: NamespaceFamily) => void;
    setSignature: (value: string) => void;
    start: () => void;
    verify: () => void;
    restart: () => void;
    reset: () => void;
  };
};

export function useNamespaceVerificationFlow({
  callbacks,
  initialRootLabel = "",
  initialFamily,
  activeSessionId,
  enabled = true,
  onSessionStarted,
  onSessionCleared,
  onVerified,
}: UseNamespaceVerificationFlowOptions): UseNamespaceVerificationFlowReturn {
  const [rootLabel, setRootLabel] = React.useState(initialRootLabel);
  const rootLabelRef = React.useRef(rootLabel);
  rootLabelRef.current = rootLabel;

  const [activeFamily, setActiveFamily] = React.useState<NamespaceFamily>(
    initialFamily ?? "hns",
  );
  const [state, setState] = React.useState<NamespaceVerificationModalState>("idle");
  const [sessionId, setSessionId] = React.useState<string | null>(null);
  const [challengeHost, setChallengeHost] = React.useState<string | null>(null);
  const [challengeTxtValue, setChallengeTxtValue] = React.useState<string | null>(null);
  const [challengePayload, setChallengePayload] =
    React.useState<SpacesChallengePayload | null>(null);
  const [signature, setSignature] = React.useState("");
  const [namespaceVerificationId, setNamespaceVerificationId] =
    React.useState<string | null>(null);
  const [failureReason, setFailureReason] = React.useState<string | null>(null);
  const [operationClass, setOperationClass] =
    React.useState<NamespaceVerificationOperationClass | null>(null);
  const [pirateDnsAuthorityVerified, setPirateDnsAuthorityVerified] =
    React.useState<NamespaceVerificationStartResult["pirateDnsAuthorityVerified"]>(null);
  const [setupNameservers, setSetupNameservers] =
    React.useState<NamespaceVerificationStartResult["setupNameservers"]>(null);
  const [resuming, setResuming] = React.useState(false);
  const rootLabelResult = React.useMemo(
    () => canonicalizeNamespaceRootLabel(activeFamily, rootLabel),
    [activeFamily, rootLabel],
  );

  const callbacksRef = React.useRef(callbacks);
  callbacksRef.current = callbacks;
  const onSessionStartedRef = React.useRef(onSessionStarted);
  onSessionStartedRef.current = onSessionStarted;
  const onSessionClearedRef = React.useRef(onSessionCleared);
  onSessionClearedRef.current = onSessionCleared;
  const onVerifiedRef = React.useRef(onVerified);
  onVerifiedRef.current = onVerified;

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

  const setRootLabelInput = React.useCallback((value: string) => {
    setRootLabel(canonicalizeNamespaceRootInput(activeFamily, value));
  }, [activeFamily]);

  const setActiveFamilyInput = React.useCallback((family: NamespaceFamily) => {
    setActiveFamily(family);
    setRootLabel((value) => canonicalizeNamespaceRootInput(family, value));
  }, []);

  const reset = React.useCallback(() => {
    handleSessionCleared();
    setRootLabel(initialRootLabel);
    setActiveFamily(initialFamily ?? "hns");
    setState("idle");
    resetChallengeState();
    setNamespaceVerificationId(null);
    setFailureReason(null);
  }, [handleSessionCleared, initialFamily, initialRootLabel, resetChallengeState]);

  const applySessionResult = React.useCallback(
    (result: NamespaceVerificationStartResult) => {
      applyNamespaceSessionResult(
        {
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
        },
        result,
      );
    },
    [handleSessionCleared],
  );

  React.useEffect(() => {
    if (!enabled) return;

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
    void callbacksRef.current
      .onGetSession({ namespaceVerificationSessionId: activeSessionId })
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
  }, [
    enabled,
    activeSessionId,
    applySessionResult,
    initialFamily,
    initialRootLabel,
    resetChallengeState,
  ]);

  const start = React.useCallback(() => {
    if (rootLabelResult.empty) return Promise.resolve();
    if (!rootLabelResult.ok) {
      toast.error("Enter a valid namespace root");
      return Promise.resolve();
    }

    setState("starting");
    setFailureReason(null);

    return callbacksRef.current
      .onStartSession({ family: activeFamily, rootLabel: rootLabelResult.rootLabel })
      .then((result) => {
        applySessionResult(result);
        onSessionStartedRef.current?.(result.namespaceVerificationSessionId);
      })
      .catch((error: unknown) => {
        setState("idle");
        toast.error(
          error instanceof Error ? error.message : "Could not start verification",
        );
      });
  }, [activeFamily, applySessionResult, rootLabelResult]);

  const verify = React.useCallback(() => {
    if (!sessionId) return Promise.resolve();

    setState("verifying");
    setFailureReason(null);

    const completeInput: Parameters<
      NamespaceVerificationCallbacks["onCompleteSession"]
    >[0] = {
      namespaceVerificationSessionId: sessionId,
      family: activeFamily,
    };

    if (activeFamily === "spaces" && challengePayload && signature.trim()) {
      try {
        const signedEvent = JSON.parse(signature.trim()) as Record<string, unknown>;
        completeInput.signaturePayload = {
          signed_event: signedEvent,
        };
      } catch {
        completeInput.signaturePayload = {
          signature: signature.trim(),
          signer_pubkey: challengePayload.root_pubkey,
        };
      }
    }

    return callbacksRef.current
      .onCompleteSession(completeInput)
      .then((result) => {
        if (result.status === "verified" && result.namespaceVerificationId) {
          setState("verified");
          setNamespaceVerificationId(result.namespaceVerificationId);
          onVerifiedRef.current?.(result.namespaceVerificationId);
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
        toast.error(
          error instanceof Error ? error.message : "Could not verify namespace",
        );
      });
  }, [activeFamily, challengePayload, sessionId, signature]);

  const restart = React.useCallback(() => {
    if (!sessionId) {
      const currentRootLabel = canonicalizeNamespaceRootLabel(activeFamily, rootLabelRef.current);
      if (currentRootLabel.empty) {
        setState("idle");
        resetChallengeState();
        return Promise.resolve();
      }
      if (!currentRootLabel.ok) {
        setState("idle");
        resetChallengeState();
        toast.error("Enter a valid namespace root");
        return Promise.resolve();
      }

      setState("starting");
      setFailureReason(null);

      return callbacksRef.current
        .onStartSession({ family: activeFamily, rootLabel: currentRootLabel.rootLabel })
        .then((result) => {
          applySessionResult(result);
          onSessionStartedRef.current?.(result.namespaceVerificationSessionId);
        })
        .catch((error: unknown) => {
          setState("idle");
          resetChallengeState();
          toast.error(
            error instanceof Error
              ? error.message
              : "Could not start verification",
          );
        });
    }

    setState("starting");
    setFailureReason(null);

    return callbacksRef.current
      .onCompleteSession({
        namespaceVerificationSessionId: sessionId,
        family: activeFamily,
        restartChallenge: true,
      })
      .then((result) => {
        if (result.status === "expired") {
          setState("expired");
          return;
        }
        return callbacksRef.current
          .onGetSession({ namespaceVerificationSessionId: sessionId })
          .then((sessionResult) => {
            applySessionResult(sessionResult);
          })
          .catch((error: unknown) => {
            setState("idle");
            resetChallengeState();
            toast.error(
              error instanceof Error
                ? error.message
                : "Could not refresh verification",
            );
          });
      })
      .catch((error: unknown) => {
        setState("failed");
        toast.error(
          error instanceof Error
            ? error.message
            : "Could not refresh verification",
        );
      });
  }, [activeFamily, applySessionResult, resetChallengeState, sessionId]);

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
  const canStart = rootLabelResult.ok;
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
  const shouldShowResumeState =
    resuming ||
    (Boolean(activeSessionId) &&
      !sessionId &&
      state !== "verified" &&
      state !== "expired" &&
      state !== "failed" &&
      state !== "challenge_ready" &&
      state !== "challenge_pending");

  return {
    state,
    rootLabel,
    activeFamily,
    sessionId,
    challengeHost,
    challengeTxtValue,
    challengePayload,
    signature,
    namespaceVerificationId,
    failureReason,
    operationClass,
    pirateDnsAuthorityVerified,
    setupNameservers,
    rootLabelError: rootLabelResult.ok || rootLabelResult.empty ? null : "Invalid namespace root",
    canonicalNamespaceKey: rootLabelResult.ok ? rootLabelResult.namespaceKey : null,
    routePreviewPath: rootLabelResult.ok ? rootLabelResult.routePath : null,
    resuming,
    isIdle,
    isStarting,
    isChallengeReady,
    isChallengePending,
    isDnsSetupRequired,
    isVerifying,
    isVerified,
    isFailed,
    isExpired,
    busy,
    canStart,
    isHns,
    isSpaces,
    canSubmitSignature,
    hnsMode,
    shouldShowResumeState,
    actions: {
      setRootLabel: setRootLabelInput,
      setActiveFamily: setActiveFamilyInput,
      setSignature,
      start,
      verify,
      restart,
      reset,
    },
  };
}
