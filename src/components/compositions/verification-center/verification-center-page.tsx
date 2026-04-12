"use client";

import * as React from "react";
import { SelfAppBuilder, SelfQRcodeWrapper } from "@selfxyz/qrcode";
import type { SelfApp } from "@selfxyz/qrcode";

import { navigate } from "@/app/router";
import { usePirateAuth } from "@/components/compositions/pirate-auth/pirate-auth-provider";
import { SelfVerificationModal } from "@/components/compositions/self-verification/self-verification-modal";
import { VerificationCenterShell } from "@/components/compositions/verification-center/verification-center-shell";
import {
  completeVerificationSession,
  getOnboardingStatus,
  getVerificationSession,
  resolveApiHref,
  startVerificationSession,
  type OnboardingStatus,
  type VerificationSessionResponse,
} from "@/lib/pirate-api";
import {
  storePendingCommunityJoinRetry,
  type PendingVerificationStart,
} from "@/lib/verification-handoff";
import {
  createVeryBridgeSession,
  decryptVeryBridgeProof,
  getVeryBridgeSessionStatus,
  normalizeVeryBridgeQuery,
  type VeryBridgeClientSession,
} from "@/lib/very-bridge";

type VerificationCenterCopy = {
  connectAction: string;
  connectBody: string;
  connectTitle: string;
  guidanceBody: string;
  guidanceTitle: string;
  launchUnavailableBody: string;
  missingSessionBody: string;
  missingSessionTitle: string;
  providerLabel: string;
  refreshAction: string;
  selfAction: string;
  selfBody: string;
  selfOpenAction: string;
  selfStatusNote: string;
  sessionDetailsTitle: string;
  sessionPanelBody: string;
  sessionPanelTitle: string;
  sessionStatusLabel: string;
  sessionTokenLabel: string;
  uniqueHumanLabel: string;
  verifiedBody: string;
  verifiedCta: string;
  veryAction: string;
  veryBody: string;
  veryOpenAction: string;
  veryStatusNote: string;
  waitingSelfBody: string;
  waitingVeryBody: string;
  errorLabel: string;
};

function buildSelfApp(session: VerificationSessionResponse): SelfApp | null {
  if (session.provider !== "self" || !session.launch?.self_app) {
    return null;
  }

  const launch = session.launch.self_app;
  if (!launch.app_name || !launch.scope || !launch.endpoint || !launch.user_id) {
    return null;
  }

  return new SelfAppBuilder({
    appName: launch.app_name,
    scope: launch.scope,
    endpoint: resolveApiHref(launch.endpoint),
    endpointType: launch.endpoint_type === "https" || launch.endpoint_type === "staging_https"
      ? launch.endpoint_type
      : undefined,
    userId: launch.user_id,
    userIdType: launch.user_id_type === "hex" ? "hex" : "uuid",
    header: launch.header ?? undefined,
    logoBase64: launch.logo_base64 ?? undefined,
    deeplinkCallback: launch.deeplink_callback ?? undefined,
    version: launch.version ?? undefined,
    userDefinedData: launch.user_defined_data ?? undefined,
    chainID: launch.chain_id === 11142220 || launch.chain_id === 42220 ? launch.chain_id : undefined,
    devMode: launch.dev_mode === true,
    disclosures: {
      nationality: launch.disclosures?.nationality === true,
      gender: launch.disclosures?.gender === true,
      minimumAge: launch.disclosures?.minimum_age ?? undefined,
    },
  }).build();
}

function formatVerificationStatus(status: OnboardingStatus["unique_human_verification_status"]): string {
  switch (status) {
    case "verified":
      return "Verified";
    case "pending":
      return "Pending";
    case "expired":
      return "Expired";
    case "failed":
      return "Failed";
    default:
      return "Not started";
  }
}

function formatSessionStatus(session: VerificationSessionResponse | null): string {
  if (!session) {
    return "No active session";
  }

  switch (session.status) {
    case "verified":
      return "Verified";
    case "failed":
      return "Failed";
    case "expired":
      return "Expired";
    default:
      return "Pending";
  }
}

