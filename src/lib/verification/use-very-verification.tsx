"use client";

import * as React from "react";
import type { createVeryWidget as createVeryWidgetType } from "@veryai/widget";
import type { OnboardingStatus, VerificationIntent, VerificationSession } from "@pirate/api-contracts";

import { useApi } from "@/lib/api";
import { getErrorMessage } from "@/lib/error-utils";
import { updateSessionOnboarding } from "@/lib/api/session-store";
import { logger } from "@/lib/logger";
import { isMobileDeviceRuntime } from "@/lib/platform-detection";
import { installVeryBridgeFetchProxy } from "@/lib/verification/very-bridge-fetch-proxy";
import {
  buildVeryMobileLaunchHref,
  createVeryMobileBridgeSession,
  decryptVeryBridgeProof,
  getVeryMobileBridgeSessionStatus,
  verifyVeryProof,
  type VeryMobileBridgeSession,
} from "@/lib/verification/very-mobile-launch";

type VeryVerificationState = "not_started" | "pending" | "verified";
type VerificationIntentInput = VerificationIntent | (() => VerificationIntent);
let veryWidgetModulePromise: Promise<{ createVeryWidget: typeof createVeryWidgetType }> | null = null;

async function loadVeryWidgetModule() {
  veryWidgetModulePromise ??= import("@veryai/widget");
  return await veryWidgetModulePromise;
}

