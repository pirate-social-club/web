"use client";

import * as React from "react";
import type {
  VerificationIntent,
  VerificationRequirement,
  VerificationSession,
} from "@pirate/api-contracts";

import { useApi } from "@/lib/api";
import { getErrorMessage } from "@/lib/error-utils";
import { openExternalHref } from "@/lib/open-external-href";

type ZkPassportDocumentCapability = Extract<
  VerificationSession["requested_capabilities"][number],
  "minimum_age" | "nationality" | "gender" | "unique_human"
>;

type ZkPassportRequestResult = {
  url: string;
  onProofGenerated: (callback: (proof: unknown) => void) => void;
  onResult: (callback: (response: { result: unknown }) => void) => void;
  onReject: (callback: () => void) => void;
  onError: (callback: (error: string) => void) => void;
};

type VerificationIntentInput = VerificationIntent | null | (() => VerificationIntent | null);

const ZKPASSPORT_CAPABILITIES = new Set(["minimum_age", "nationality", "gender", "unique_human"]);

function isZkPassportCapability(value: unknown): value is ZkPassportDocumentCapability {
  return typeof value === "string" && ZKPASSPORT_CAPABILITIES.has(value);
}

function requiredMinimumAge(requirements: readonly VerificationRequirement[]): number | null {
  const ages: number[] = [];
  for (const requirement of requirements) {
    const minimumAge = requirement.proof_type === "minimum_age" ? requirement.minimum_age : undefined;
    if (Number.isInteger(minimumAge)) {
      ages.push(minimumAge as number);
    }
  }
  return ages.length > 0 ? Math.max(...ages) : null;
}

async function buildZkPassportRequest(session: VerificationSession): Promise<ZkPassportRequestResult> {
  const launch = session.launch?.zkpassport;
  if (!launch) {
    throw new Error("ZKPassport launch data was not returned");
  }
  const { ZKPassport } = await import("@zkpassport/sdk");
  const zkPassport = new ZKPassport(launch.domain);
  let builder = await zkPassport.request({
    name: launch.name,
    logo: launch.logo || (typeof window !== "undefined" ? `${window.location.origin}/favicon.svg` : "https://pirate.sc/favicon.svg"),
    purpose: launch.purpose,
    scope: launch.scope,
    validity: launch.validity_seconds ?? undefined,
    devMode: launch.dev_mode ?? undefined,
  });

  builder = builder.bind("custom_data", launch.binding);
  if (launch.requested_capabilities.includes("nationality")) {
    builder = builder.disclose("nationality");
  }
  if (launch.requested_capabilities.includes("gender")) {
    builder = builder.disclose("gender");
  }
  if (launch.requested_capabilities.includes("minimum_age")) {
    const minimumAge = requiredMinimumAge(launch.verification_requirements);
    if (minimumAge == null) {
      throw new Error("ZKPassport minimum-age launch data is incomplete");
    }
    builder = builder.gte("age", minimumAge);
  }

  return builder.done() as ZkPassportRequestResult;
}

