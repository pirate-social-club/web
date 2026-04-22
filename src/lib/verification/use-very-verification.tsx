"use client";

import * as React from "react";
import { createVeryWidget } from "@veryai/widget";
import type { OnboardingStatus, VerificationIntent, VerificationSession } from "@pirate/api-contracts";

import { useApi } from "@/lib/api";
import type { ApiError } from "@/lib/api/client";
import { updateSessionOnboarding } from "@/lib/api/session-store";
import { installVeryBridgeFetchProxy } from "@/lib/verification/very-bridge-fetch-proxy";

type VeryVerificationState = "not_started" | "pending" | "verified";

export function useVeryVerification(input: {
  onVerified?: (status: OnboardingStatus) => Promise<void> | void;
  verified: boolean;
  verificationIntent: VerificationIntent;
}) {
  const api = useApi();
  const { onVerified, verificationIntent, verified } = input;
  const [verificationSessionId, setVerificationSessionId] = React.useState<string | null>(null);
  const [verificationLoading, setVerificationLoading] = React.useState(false);
  const [verificationError, setVerificationError] = React.useState<string | null>(null);
  const bridgeFetchProxyCleanupRef = React.useRef<(() => void) | null>(null);
  const widgetRef = React.useRef<{ destroy?: () => void; open?: () => void } | null>(null);

  const cleanupWidget = React.useCallback(() => {
    widgetRef.current?.destroy?.();
    widgetRef.current = null;
    bridgeFetchProxyCleanupRef.current?.();
    bridgeFetchProxyCleanupRef.current = null;
  }, []);

  React.useEffect(() => () => cleanupWidget(), [cleanupWidget]);

  const refreshOnboardingStatus = React.useCallback(async () => {
    const status = await api.onboarding.getStatus();
    updateSessionOnboarding(status);
    try {
      await onVerified?.(status);
    } catch (error: unknown) {
      const apiError = error as ApiError;
      setVerificationError(apiError?.message ?? "Post-verification step failed");
    }
    return status;
  }, [api, onVerified]);

  const openVeryWidget = React.useCallback(async (result: VerificationSession) => {
    const launch = result.launch?.very_widget;
    if (!launch) {
      throw new Error("Very launch data was not returned");
    }
    if (!launch.verify_url) {
      throw new Error("Very verify URL was not returned");
    }

    cleanupWidget();
    bridgeFetchProxyCleanupRef.current = installVeryBridgeFetchProxy();
    widgetRef.current = createVeryWidget({
      appId: launch.app_id,
      context: launch.context,
      typeId: launch.type_id,
      query: JSON.stringify(launch.query),
      verifyUrl: launch.verify_url,
      onSuccess: async (proof: string) => {
        try {
          await api.verification.completeSession(result.verification_session_id, { provider_payload_ref: proof });
          await refreshOnboardingStatus();
          setVerificationSessionId(null);
          setVerificationError(null);
        } catch (error: unknown) {
          const apiError = error as ApiError;
          setVerificationError(apiError?.message ?? "Could not complete Very verification");
        } finally {
          setVerificationLoading(false);
          cleanupWidget();
        }
      },
      onError: (error: string) => {
        setVerificationError(error || "Very verification failed");
        setVerificationLoading(false);
        cleanupWidget();
      },
      theme: "dark",
    });

    widgetRef.current.open?.();
  }, [api, cleanupWidget, refreshOnboardingStatus]);

  const startVerification = React.useCallback(async () => {
    setVerificationLoading(true);
    setVerificationError(null);

    try {
      const result = await api.verification.startSession({
        provider: "very",
        verification_intent: verificationIntent,
      });
      setVerificationSessionId(result.verification_session_id);
      await openVeryWidget(result);
      return { started: true };
    } catch (error: unknown) {
      const apiError = error as ApiError;
      setVerificationError(apiError?.message ?? (error instanceof Error ? error.message : "Could not start Very verification"));
      setVerificationLoading(false);
      return { started: false };
    } finally {
      if (!widgetRef.current) {
        setVerificationLoading(false);
      }
    }
  }, [api, openVeryWidget, verificationIntent]);

  const verificationState: VeryVerificationState = verified
    ? "verified"
    : verificationSessionId
      ? "pending"
      : "not_started";

  return {
    startVerification,
    verificationError,
    verificationLoading,
    verificationState,
  };
}
