"use client";

import * as React from "react";
import type {
  VerificationIntent,
  VerificationRequirement,
  VerificationSession,
} from "@pirate/api-contracts";

import { useApi } from "@/lib/api";
import { getApiErrorMessage } from "@/lib/api/client";
import { getVerificationPromptCopy } from "@/lib/identity-gates";
import { useIsMobile } from "@/hooks/use-mobile";
import {
  buildSelfVerificationCallbackHref,
  getSelfCallbackCleanHref,
  getSelfCallbackSessionId,
  getSelfVerificationLaunchHref,
  hasSelfCallbackParams,
  parseSelfCallback,
} from "@/lib/self-verification";

type PendingSelfVerificationSession = {
  requestedCapabilities: VerificationSession["requested_capabilities"];
  verificationSessionId: string;
};

type SelfPrompt = {
  actionLabel: string;
  description: string;
  href: string | null;
  title: string;
};

const SELF_REQUESTED_CAPABILITIES = new Set([
  "unique_human",
  "age_over_18",
  "nationality",
  "gender",
]);

function isSelfRequestedCapability(
  value: unknown,
): value is VerificationSession["requested_capabilities"][number] {
  return typeof value === "string" && SELF_REQUESTED_CAPABILITIES.has(value);
}

function readPendingSelfVerificationSession(storageKey: string): PendingSelfVerificationSession | null {
  if (typeof window === "undefined") {
    return null;
  }

  try {
    const raw = window.sessionStorage.getItem(storageKey);
    if (!raw) {
      return null;
    }

    const parsed = JSON.parse(raw) as Partial<PendingSelfVerificationSession>;
    if (
      typeof parsed?.verificationSessionId !== "string"
      || !Array.isArray(parsed?.requestedCapabilities)
    ) {
      return null;
    }

    return {
      verificationSessionId: parsed.verificationSessionId,
      requestedCapabilities: parsed.requestedCapabilities.filter((capability): capability is VerificationSession["requested_capabilities"][number] =>
        isSelfRequestedCapability(capability)
      ),
    };
  } catch {
    return null;
  }
}

function writePendingSelfVerificationSession(storageKey: string, value: PendingSelfVerificationSession): void {
  if (typeof window === "undefined") {
    return;
  }

  window.sessionStorage.setItem(storageKey, JSON.stringify(value));
}

function clearPendingSelfVerificationSession(storageKey: string): void {
  if (typeof window === "undefined") {
    return;
  }

  window.sessionStorage.removeItem(storageKey);
}