export function VerificationCenterPage({
  copy,
  initialStartRequest = null,
}: {
  copy: VerificationCenterCopy;
  initialStartRequest?: PendingVerificationStart | null;
}) {
  const { accessToken } = usePirateAuth();
  const [onboarding, setOnboarding] = React.useState<OnboardingStatus | null>(null);
  const [verificationSession, setVerificationSession] = React.useState<VerificationSessionResponse | null>(null);
  const [isActionPending, setIsActionPending] = React.useState(false);
  const [isSelfModalOpen, setIsSelfModalOpen] = React.useState(false);
  const [isVeryModalOpen, setIsVeryModalOpen] = React.useState(false);
  const [pendingProvider, setPendingProvider] = React.useState<"self" | "very" | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const [veryBridgeSession, setVeryBridgeSession] = React.useState<(VeryBridgeClientSession & {
    verificationSessionId: string;
  }) | null>(null);
  const submittedVeryBridgeSessionIdRef = React.useRef<string | null>(null);
  const autoStartConsumedRef = React.useRef(false);
  const autoReturnConsumedRef = React.useRef(false);
  const isUniqueHumanVerified = onboarding?.unique_human_verification_status === "verified";

  React.useEffect(() => {
    console.info("[verification-center] auth-state", {
      hasAccessToken: Boolean(accessToken),
      isSelfModalOpen,
      provider: verificationSession?.provider ?? null,
      sessionStatus: verificationSession?.status ?? null,
    });
  }, [accessToken, isSelfModalOpen, verificationSession?.provider, verificationSession?.status]);

  const syncOnboardingStatus = React.useCallback(async () => {
    if (!accessToken) {
      return null;
    }

    const next = await getOnboardingStatus(accessToken);
    setOnboarding(next);
    return next;
  }, [accessToken]);

  React.useEffect(() => {
    if (!accessToken || onboarding) {
      return;
    }

    void syncOnboardingStatus().catch((nextError) => {
      setError(nextError instanceof Error ? nextError.message : copy.connectBody);
    });
  }, [accessToken, onboarding, copy.connectBody, syncOnboardingStatus]);

  React.useEffect(() => {
    if (!accessToken || !verificationSession || verificationSession.status !== "pending") {
      return;
    }

    const interval = window.setInterval(() => {
      void getVerificationSession({
        verificationSessionId: verificationSession.verification_session_id,
        accessToken,
      }).then((next) => {
        setVerificationSession(next);
      }).catch(() => {
        // Keep the current state and let the user refresh manually if polling misses.
      });
    }, 3000);

    return () => {
      window.clearInterval(interval);
    };
  }, [accessToken, verificationSession]);

  React.useEffect(() => {
    if (!accessToken || !verificationSession || verificationSession.status !== "verified") {
      return;
    }

    void syncOnboardingStatus().catch(() => {
      // Leave the last onboarding state in place and let the user refresh again if needed.
    });
  }, [accessToken, syncOnboardingStatus, verificationSession]);

  React.useEffect(() => {
    if (
      !verificationSession
      || verificationSession.status !== "verified"
      || !initialStartRequest
      || initialStartRequest.reason !== "community_join_gate_failed"
      || !initialStartRequest.communityId
      || !initialStartRequest.returnPath
      || autoReturnConsumedRef.current
    ) {
      return;
    }

    autoReturnConsumedRef.current = true;
    storePendingCommunityJoinRetry({
      communityId: initialStartRequest.communityId,
      returnPath: initialStartRequest.returnPath,
    });
    navigate(initialStartRequest.returnPath);
  }, [initialStartRequest, verificationSession]);

  const startProviderFlow = React.useCallback(async (
    provider: "self" | "very",
    override?: PendingVerificationStart | null,
  ) => {
    console.info("[verification-center] start-provider-flow", {
      hasAccessToken: Boolean(accessToken),
      provider,
    });

    if (!accessToken) {
      setError(copy.missingSessionBody);
      return null;
    }

    setIsActionPending(true);
    setPendingProvider(provider);
    setError(null);

    try {
      const session = await startVerificationSession({
        provider,
        accessToken,
        verificationIntent: override?.verificationIntent ?? (provider === "very" ? "ucommunity_join" : "profile_verification"),
        requestedCapabilities: override?.requestedCapabilities ?? (provider === "self"
          ? ["unique_human", "age_over_18", "nationality"]
          : ["unique_human"]),
        policyId: override?.policyId ?? (provider === "self" ? "policy_self_profile_v1" : "policy_very_join_v1"),
      });
      console.info("[verification-center] start-provider-flow:success", {
        hasLaunch: Boolean(session.launch),
        provider: session.provider,
        providerMode: session.provider_mode ?? null,
        sessionId: session.verification_session_id,
        status: session.status,
      });
      setVerificationSession(session);
      return session;
    } catch (nextError) {
      console.error("[verification-center] start-provider-flow:error", nextError);
      setError(nextError instanceof Error ? nextError.message : copy.errorLabel);
      return null;
    } finally {
      setIsActionPending(false);
      setPendingProvider(null);
    }
  }, [accessToken, copy.errorLabel, copy.missingSessionBody]);

  React.useEffect(() => {
    if (!accessToken || !initialStartRequest || verificationSession || autoStartConsumedRef.current) {
      return;
    }

    autoStartConsumedRef.current = true;
    void startProviderFlow(initialStartRequest.provider, initialStartRequest);
  }, [accessToken, initialStartRequest, startProviderFlow, verificationSession]);

  const activeVerificationSessionId = verificationSession?.verification_session_id ?? null;

  const completeCurrentVerification = React.useCallback(async (proof?: string | null) => {
    if (!accessToken || !activeVerificationSessionId) {
      return;
    }

    setIsActionPending(true);
    setError(null);

    try {
      const next = await completeVerificationSession({
        verificationSessionId: activeVerificationSessionId,
        accessToken,
        proof,
      });
      setVerificationSession(next);
      if (next.status === "verified") {
        await syncOnboardingStatus();
      }
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : copy.errorLabel);
    } finally {
      setIsActionPending(false);
    }
  }, [accessToken, activeVerificationSessionId, copy.errorLabel, syncOnboardingStatus]);

  const refreshVerification = React.useCallback(async () => {
    if (!accessToken) {
      setError(copy.missingSessionBody);
      return;
    }

    if (!verificationSession) {
      await syncOnboardingStatus().catch((nextError) => {
        setError(nextError instanceof Error ? nextError.message : copy.errorLabel);
      });
      return;
    }

    setIsActionPending(true);
    setError(null);

    try {
      const next = await getVerificationSession({
        verificationSessionId: verificationSession.verification_session_id,
        accessToken,
      });
      setVerificationSession(next);
      if (next.status === "verified") {
        await syncOnboardingStatus();
      }
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : copy.errorLabel);
    } finally {
      setIsActionPending(false);
    }
  }, [accessToken, copy.errorLabel, copy.missingSessionBody, syncOnboardingStatus, verificationSession]);

  const selfApp = React.useMemo(
    () => (verificationSession ? buildSelfApp(verificationSession) : null),
    [verificationSession],
  );
  const activeVerySession = verificationSession?.provider === "very" ? verificationSession : null;
  const activeVeryWidgetConfig = activeVerySession?.launch?.very_widget ?? null;
  const activeVerySessionId = activeVerySession?.verification_session_id ?? null;
  const activeVeryStatus = activeVerySession?.status ?? null;
  const activeVeryAppId = activeVeryWidgetConfig?.app_id ?? null;
  const activeVeryContext = activeVeryWidgetConfig?.context ?? null;
  const activeVeryTypeId = activeVeryWidgetConfig?.type_id ?? null;
  const activeVeryQuery = activeVeryWidgetConfig?.query ?? null;
  const activeVeryQueryPayload = React.useMemo(
    () => normalizeVeryBridgeQuery(activeVeryQuery),
    [activeVeryQuery],
  );
  const activeVeryVerifyUrl = activeVeryWidgetConfig?.verify_url ?? null;
  const providerLaunchMissing = verificationSession?.status === "pending" && (
    verificationSession.provider === "self"
      ? !verificationSession.launch?.self_app
      : !verificationSession.launch?.very_widget
  );
  const providerErrorBody = error ?? (providerLaunchMissing ? copy.launchUnavailableBody : undefined);
  const activeSelfSession = verificationSession?.provider === "self" ? verificationSession : null;
  const isStartingSelfFlow = pendingProvider === "self" && isActionPending && !activeSelfSession;
  const isStartingVeryFlow = pendingProvider === "very" && isActionPending && !activeVerySession;
  const shouldRenderSelfModal = isSelfModalOpen || Boolean(activeSelfSession) || isStartingSelfFlow;
  const shouldRenderVeryModal = isVeryModalOpen || Boolean(activeVerySession) || isStartingVeryFlow;
  const selfModalBody = providerErrorBody ?? (
    isStartingSelfFlow
      ? copy.waitingSelfBody
      : activeSelfSession?.status === "verified"
        ? copy.verifiedBody
        : copy.selfBody
  );
  const selfModalPhase = isStartingSelfFlow
    ? "waiting"
    : activeSelfSession?.status === "verified"
      ? "verified"
      : activeSelfSession?.status === "failed" || activeSelfSession?.status === "expired" || providerErrorBody
        ? "error"
        : activeSelfSession
          ? "ready"
          : "sign_in";
  const activeVeryBridgeSession = veryBridgeSession?.verificationSessionId === activeVerySessionId
    ? veryBridgeSession
    : null;
  const veryModalBody = providerErrorBody ?? (
    isStartingVeryFlow
      ? copy.waitingVeryBody
      : activeVerySession?.status === "verified"
        ? copy.verifiedBody
        : copy.veryBody
  );
  const veryModalPhase = isStartingVeryFlow
    ? "waiting"
    : activeVerySession?.status === "verified"
      ? "verified"
      : activeVerySession?.status === "failed" || activeVerySession?.status === "expired" || providerErrorBody
        ? "error"
        : activeVerySession && activeVeryBridgeSession
          ? "ready"
          : activeVerySession
            ? "waiting"
            : "sign_in";

  React.useEffect(() => {
    if (verificationSession?.provider !== "self") {
      setIsSelfModalOpen(false);
    }
  }, [verificationSession?.provider]);

  React.useEffect(() => {
    if (verificationSession?.provider !== "very") {
      setIsVeryModalOpen(false);
    }
  }, [verificationSession?.provider]);

  React.useEffect(() => {
    if (
      activeVeryStatus === "pending"
      && (
        !activeVerySessionId
        || activeVeryAppId === null
        || !activeVeryContext
        || !activeVeryTypeId
        || !activeVeryQueryPayload
      )
    ) {
      console.info("[verification-center] very-bridge:skip", {
        appId: activeVeryAppId,
        context: activeVeryContext,
        hasQueryPayload: Boolean(activeVeryQueryPayload),
        rawQueryType: activeVeryQuery === null ? "null" : typeof activeVeryQuery,
        sessionId: activeVerySessionId,
        status: activeVeryStatus,
        typeId: activeVeryTypeId,
      });
    }
  }, [
    activeVeryAppId,
    activeVeryContext,
    activeVeryQuery,
    activeVeryQueryPayload,
    activeVerySessionId,
    activeVeryStatus,
    activeVeryTypeId,
  ]);

  React.useEffect(() => {
    if (
      !activeVerySessionId
      || activeVeryStatus !== "pending"
      || activeVeryAppId === null
      || !activeVeryContext
      || !activeVeryTypeId
      || !activeVeryQueryPayload
    ) {
      setVeryBridgeSession(null);
      submittedVeryBridgeSessionIdRef.current = null;
      return;
    }

    if (veryBridgeSession?.verificationSessionId === activeVerySessionId) {
      return;
    }

    let cancelled = false;

    void createVeryBridgeSession({
      appId: activeVeryAppId,
      context: activeVeryContext,
      query: activeVeryQueryPayload,
      typeId: activeVeryTypeId,
    }).then((nextBridgeSession) => {
      if (cancelled) {
        return;
      }

      console.info("[verification-center] very-bridge:created", {
        appId: activeVeryAppId,
        bridgeSessionId: nextBridgeSession.bridgeSessionId,
        context: activeVeryContext,
        typeId: activeVeryTypeId,
        verifyUrl: activeVeryVerifyUrl ?? null,
      });
      setVeryBridgeSession({
        ...nextBridgeSession,
        verificationSessionId: activeVerySessionId,
      });
    }).catch((nextError) => {
      if (cancelled) {
        return;
      }

      console.error("[verification-center] very-bridge:error", nextError);
      setError(nextError instanceof Error ? nextError.message : copy.errorLabel);
    });

    return () => {
      cancelled = true;
    };
  }, [
    activeVeryAppId,
    activeVeryContext,
    activeVeryQueryPayload,
    activeVerySessionId,
    activeVeryStatus,
    activeVeryTypeId,
    activeVeryVerifyUrl,
    copy.errorLabel,
    veryBridgeSession,
  ]);

  React.useEffect(() => {
    if (
      activeVeryStatus !== "pending"
      || !activeVerySessionId
      || !activeVeryBridgeSession
      || submittedVeryBridgeSessionIdRef.current === activeVeryBridgeSession.bridgeSessionId
    ) {
      return;
    }

    let cancelled = false;
    let intervalId: number | null = null;

    const poll = async () => {
      if (
        cancelled
        || submittedVeryBridgeSessionIdRef.current === activeVeryBridgeSession.bridgeSessionId
      ) {
        return;
      }

      try {
        const nextStatus = await getVeryBridgeSessionStatus(activeVeryBridgeSession.bridgeSessionId);
        console.info("[verification-center] very-bridge:status", {
          bridgeSessionId: activeVeryBridgeSession.bridgeSessionId,
          status: nextStatus.status,
        });

        if (cancelled) {
          return;
        }

        if (nextStatus.status === "error") {
          setError(nextStatus.userMessage || copy.errorLabel);
          return;
        }

        if (nextStatus.status === "completed" && nextStatus.response) {
          submittedVeryBridgeSessionIdRef.current = activeVeryBridgeSession.bridgeSessionId;
          if (intervalId !== null) {
            window.clearInterval(intervalId);
          }
          const proof = await decryptVeryBridgeProof({
            iv: nextStatus.response.iv,
            key: activeVeryBridgeSession.key,
            payload: nextStatus.response.payload,
          });
          console.info("[verification-center] very-bridge:proof-ready", {
            bridgeSessionId: activeVeryBridgeSession.bridgeSessionId,
            proofLength: proof.length,
          });
          await completeCurrentVerification(proof);
        }
      } catch (nextError) {
        if (!cancelled) {
          console.error("[verification-center] very-bridge:poll-error", nextError);
        }
      }
    };

    void poll();
    intervalId = window.setInterval(() => {
      void poll();
    }, 3000);

    return () => {
      cancelled = true;
      if (intervalId !== null) {
        window.clearInterval(intervalId);
      }
    };
  }, [
    activeVeryBridgeSession,
    activeVerySessionId,
    activeVeryStatus,
    completeCurrentVerification,
    copy.errorLabel,
  ]);

  const openSelfFlow = React.useCallback(async () => {
    console.info("[verification-center] open-self-flow", {
      hasActiveSelfSession: Boolean(activeSelfSession),
      isSelfModalOpen,
      status: activeSelfSession?.status ?? null,
    });

    setIsSelfModalOpen(true);

    if (activeSelfSession) {
      return;
    }

    await startProviderFlow("self");
  }, [activeSelfSession, isSelfModalOpen, startProviderFlow]);

  const openVeryFlow = React.useCallback(async () => {
    console.info("[verification-center] open-very-flow", {
      hasActiveVerySession: verificationSession?.provider === "very",
      status: verificationSession?.status ?? null,
    });

    setIsVeryModalOpen(true);

    if (verificationSession?.provider === "very" && verificationSession.status === "pending") {
      return;
    }

    await startProviderFlow("very");
  }, [startProviderFlow, verificationSession]);

  if (!accessToken) {
    return (
      <VerificationCenterShell
        choices={[{
          actionLabel: copy.connectAction,
          body: copy.connectBody,
          disabled: true,
          title: copy.connectTitle,
        }]}
        details={[
          { label: copy.sessionTokenLabel, value: "Missing" },
          { label: copy.uniqueHumanLabel, value: "Unknown" },
          { label: copy.providerLabel, value: "None" },
        ]}
        detailsTitle={copy.sessionDetailsTitle}
        guidanceBody={copy.missingSessionBody}
        guidanceTitle={copy.missingSessionTitle}
        sessionTitle={copy.sessionPanelTitle}
      />
    );
  }

  return (
    <>
      <VerificationCenterShell
        choices={[
          {
            actionLabel: isUniqueHumanVerified ? "Verified" : copy.veryAction,
            active: isUniqueHumanVerified || verificationSession?.provider === "very",
            body: copy.veryBody,
            disabled: isUniqueHumanVerified,
            loading: pendingProvider === "very" && isActionPending,
            note: isUniqueHumanVerified
              ? "[x] Unique-human verification already complete."
              : verificationSession?.provider === "very" && providerErrorBody
                ? providerErrorBody
                : copy.veryStatusNote,
            onAction: () => void openVeryFlow(),
            title: copy.veryAction,
          },
          {
            actionLabel: verificationSession?.provider === "self" && verificationSession.status === "pending"
              ? copy.selfOpenAction
              : copy.selfAction,
            active: verificationSession?.provider === "self",
            body: copy.selfBody,
            loading: pendingProvider === "self" && isActionPending,
            note: verificationSession?.provider === "self" && providerErrorBody ? providerErrorBody : copy.selfStatusNote,
            onAction: () => void openSelfFlow(),
            title: copy.selfAction,
          },
        ]}
        details={[
          { label: copy.sessionTokenLabel, value: "Connected" },
          {
            label: copy.uniqueHumanLabel,
            value: onboarding ? formatVerificationStatus(onboarding.unique_human_verification_status) : "Loading",
          },
          { label: copy.providerLabel, value: verificationSession?.provider ?? "None" },
          { label: copy.sessionStatusLabel, value: formatSessionStatus(verificationSession) },
        ]}
        detailsTitle={copy.sessionDetailsTitle}
        guidanceBody={copy.guidanceBody}
        guidanceTitle={copy.guidanceTitle}
        sessionTitle={copy.sessionPanelTitle}
      />
      {shouldRenderVeryModal ? (
        <SelfVerificationModal
          actions={{
            primary: activeVerySession?.status === "verified"
              ? { label: copy.verifiedCta, onClick: () => void refreshVerification() }
              : undefined,
            footer: activeVerySession?.status === "pending" || providerErrorBody
              ? { label: copy.refreshAction, onClick: () => void refreshVerification() }
              : undefined,
          }}
          description={veryModalBody}
          entry={activeVeryBridgeSession ? {
            kind: "qr",
            content: (
              <img
                alt="Very verification QR code"
                className="h-[300px] w-[300px]"
                src={activeVeryBridgeSession.qrDataUrl}
              />
            ),
          } : {
            kind: "none",
          }}
          errorBody={providerErrorBody}
          errorTitle={providerErrorBody ? copy.errorLabel : undefined}
          onOpenChange={setIsVeryModalOpen}
          open={isVeryModalOpen}
          phase={veryModalPhase}
          statusNote={copy.waitingVeryBody}
          title={copy.veryAction}
        />
      ) : null}
      {shouldRenderSelfModal ? (
        <SelfVerificationModal
          actions={{
            primary: activeSelfSession?.status === "verified"
              ? { label: copy.verifiedCta, onClick: () => void refreshVerification() }
              : undefined,
            footer: activeSelfSession?.status === "pending" || providerErrorBody
              ? { label: copy.refreshAction, onClick: () => void refreshVerification() }
              : undefined,
          }}
          description={selfModalBody}
          entry={selfApp ? {
            kind: "qr",
            content: (
              <SelfQRcodeWrapper
                darkMode={false}
                onError={(nextError) => {
                  setError(nextError instanceof Error ? nextError.message : String(nextError));
                }}
                onSuccess={() => {
                  void refreshVerification();
                }}
                selfApp={selfApp}
                size={300}
              />
            ),
          } : {
            kind: "none",
          }}
          errorBody={providerErrorBody}
          errorTitle={providerErrorBody ? copy.errorLabel : undefined}
          onOpenChange={setIsSelfModalOpen}
          open={isSelfModalOpen}
          phase={selfModalPhase}
          statusNote={copy.waitingSelfBody}
          title={copy.selfAction}
        />
      ) : null}
    </>
  );
}
