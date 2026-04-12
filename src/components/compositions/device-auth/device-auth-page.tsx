"use client";

import * as React from "react";
import { CheckCircle, CompassRose, ShieldCheck, Timer, Warning, Waves } from "@phosphor-icons/react";
import { SelfAppBuilder, SelfQRcodeWrapper, getUniversalLink } from "@selfxyz/qrcode";
import type { SelfApp } from "@selfxyz/qrcode";

import { Button } from "@/components/primitives/button";
import { CopyField } from "@/components/primitives/copy-field";
import { SelfVerificationView } from "@/components/compositions/self-verification/self-verification-view";
import { createPrivyConfig, getPrivyAppId } from "@/lib/privy";
import { cn } from "@/lib/utils";
import {
  authorizeDeviceSession,
  completeVerificationSession,
  exchangePrivySession,
  getApiBaseUrl,
  getOnboardingStatus,
  getVerificationSession,
  resolveApiHref,
  startVerificationSession,
  storePirateAccessToken,
  type VerificationSessionResponse,
} from "@/lib/pirate-api";
import {
  createVeryBridgeSession,
  decryptVeryBridgeProof,
  getVeryBridgeSessionStatus,
  normalizeVeryBridgeQuery,
  type VeryBridgeClientSession,
} from "@/lib/very-bridge";

type PrivyRuntimeModule = typeof import("@privy-io/react-auth");

type DeviceAuthMessages = {
  title: string;
  subtitle: string;
  missingParamsTitle: string;
  missingParamsBody: string;
  missingPrivyTitle: string;
  missingPrivyBody: string;
  codeLabel: string;
  continueInBrowser: string;
  signInAction: string;
  exchangePending: string;
  checkingStatus: string;
  verifiedReadyTitle: string;
  verifiedReadyBody: string;
  authorizeAction: string;
  authorizedTitle: string;
  authorizedBody: string;
  openTerminalLabel: string;
  verifyChoiceTitle: string;
  verifyChoiceBody: string;
  selfAction: string;
  veryAction: string;
  selfReadyBody: string;
  selfWaitingBody: string;
  selfOpenAction: string;
  selfRetryAction: string;
  veryReadyBody: string;
  veryWaitingBody: string;
  veryOpenAction: string;
  refreshStatusAction: string;
  sessionDetailsTitle: string;
  pirateHandleLabel: string;
  walletCountLabel: string;
  apiOriginLabel: string;
  errorLabel: string;
  authStageLabel: string;
  verificationStageLabel: string;
};

type RouteParams = {
  deviceSessionId: string | null;
  userCode: string | null;
};

type PirateSessionState = Awaited<ReturnType<typeof exchangePrivySession>>;

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

function readRouteParams(): RouteParams {
  const searchParams = new URLSearchParams(window.location.search);
  return {
    deviceSessionId: searchParams.get("device_session_id"),
    userCode: searchParams.get("user_code"),
  };
}

function useRouteParams() {
  const [params] = React.useState<RouteParams>(() => (
    typeof window === "undefined"
      ? { deviceSessionId: null, userCode: null }
      : readRouteParams()
  ));

  return params;
}