export function useZkPassportVerification(input: {
  onVerified?: (result: {
    requestedCapabilities: VerificationSession["requested_capabilities"];
    session: VerificationSession;
  }) => Promise<void> | void;
  verificationIntent: VerificationIntentInput;
}) {
  const api = useApi();
  const { onVerified, verificationIntent } = input;
  const onVerifiedRef = React.useRef(onVerified);
  const [verificationHref, setVerificationHref] = React.useState<string | null>(null);
  const [verificationLoading, setVerificationLoading] = React.useState(false);
  const [verificationError, setVerificationError] = React.useState<string | null>(null);
  const completionInFlightRef = React.useRef(false);
  const pendingExternalSessionRef = React.useRef<VerificationSession | null>(null);
  const [pendingExternalSessionId, setPendingExternalSessionId] = React.useState<string | null>(null);

  React.useEffect(() => {
    onVerifiedRef.current = onVerified;
  }, [onVerified]);

  const clearPendingExternalSession = React.useCallback(() => {
    pendingExternalSessionRef.current = null;
    setPendingExternalSessionId(null);
  }, []);

  const checkPendingExternalVerification = React.useCallback(async (): Promise<VerificationSession | null> => {
    const pendingSession = pendingExternalSessionRef.current;
    if (!pendingSession || completionInFlightRef.current) {
      return null;
    }

    completionInFlightRef.current = true;
    setVerificationLoading(true);
    try {
      const completedSession = await api.verification.getSession(pendingSession.id);

      if (completedSession.status === "verified") {
        clearPendingExternalSession();
        setVerificationError(null);
        await onVerifiedRef.current?.({
          requestedCapabilities: pendingSession.requested_capabilities,
          session: completedSession,
        });
        return completedSession;
      }

      if (completedSession.status === "failed" || completedSession.status === "expired") {
        clearPendingExternalSession();
        setVerificationError(completedSession.failure_reason || "ZKPassport verification failed.");
        return completedSession;
      }

      setVerificationError(null);
      return completedSession;
    } catch (error: unknown) {
      setVerificationError(getErrorMessage(error, "Could not check ZKPassport verification"));
      return null;
    } finally {
      completionInFlightRef.current = false;
      setVerificationLoading(false);
    }
  }, [api.verification, clearPendingExternalSession]);

  React.useEffect(() => {
    if (!pendingExternalSessionId || typeof window === "undefined") {
      return;
    }

    const checkWhenVisible = () => {
      if (document.visibilityState === "visible") {
        void checkPendingExternalVerification();
      }
    };
    const checkWhenFocused = () => {
      void checkPendingExternalVerification();
    };

    document.addEventListener("visibilitychange", checkWhenVisible);
    window.addEventListener("focus", checkWhenFocused);
    return () => {
      document.removeEventListener("visibilitychange", checkWhenVisible);
      window.removeEventListener("focus", checkWhenFocused);
    };
  }, [checkPendingExternalVerification, pendingExternalSessionId]);

  const startVerification = React.useCallback(async (options: {
    deferOpen?: boolean;
    requestedCapabilities: VerificationSession["requested_capabilities"];
    unavailableMessage: string;
    verificationRequirements?: VerificationRequirement[] | null;
  }): Promise<{ error?: string; href?: string | null; started: boolean }> => {
    const requestedCapabilities = options.requestedCapabilities.filter(isZkPassportCapability);
    const verificationRequirements = options.verificationRequirements ?? [];
    if (requestedCapabilities.length === 0 && verificationRequirements.length === 0) {
      setVerificationError(options.unavailableMessage);
      return { error: options.unavailableMessage, href: null, started: false };
    }

    setVerificationLoading(true);
    setVerificationError(null);
    setVerificationHref(null);
    try {
      const session = await api.verification.startSession({
        provider: "zkpassport",
        provider_mode: "web_sdk",
        requested_capabilities: requestedCapabilities,
        verification_intent: typeof verificationIntent === "function"
          ? verificationIntent()
          : verificationIntent,
        verification_requirements: verificationRequirements,
      });
      const request = await buildZkPassportRequest(session);
      setVerificationHref(request.url);
      pendingExternalSessionRef.current = session;
      setPendingExternalSessionId(session.id);

      const proofs: unknown[] = [];
      request.onProofGenerated((proof) => {
        proofs.push(proof);
      });
      request.onReject(() => {
        clearPendingExternalSession();
        setVerificationError("ZKPassport verification was rejected.");
        setVerificationLoading(false);
      });
      request.onError((error) => {
        clearPendingExternalSession();
        setVerificationError(error || "ZKPassport verification failed.");
        setVerificationLoading(false);
      });
      request.onResult((response) => {
        if (completionInFlightRef.current) {
          return;
        }
        completionInFlightRef.current = true;
        void api.verification.completeSession(session.id, {
          provider_payload_ref: {
            proofs,
            queryResult: response.result,
          } as never,
        })
          .then(async (completedSession) => {
            if (completedSession.status !== "verified") {
              clearPendingExternalSession();
              setVerificationError(completedSession.failure_reason || "ZKPassport verification failed.");
              return;
            }
            clearPendingExternalSession();
            setVerificationError(null);
            await onVerifiedRef.current?.({
              requestedCapabilities: session.requested_capabilities,
              session: completedSession,
            });
          })
          .catch((error: unknown) => {
            setVerificationError(getErrorMessage(error, "Could not complete ZKPassport verification"));
          })
          .finally(() => {
            completionInFlightRef.current = false;
            setVerificationLoading(false);
          });
      });
      if (!options.deferOpen) {
        openExternalHref(request.url);
      }
      return { href: request.url, started: true };
    } catch (error: unknown) {
      const message = getErrorMessage(error, "Could not start ZKPassport verification");
      setVerificationError(message);
      return { error: message, href: null, started: false };
    } finally {
      setVerificationLoading(false);
    }
  }, [api.verification, clearPendingExternalSession, verificationIntent]);

  return {
    checkPendingVerification: checkPendingExternalVerification,
    clearPendingVerification: clearPendingExternalSession,
    startVerification,
    verificationError,
    verificationHref,
    verificationLoading,
    verificationPendingExternal: Boolean(pendingExternalSessionId),
  };
}