export function useSelfVerification(input: {
  completeErrorMessage: string;
  locale: string;
  onVerified?: (result: {
    requestedCapabilities: VerificationSession["requested_capabilities"];
    session: VerificationSession;
  }) => Promise<void> | void;
  startErrorMessage: string;
  storageKey: string;
  verificationIntent: VerificationIntent;
}) {
  const api = useApi();
  const {
    completeErrorMessage,
    locale,
    onVerified,
    startErrorMessage,
    storageKey,
    verificationIntent,
  } = input;
  const isMobile = useIsMobile();
  const [selfSession, setSelfSession] = React.useState<VerificationSession | null>(null);
  const [requestedCapabilities, setRequestedCapabilities] = React.useState<VerificationSession["requested_capabilities"]>([]);
  const [selfLoading, setSelfLoading] = React.useState(false);
  const [selfError, setSelfError] = React.useState<string | null>(null);
  const [selfModalOpen, setSelfModalOpen] = React.useState(false);
  const onVerifiedRef = React.useRef(onVerified);
  const completionInFlightRef = React.useRef(false);

  React.useEffect(() => {
    onVerifiedRef.current = onVerified;
  }, [onVerified]);

  const startVerification = React.useCallback(async (options: {
    requestedCapabilities: VerificationSession["requested_capabilities"];
    unavailableMessage: string;
    verificationRequirements?: VerificationRequirement[] | null;
  }): Promise<{ error?: string; started: boolean }> => {
    const nextRequestedCapabilities = options.requestedCapabilities.filter((capability): capability is VerificationSession["requested_capabilities"][number] =>
      isSelfRequestedCapability(capability)
    );
    const nextVerificationRequirements = options.verificationRequirements ?? [];

    if (nextRequestedCapabilities.length === 0 && nextVerificationRequirements.length === 0) {
      setSelfError(options.unavailableMessage);
      return { error: options.unavailableMessage, started: false };
    }

    setSelfLoading(true);
    setSelfError(null);
    try {
      const result = await api.verification.startSession({
        provider: "self",
        requested_capabilities: nextRequestedCapabilities,
        verification_intent: verificationIntent,
        verification_requirements: nextVerificationRequirements,
      });
      setRequestedCapabilities(result.requested_capabilities);
      setSelfSession(result);
      setSelfModalOpen(true);
      writePendingSelfVerificationSession(storageKey, {
        requestedCapabilities: result.requested_capabilities,
        verificationSessionId: result.verification_session_id,
      });
      return { started: true };
    } catch (error: unknown) {
      const message = getApiErrorMessage(error, startErrorMessage);
      setSelfError(message);
      return { error: message, started: false };
    } finally {
      setSelfLoading(false);
    }
  }, [api, startErrorMessage, storageKey, verificationIntent]);

  const handleModalOpenChange = React.useCallback((open: boolean) => {
    setSelfModalOpen(open);
    if (!open) {
      setSelfSession(null);
      setRequestedCapabilities([]);
      setSelfError(null);
      clearPendingSelfVerificationSession(storageKey);
    }
  }, [storageKey]);

  React.useEffect(() => {
    function handleSelfCallback() {
      const url = new URL(window.location.href);
      if (!hasSelfCallbackParams(url)) {
        return;
      }

      const pendingSession = readPendingSelfVerificationSession(storageKey);
      if (!pendingSession) {
        setSelfError("Verification session was lost. Start the ID check again.");
        setSelfSession(null);
        setRequestedCapabilities([]);
        setSelfModalOpen(false);
        clearPendingSelfVerificationSession(storageKey);
        window.history.replaceState({}, "", getSelfCallbackCleanHref(url));
        return;
      }

      setRequestedCapabilities(pendingSession.requestedCapabilities);
      const result = parseSelfCallback(url);
      const callbackSessionId = getSelfCallbackSessionId(url);
      const verificationSessionId = callbackSessionId || pendingSession.verificationSessionId;
      if (callbackSessionId && callbackSessionId !== pendingSession.verificationSessionId) {
        setSelfError("Verification session was lost. Start the ID check again.");
        setSelfSession(null);
        setRequestedCapabilities([]);
        setSelfModalOpen(false);
        clearPendingSelfVerificationSession(storageKey);
        window.history.replaceState({}, "", getSelfCallbackCleanHref(url));
        return;
      }

      if (result.status === "expired") {
        setSelfError("Verification session expired. Please try again.");
        setSelfSession(null);
        setRequestedCapabilities([]);
        setSelfModalOpen(false);
        clearPendingSelfVerificationSession(storageKey);
        window.history.replaceState({}, "", getSelfCallbackCleanHref(url));
        return;
      }

      if (result.status !== "completed" && result.reason !== "no_proof_returned") {
        setSelfError(result.reason);
        setSelfSession(null);
        setRequestedCapabilities([]);
        setSelfModalOpen(false);
        clearPendingSelfVerificationSession(storageKey);
        window.history.replaceState({}, "", getSelfCallbackCleanHref(url));
        return;
      }

      if (completionInFlightRef.current) {
        return;
      }

      completionInFlightRef.current = true;
      setSelfLoading(true);
      setSelfError(null);
      const completionPromise = result.status === "completed"
        ? api.verification.completeSession(verificationSessionId, { proof: result.proof })
        : api.verification.getSession(verificationSessionId);

      void completionPromise
        .then(async (session) => {
          if (session.status === "pending") {
            setSelfSession(session);
            setSelfModalOpen(true);
            setSelfError(null);
            return;
          }
          if (session.status === "expired") {
            setSelfSession(null);
            setRequestedCapabilities([]);
            setSelfModalOpen(false);
            clearPendingSelfVerificationSession(storageKey);
            setSelfError("Verification session expired. Please try again.");
            return;
          }
          if (session.status !== "verified") {
            setSelfSession(null);
            setRequestedCapabilities([]);
            setSelfModalOpen(false);
            clearPendingSelfVerificationSession(storageKey);
            setSelfError(session.failure_reason || completeErrorMessage);
            return;
          }

          setSelfSession(null);
          setRequestedCapabilities([]);
          setSelfModalOpen(false);
          clearPendingSelfVerificationSession(storageKey);
          await onVerifiedRef.current?.({
            requestedCapabilities: pendingSession.requestedCapabilities,
            session,
          });
        })
        .catch((error: unknown) => {
          setSelfError(getApiErrorMessage(error, completeErrorMessage));
        })
        .finally(() => {
          completionInFlightRef.current = false;
          setSelfLoading(false);
          window.history.replaceState({}, "", getSelfCallbackCleanHref(url));
        });
    }

    window.addEventListener("popstate", handleSelfCallback);
    handleSelfCallback();
    return () => window.removeEventListener("popstate", handleSelfCallback);
  }, [api, completeErrorMessage, storageKey]);

  const selfPrompt = React.useMemo<SelfPrompt | null>(() => {
    if (!selfSession) {
      return null;
    }

    const launch = selfSession.launch?.self_app;
    const deeplinkCallback = isMobile && typeof window !== "undefined"
      ? buildSelfVerificationCallbackHref(window.location.href, selfSession.verification_session_id)
      : null;
    const href = getSelfVerificationLaunchHref(launch, { deeplinkCallback });
    return {
      ...getVerificationPromptCopy("self", requestedCapabilities, { locale }),
      href,
    };
  }, [isMobile, locale, requestedCapabilities, selfSession]);

  return {
    handleModalOpenChange,
    selfError,
    selfLoading,
    selfModalOpen,
    selfPrompt,
    startVerification,
  };
}