function DeviceAuthInner({
  copy,
  runtime,
}: {
  copy: DeviceAuthMessages;
  runtime: PrivyRuntimeModule;
}) {
  const { useIdentityToken, usePrivy } = runtime;
  const { ready, authenticated, login, logout, getAccessToken } = usePrivy();
  const { identityToken } = useIdentityToken();
  const { deviceSessionId, userCode } = useRouteParams();

  const [pirateSession, setPirateSession] = React.useState<PirateSessionState | null>(null);
  const [exchangeAttempted, setExchangeAttempted] = React.useState(false);
  const [onboarding, setOnboarding] = React.useState<Awaited<ReturnType<typeof getOnboardingStatus>> | null>(null);
  const [verificationSession, setVerificationSession] = React.useState<VerificationSessionResponse | null>(null);
  const [isActionPending, setIsActionPending] = React.useState(false);
  const [isAuthorized, setIsAuthorized] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [veryBridgeSession, setVeryBridgeSession] = React.useState<(VeryBridgeClientSession & {
    verificationSessionId: string;
  }) | null>(null);
  const submittedVeryBridgeSessionIdRef = React.useRef<string | null>(null);

  const hasValidParams = Boolean(deviceSessionId && userCode);

  React.useEffect(() => {
    if (!ready || !authenticated || pirateSession || exchangeAttempted || !hasValidParams) {
      return;
    }

    setExchangeAttempted(true);
    setError(null);

    void (async () => {
      try {
        const accessToken = await getAccessToken();
        if (!accessToken) {
          throw new Error("Privy did not return an access token");
        }

        const session = await exchangePrivySession({
          accessToken,
          identityToken,
        });
        storePirateAccessToken(session.access_token);
        setPirateSession(session);
      } catch (nextError) {
        setError(nextError instanceof Error ? nextError.message : "Could not create Pirate session");
      }
    })();
  }, [authenticated, exchangeAttempted, getAccessToken, hasValidParams, identityToken, pirateSession, ready]);

  React.useEffect(() => {
    if (!pirateSession || onboarding) {
      return;
    }

    void (async () => {
      try {
        const next = await getOnboardingStatus(pirateSession.access_token);
        setOnboarding(next);
      } catch (nextError) {
        setError(nextError instanceof Error ? nextError.message : "Could not load onboarding status");
      }
    })();
  }, [onboarding, pirateSession]);

  const authorizeCurrentSession = React.useCallback(async () => {
    if (!pirateSession || !deviceSessionId || !userCode) {
      return;
    }

    setIsActionPending(true);
    setError(null);
    try {
      await authorizeDeviceSession({
        deviceSessionId,
        userCode,
        accessToken: pirateSession.access_token,
      });
      setIsAuthorized(true);
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : "Could not authorize terminal session");
    } finally {
      setIsActionPending(false);
    }
  }, [deviceSessionId, pirateSession, userCode]);

  const syncOnboardingStatus = React.useCallback(async () => {
    if (!pirateSession) {
      return null;
    }

    const next = await getOnboardingStatus(pirateSession.access_token);
    setOnboarding(next);
    return next;
  }, [pirateSession]);

  React.useEffect(() => {
    if (!onboarding || !pirateSession || isAuthorized || isActionPending) {
      return;
    }

    if (onboarding.unique_human_verification_status === "verified") {
      void authorizeCurrentSession();
    }
  }, [authorizeCurrentSession, isActionPending, isAuthorized, onboarding, pirateSession]);

  React.useEffect(() => {
    if (!verificationSession || verificationSession.status !== "pending" || !pirateSession) {
      return;
    }

    const interval = window.setInterval(() => {
      void getVerificationSession({
        verificationSessionId: verificationSession.verification_session_id,
        accessToken: pirateSession.access_token,
      }).then((next) => {
        setVerificationSession(next);
      }).catch(() => {
        // Polling is best-effort. Keep the existing state and let the user retry manually.
      });
    }, 3000);

    return () => {
      window.clearInterval(interval);
    };
  }, [pirateSession, verificationSession]);

  React.useEffect(() => {
    if (!verificationSession || verificationSession.status !== "verified" || !pirateSession) {
      return;
    }

    void syncOnboardingStatus().catch(() => {
      // Keep the prior onboarding state and let authorize handle any remaining mismatch.
    });
  }, [pirateSession, syncOnboardingStatus, verificationSession]);

  const startProviderFlow = React.useCallback(async (provider: "self" | "very") => {
    if (!pirateSession) {
      return;
    }

    setIsActionPending(true);
    setError(null);
    try {
      const session = await startVerificationSession({
        provider,
        accessToken: pirateSession.access_token,
        requestedCapabilities: provider === "self"
          ? ["unique_human", "age_over_18", "nationality"]
          : ["unique_human"],
        policyId: provider === "self" ? "policy_self_profile_v1" : null,
      });
      setVerificationSession(session);
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : "Could not start verification");
    } finally {
      setIsActionPending(false);
    }
  }, [pirateSession]);

  const activeVerificationSessionId = verificationSession?.verification_session_id ?? null;

  const completeCurrentVerification = React.useCallback(async (proof?: string | null) => {
    if (!pirateSession || !activeVerificationSessionId) {
      return;
    }

    setIsActionPending(true);
    setError(null);
    try {
      const next = await completeVerificationSession({
        verificationSessionId: activeVerificationSessionId,
        accessToken: pirateSession.access_token,
        proof,
      });
      setVerificationSession(next);
      if (next.status === "verified") {
        await syncOnboardingStatus();
      }
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : "Could not complete verification");
    } finally {
      setIsActionPending(false);
    }
  }, [activeVerificationSessionId, pirateSession, syncOnboardingStatus]);

  const refreshVerification = React.useCallback(async () => {
    if (!pirateSession || !verificationSession) {
      return;
    }

    setIsActionPending(true);
    setError(null);
    try {
      const next = await getVerificationSession({
        verificationSessionId: verificationSession.verification_session_id,
        accessToken: pirateSession.access_token,
      });
      setVerificationSession(next);
      if (next.status === "verified") {
        await syncOnboardingStatus();
      }
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : "Could not refresh verification");
    } finally {
      setIsActionPending(false);
    }
  }, [pirateSession, syncOnboardingStatus, verificationSession]);

  const selfApp = React.useMemo(
    () => (verificationSession ? buildSelfApp(verificationSession) : null),
    [verificationSession],
  );
  const selfUniversalLink = React.useMemo(
    () => (selfApp ? getUniversalLink(selfApp) : null),
    [selfApp],
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
  const providerLaunchMissing = verificationSession?.status === "pending" && (
    verificationSession.provider === "self"
      ? !verificationSession.launch?.self_app
      : !verificationSession.launch?.very_widget
  );
  const providerErrorBody = error ?? (
    providerLaunchMissing
      ? "This verification session started, but the provider launch payload is missing. Refresh and try again."
      : undefined
  );

  React.useEffect(() => {
    if (
      !activeVerySessionId ||
      activeVeryStatus !== "pending" ||
      activeVeryAppId === null ||
      !activeVeryContext ||
      !activeVeryTypeId ||
      !activeVeryQueryPayload
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

      setVeryBridgeSession({
        ...nextBridgeSession,
        verificationSessionId: activeVerySessionId,
      });
    }).catch((nextError) => {
      if (cancelled) {
        return;
      }

      setError(nextError instanceof Error ? nextError.message : "Very verification failed");
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
    veryBridgeSession,
  ]);

  React.useEffect(() => {
    if (
      activeVeryStatus !== "pending" ||
      !activeVerySessionId ||
      !veryBridgeSession ||
      submittedVeryBridgeSessionIdRef.current === veryBridgeSession.bridgeSessionId
    ) {
      return;
    }

    let cancelled = false;
    let intervalId: number | null = null;

    const poll = async () => {
      if (
        cancelled
        || submittedVeryBridgeSessionIdRef.current === veryBridgeSession.bridgeSessionId
      ) {
        return;
      }

      try {
        const nextStatus = await getVeryBridgeSessionStatus(veryBridgeSession.bridgeSessionId);
        if (cancelled) {
          return;
        }

        if (nextStatus.status === "error") {
          setError(nextStatus.userMessage || "Very verification failed");
          return;
        }

        if (nextStatus.status === "completed" && nextStatus.response) {
          submittedVeryBridgeSessionIdRef.current = veryBridgeSession.bridgeSessionId;
          if (intervalId !== null) {
            window.clearInterval(intervalId);
          }
          const proof = await decryptVeryBridgeProof({
            iv: nextStatus.response.iv,
            key: veryBridgeSession.key,
            payload: nextStatus.response.payload,
          });
          await completeCurrentVerification(proof);
        }
      } catch {
        // Keep polling. Bridge status fetch is best-effort here.
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
  }, [activeVerySessionId, activeVeryStatus, completeCurrentVerification, veryBridgeSession]);

  const verificationPanel = React.useMemo(() => {
    if (!verificationSession) {
      return (
        <div className="grid gap-4 md:grid-cols-2">
          <button
            className="group rounded-[28px] border border-border-soft bg-card/80 px-5 py-5 text-left transition hover:border-primary/45 hover:bg-card"
            onClick={() => void startProviderFlow("self")}
            type="button"
          >
            <div className="mb-4 flex items-center gap-3 text-foreground">
              <Waves className="size-6 text-primary" />
              <span className="text-lg font-semibold">{copy.selfAction}</span>
            </div>
            <p className="text-base leading-7 text-muted-foreground">{copy.selfReadyBody}</p>
          </button>
          <button
            className="group rounded-[28px] border border-border-soft bg-card/80 px-5 py-5 text-left transition hover:border-primary/45 hover:bg-card"
            onClick={() => void startProviderFlow("very")}
            type="button"
          >
            <div className="mb-4 flex items-center gap-3 text-foreground">
              <ShieldCheck className="size-6 text-primary" />
              <span className="text-lg font-semibold">{copy.veryAction}</span>
            </div>
            <p className="text-base leading-7 text-muted-foreground">{copy.veryReadyBody}</p>
          </button>
        </div>
      );
    }

    if (verificationSession.provider === "self") {
      return (
        <div className="space-y-4">
          <SelfVerificationView
            actions={{
              primary: verificationSession.status === "verified"
                ? { label: copy.authorizeAction, onClick: () => void authorizeCurrentSession() }
                : undefined,
              footer: verificationSession.status === "pending"
                ? { label: copy.selfRetryAction, onClick: () => void refreshVerification() }
                : undefined,
            }}
            description={verificationSession.status === "verified" ? copy.verifiedReadyBody : copy.selfReadyBody}
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
            phase={verificationSession.status === "verified" ? "verified" : providerErrorBody ? "error" : "ready"}
            statusNote={copy.selfWaitingBody}
            title={copy.selfAction}
          />
          {verificationSession.launch?.self_app ? <CopyField value={JSON.stringify(verificationSession.launch.self_app, null, 2)} /> : null}
          {verificationSession.status === "pending" ? (
            <div className="flex flex-col gap-3 md:flex-row">
              {selfUniversalLink ? (
                <Button asChild size="lg">
                  <a href={selfUniversalLink} rel="noreferrer" target="_blank">
                    {copy.selfOpenAction}
                  </a>
                </Button>
              ) : null}
              <Button onClick={() => void refreshVerification()} size="lg" variant="secondary">
                {copy.refreshStatusAction}
              </Button>
            </div>
          ) : null}
        </div>
      );
    }

    return (
      <div className="space-y-4">
        <SelfVerificationView
          actions={{
            primary: verificationSession.status === "verified"
              ? { label: copy.authorizeAction, onClick: () => void authorizeCurrentSession() }
              : undefined,
            footer: verificationSession.status === "pending"
              ? { label: copy.refreshStatusAction, onClick: () => void refreshVerification() }
              : undefined,
          }}
          description={verificationSession.status === "verified" ? copy.verifiedReadyBody : copy.veryReadyBody}
          entry={verificationSession.status === "verified"
            ? { kind: "none" }
            : veryBridgeSession
              ? {
                  kind: "qr",
                  content: (
                    <img
                      alt="Very verification QR code"
                      className="h-[300px] w-[300px]"
                      src={veryBridgeSession.qrDataUrl}
                    />
                  ),
                }
              : {
                  kind: "none",
                }}
          errorBody={providerErrorBody}
          errorTitle={providerErrorBody ? copy.errorLabel : undefined}
          phase={verificationSession.status === "verified" ? "verified" : providerErrorBody ? "error" : veryBridgeSession ? "ready" : "waiting"}
          statusNote={copy.veryWaitingBody}
          title={copy.veryAction}
        />
        {verificationSession.launch?.very_widget ? <CopyField value={JSON.stringify(verificationSession.launch.very_widget, null, 2)} /> : null}
        {verificationSession.status === "pending" ? (
          <div className="flex flex-col gap-3 md:flex-row">
            {veryBridgeSession ? (
              <Button asChild size="lg">
                <a href={veryBridgeSession.qrUrl}>{copy.veryOpenAction}</a>
              </Button>
            ) : null}
            <Button onClick={() => void refreshVerification()} size="lg" variant="secondary">
              {copy.refreshStatusAction}
            </Button>
          </div>
        ) : null}
      </div>
    );
  }, [
    authorizeCurrentSession,
    copy.authorizeAction,
    copy.errorLabel,
    copy.refreshStatusAction,
    copy.selfAction,
    copy.selfOpenAction,
    copy.selfReadyBody,
    copy.selfRetryAction,
    copy.selfWaitingBody,
    copy.verifiedReadyBody,
    copy.veryAction,
    copy.veryOpenAction,
    copy.veryReadyBody,
    copy.veryWaitingBody,
    providerErrorBody,
    refreshVerification,
    selfApp,
    selfUniversalLink,
    startProviderFlow,
    verificationSession,
    veryBridgeSession,
  ]);

  if (!hasValidParams) {
    return (
      <StandalonePanel
        eyebrow={copy.continueInBrowser}
        title={copy.missingParamsTitle}
        body={copy.missingParamsBody}
        tone="warn"
      />
    );
  }

  return (
    <div className="min-h-dvh bg-[radial-gradient(circle_at_top,oklch(0.28_0.08_35/.45),transparent_42%),linear-gradient(180deg,oklch(0.16_0.01_30),oklch(0.12_0.01_18))] text-foreground">
      <div className="mx-auto flex min-h-dvh w-full max-w-[96rem] flex-col gap-8 px-4 py-5 md:px-8 md:py-8">
        <div className="grid gap-8 lg:grid-cols-[minmax(0,0.95fr)_24rem]">
          <section className="overflow-hidden rounded-[40px] border border-white/10 bg-[linear-gradient(180deg,oklch(0.22_0.01_22/.96),oklch(0.18_0.01_18/.96))] shadow-[0_40px_120px_rgb(0_0_0_/_0.35)]">
            <div className="border-b border-white/8 px-5 py-5 md:px-8 md:py-7">
              <div className="mb-6 flex items-center justify-between">
                <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-black/10 px-4 py-2 text-base text-muted-foreground">
                  <CompassRose className="size-5 text-primary" />
                  {copy.continueInBrowser}
                </div>
                <div className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-4 py-2 text-base text-primary">
                  <Timer className="size-5" />
                  {copy.codeLabel}
                </div>
              </div>
              <div className="max-w-3xl space-y-4">
                <h1 className="text-[clamp(2.5rem,6vw,5rem)] font-semibold leading-none tracking-[-0.04em] text-white">
                  {copy.title}
                </h1>
                <p className="max-w-2xl text-base leading-7 text-[color:oklch(0.84_0.01_80)]">
                  {copy.subtitle}
                </p>
              </div>
            </div>

            <div className="grid gap-8 px-5 py-5 md:px-8 md:py-8 xl:grid-cols-[minmax(0,1fr)_20rem]">
              <div className="space-y-6">
                {!ready ? (
                  <StandalonePanel
                    eyebrow={copy.authStageLabel}
                    title={copy.exchangePending}
                    body={copy.checkingStatus}
                  />
                ) : null}

                {ready && !authenticated ? (
                  <StandalonePanel
                    actions={(
                      <Button onClick={() => login()} size="lg">
                        {copy.signInAction}
                      </Button>
                    )}
                    eyebrow={copy.authStageLabel}
                    title={copy.continueInBrowser}
                    body={copy.subtitle}
                  />
                ) : null}

                {authenticated && !pirateSession ? (
                  <StandalonePanel
                    eyebrow={copy.authStageLabel}
                    title={copy.exchangePending}
                    body={copy.checkingStatus}
                  />
                ) : null}

                {pirateSession && !onboarding ? (
                  <StandalonePanel
                    eyebrow={copy.verificationStageLabel}
                    title={copy.checkingStatus}
                    body={copy.exchangePending}
                  />
                ) : null}

                {pirateSession && onboarding && !isAuthorized && onboarding.unique_human_verification_status !== "verified" ? (
                  <StandalonePanel
                    eyebrow={copy.verificationStageLabel}
                    title={copy.verifyChoiceTitle}
                    body={copy.verifyChoiceBody}
                    content={verificationPanel}
                  />
                ) : null}

                {pirateSession && onboarding && onboarding.unique_human_verification_status === "verified" && !isAuthorized ? (
                  <StandalonePanel
                    actions={(
                      <Button loading={isActionPending} onClick={() => void authorizeCurrentSession()} size="lg">
                        {copy.authorizeAction}
                      </Button>
                    )}
                    eyebrow={copy.verificationStageLabel}
                    title={copy.verifiedReadyTitle}
                    body={copy.verifiedReadyBody}
                  />
                ) : null}

                {isAuthorized ? (
                  <StandalonePanel
                    actions={(
                      <Button onClick={() => window.close()} size="lg" variant="secondary">
                        {copy.openTerminalLabel}
                      </Button>
                    )}
                    eyebrow={copy.verificationStageLabel}
                    title={copy.authorizedTitle}
                    body={copy.authorizedBody}
                    tone="success"
                  />
                ) : null}

                {error ? (
                  <StandalonePanel
                    actions={authenticated ? (
                      <Button onClick={() => void logout()} size="lg" variant="secondary">
                        Sign out
                      </Button>
                    ) : undefined}
                    eyebrow={copy.errorLabel}
                    title={copy.errorLabel}
                    body={error}
                    tone="warn"
                  />
                ) : null}
              </div>

              <aside className="space-y-4">
                <div className="rounded-[32px] border border-white/10 bg-black/15 px-5 py-5">
                  <div className="mb-4 text-base font-semibold text-white">{copy.sessionDetailsTitle}</div>
                  <div className="space-y-4">
                    <Metric label={copy.codeLabel} value={userCode ?? "Missing"} />
                    <Metric label={copy.apiOriginLabel} value={getApiBaseUrl()} />
                    <Metric label={copy.pirateHandleLabel} value={pirateSession?.profile.global_handle.label ?? "Waiting"} />
                    <Metric label={copy.walletCountLabel} value={String(pirateSession?.wallet_attachments.length ?? 0)} />
                  </div>
                </div>

                <div className="rounded-[32px] border border-primary/20 bg-primary/8 px-5 py-5">
                  <div className="mb-3 flex items-center gap-3 text-white">
                    {isAuthorized ? <CheckCircle className="size-6 text-primary" /> : <ShieldCheck className="size-6 text-primary" />}
                    <div className="text-lg font-semibold">
                      {isAuthorized ? copy.authorizedTitle : copy.continueInBrowser}
                    </div>
                  </div>
                  <p className="text-base leading-7 text-[color:oklch(0.82_0.01_85)]">
                    {isAuthorized ? copy.authorizedBody : copy.verifyChoiceBody}
                  </p>
                </div>
              </aside>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[24px] border border-white/8 bg-white/4 px-4 py-4">
      <div className="mb-2 text-base text-muted-foreground">{label}</div>
      <div className="break-all text-lg font-semibold text-white">{value}</div>
    </div>
  );
}

function StandalonePanel({
  eyebrow,
  title,
  body,
  actions,
  content,
  tone = "default",
}: {
  eyebrow: string;
  title: string;
  body: string;
  actions?: React.ReactNode;
  content?: React.ReactNode;
  tone?: "default" | "warn" | "success";
}) {
  return (
    <div
      className={cn(
        "rounded-[32px] border px-5 py-5 md:px-6 md:py-6",
        tone === "warn"
          ? "border-amber-500/30 bg-amber-500/10"
          : tone === "success"
            ? "border-primary/30 bg-primary/10"
            : "border-white/8 bg-black/10",
      )}
    >
      <div className="mb-3 flex items-center gap-3">
        {tone === "warn" ? <Warning className="size-5 text-amber-300" /> : null}
        {tone === "success" ? <CheckCircle className="size-5 text-primary" /> : null}
        <div className="text-base text-muted-foreground">{eyebrow}</div>
      </div>
      <div className="space-y-4">
        <h2 className="text-2xl font-semibold tracking-tight text-white">{title}</h2>
        <p className="max-w-2xl text-base leading-7 text-[color:oklch(0.82_0.01_85)]">{body}</p>
        {content}
        {actions ? <div className="flex flex-wrap gap-3">{actions}</div> : null}
      </div>
    </div>
  );
}

export function DeviceAuthPage({ copy }: { copy: DeviceAuthMessages }) {
  const privyAppId = getPrivyAppId();
  const [runtime, setRuntime] = React.useState<PrivyRuntimeModule | null>(null);

  if (!privyAppId) {
    return (
      <div className="min-h-dvh bg-background px-4 py-5 md:px-8 md:py-8">
        <div className="mx-auto max-w-3xl">
          <StandalonePanel
            eyebrow={copy.errorLabel}
            title={copy.missingPrivyTitle}
            body={copy.missingPrivyBody}
            tone="warn"
          />
        </div>
      </div>
    );
  }

  React.useEffect(() => {
    let cancelled = false;

    void import("@privy-io/react-auth").then((module) => {
      if (!cancelled) {
        setRuntime(module);
      }
    }).catch((error) => {
      console.error("Could not load Privy runtime", error);
      if (!cancelled) {
        setRuntime(null);
      }
    });

    return () => {
      cancelled = true;
    };
  }, []);

  if (!runtime) {
    return (
      <div className="min-h-dvh bg-background px-4 py-5 md:px-8 md:py-8">
        <div className="mx-auto max-w-3xl">
          <StandalonePanel
            eyebrow={copy.authStageLabel}
            title={copy.checkingStatus}
            body={copy.exchangePending}
          />
        </div>
      </div>
    );
  }

  return (
    <runtime.PrivyProvider
      appId={privyAppId}
      config={createPrivyConfig()}
    >
      <DeviceAuthInner copy={copy} runtime={runtime} />
    </runtime.PrivyProvider>
  );
}