export function useVeryVerification(input: {
  onVerified?: (status: OnboardingStatus) => Promise<void> | void;
  verified: boolean;
  verificationIntent: VerificationIntentInput;
}) {
  const api = useApi();
  const { onVerified, verificationIntent, verified } = input;
  const [verificationSessionId, setVerificationSessionId] = React.useState<string | null>(null);
  const [verificationHref, setVerificationHref] = React.useState<string | null>(null);
  const [verificationLoading, setVerificationLoading] = React.useState(false);
  const [verificationError, setVerificationError] = React.useState<string | null>(null);
  const bridgeFetchProxyCleanupRef = React.useRef<(() => void) | null>(null);
  const mobileFallbackTimerRef = React.useRef<number | null>(null);
  const mobilePollingTimerRef = React.useRef<number | null>(null);
  const widgetRef = React.useRef<{ destroy?: () => void; open?: () => void } | null>(null);

  const clearMobileTimers = React.useCallback(() => {
    if (mobileFallbackTimerRef.current != null) {
      window.clearTimeout(mobileFallbackTimerRef.current);
      mobileFallbackTimerRef.current = null;
    }
    if (mobilePollingTimerRef.current != null) {
      window.clearInterval(mobilePollingTimerRef.current);
      mobilePollingTimerRef.current = null;
    }
  }, []);

  const cleanupWidget = React.useCallback(() => {
    clearMobileTimers();
    widgetRef.current?.destroy?.();
    widgetRef.current = null;
    bridgeFetchProxyCleanupRef.current?.();
    bridgeFetchProxyCleanupRef.current = null;
  }, [clearMobileTimers]);

  React.useEffect(() => () => cleanupWidget(), [cleanupWidget]);

  const refreshOnboardingStatus = React.useCallback(async (verifiedSession?: VerificationSession | null) => {
    const latestStatus = await api.onboarding.getStatus();
    const status = verifiedSession?.status === "verified"
      ? {
          ...latestStatus,
          unique_human_verification_status: "verified" as const,
          missing_requirements: latestStatus.missing_requirements.filter((requirement) => requirement !== "unique_human_verification"),
        }
      : latestStatus;
    updateSessionOnboarding(status);
    try {
      await onVerified?.(status);
    } catch (error: unknown) {
      setVerificationError(getErrorMessage(error, "Post-verification step failed"));
    }
    return status;
  }, [api, onVerified]);

  const completeVeryProof = React.useCallback(async (result: VerificationSession, proof: string) => {
    try {
      logger.info("[very-verification] proof valid, completing session", {
        verificationSessionId: result.id,
      });
      const completedSession = await api.verification.completeSession(result.id, { provider_payload_ref: proof });
      logger.info("[very-verification] session completion response", {
        verificationSessionId: completedSession.id,
        status: completedSession.status,
      });
      await refreshOnboardingStatus(completedSession);
      setVerificationSessionId(null);
      setVerificationHref(null);
      setVerificationError(null);
    } catch (error: unknown) {
      setVerificationError(getErrorMessage(error, "Could not complete Very verification"));
    } finally {
      setVerificationLoading(false);
      cleanupWidget();
    }
  }, [api.verification, cleanupWidget, refreshOnboardingStatus]);

  const openVeryWidget = React.useCallback(async (result: VerificationSession) => {
    const launch = result.launch?.very_widget;
    if (!launch) {
      throw new Error("Very launch data was not returned");
    }
    if (!launch.verify_url) {
      throw new Error("Very verify URL was not returned");
    }

    cleanupWidget();
    setVerificationHref(null);
    const { createVeryWidget } = await loadVeryWidgetModule();
    bridgeFetchProxyCleanupRef.current = installVeryBridgeFetchProxy(result.id);
    widgetRef.current = createVeryWidget({
      appId: launch.app_id,
      context: launch.context,
      typeId: launch.type_id,
      query: JSON.stringify(launch.query),
      verifyUrl: launch.verify_url,
      onSuccess: async (proof: string) => {
        await completeVeryProof(result, proof);
      },
      onError: (error: string) => {
        setVerificationError(error || "Very verification failed");
        setVerificationSessionId(null);
        setVerificationHref(null);
        setVerificationLoading(false);
        cleanupWidget();
      },
      theme: "dark",
    });

    widgetRef.current.open?.();
  }, [cleanupWidget, completeVeryProof]);

  const handleVeryMobileCompletion = React.useCallback(async (
    result: VerificationSession,
    bridgeSession: VeryMobileBridgeSession,
    verifyUrl: string,
  ) => {
    const status = await getVeryMobileBridgeSessionStatus(bridgeSession.sessionId);
    if (status.status === "error") {
      setVerificationError(status.userMessage || "Very verification failed");
      setVerificationSessionId(null);
      setVerificationHref(null);
      setVerificationLoading(false);
      cleanupWidget();
      return;
    }
    if (status.status !== "completed" || !status.response) {
      return;
    }

    const proof = await decryptVeryBridgeProof(bridgeSession, status.response);
    const verifyResult = await verifyVeryProof(proof, verifyUrl);
    if (verifyResult.status !== "valid") {
      setVerificationError("Very verification proof was invalid");
      setVerificationSessionId(null);
      setVerificationHref(null);
      setVerificationLoading(false);
      cleanupWidget();
      return;
    }

    await completeVeryProof(result, proof);
  }, [cleanupWidget, completeVeryProof]);

  const startVeryMobilePolling = React.useCallback((
    result: VerificationSession,
    bridgeSession: VeryMobileBridgeSession,
    verifyUrl: string,
  ) => {
    if (mobilePollingTimerRef.current != null) {
      window.clearInterval(mobilePollingTimerRef.current);
    }
    mobilePollingTimerRef.current = window.setInterval(() => {
      void handleVeryMobileCompletion(result, bridgeSession, verifyUrl)
        .catch((error: unknown) => {
          logger.warn("[very-verification] mobile polling failed", {
            error: getErrorMessage(error, "Very polling failed"),
            verificationSessionId: result.id,
          });
        });
    }, 3000);
  }, [handleVeryMobileCompletion]);

  const openVeryMobileLaunch = React.useCallback(async (result: VerificationSession) => {
    const launch = result.launch?.very_widget;
    if (!launch) {
      throw new Error("Very launch data was not returned");
    }
    if (!launch.verify_url) {
      throw new Error("Very verify URL was not returned");
    }

    cleanupWidget();
    bridgeFetchProxyCleanupRef.current = installVeryBridgeFetchProxy(result.id);
    const bridgeSession = await createVeryMobileBridgeSession(launch);
    const href = buildVeryMobileLaunchHref(bridgeSession);
    setVerificationHref(href);
    startVeryMobilePolling(result, bridgeSession, launch.verify_url);
    window.location.href = href;

    mobileFallbackTimerRef.current = window.setTimeout(() => {
      if (document.visibilityState !== "visible" || widgetRef.current) {
        return;
      }
      void openVeryWidget(result);
    }, 4000);

    return href;
  }, [cleanupWidget, openVeryWidget, startVeryMobilePolling]);

  const startVerification = React.useCallback(async () => {
    setVerificationLoading(true);
    setVerificationError(null);
    setVerificationHref(null);

    try {
      const resolvedVerificationIntent =
        typeof verificationIntent === "function"
          ? verificationIntent()
          : verificationIntent;
      const result = await api.verification.startSession({
        provider: "very",
        verification_intent: resolvedVerificationIntent,
      });
      setVerificationSessionId(result.id);
      const href = isMobileDeviceRuntime()
        ? await openVeryMobileLaunch(result)
        : null;
      if (!href) {
        await openVeryWidget(result);
      }
      return { started: true };
    } catch (error: unknown) {
      setVerificationError(getErrorMessage(error, "Could not start Very verification"));
      setVerificationSessionId(null);
      setVerificationHref(null);
      cleanupWidget();
      setVerificationLoading(false);
      return { started: false };
    } finally {
      if (!widgetRef.current) {
        setVerificationLoading(false);
      }
    }
  }, [api, cleanupWidget, openVeryMobileLaunch, openVeryWidget, verificationIntent]);

  const verificationState: VeryVerificationState = verified
    ? "verified"
    : verificationSessionId
      ? "pending"
      : "not_started";

  return {
    startVerification,
    verificationError,
    verificationHref,
    verificationLoading,
    verificationState,
  };
}
