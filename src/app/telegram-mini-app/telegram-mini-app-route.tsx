"use client";

import * as React from "react";
import type {
  JoinEligibility as ApiJoinEligibility,
  SessionExchangeResponse,
} from "@pirate/api-contracts";

import { useCommunityJoinVerification } from "@/app/authenticated-state/use-community-join-verification";
import { PostPage } from "@/app/authenticated-routes";
import { PublicCommunityRoutePage } from "@/app/public-community-route";
import { navigate } from "@/app/router";
import { Button } from "@/components/primitives/button";
import { PageContainer } from "@/components/primitives/layout-shell";
import { Spinner } from "@/components/primitives/spinner";
import { Type } from "@/components/primitives/type";
import { useApi } from "@/lib/api";
import { resolveApiUrl } from "@/lib/api/base-url";
import { setSession } from "@/lib/api/session-store";
import { getErrorMessage } from "@/lib/error-utils";
import {
  formatGateRequirement,
  getGateFailureMessage,
  getMissingCapabilitiesFromGateEvaluation,
  resolveSuggestedVerificationProvider,
} from "@/lib/identity-gates";
import { openExternalHref } from "@/lib/open-external-href";
import { useUiLocale } from "@/lib/ui-locale";

type TelegramWebAppBridge = {
  BackButton?: {
    hide?: () => void;
    offClick?: (callback: () => void) => void;
    onClick?: (callback: () => void) => void;
    show?: () => void;
  };
  close?: () => void;
  expand?: () => void;
  initDataUnsafe?: {
    start_param?: string;
  };
  initData?: string;
  ready?: () => void;
  themeParams?: {
    bg_color?: string;
    button_color?: string;
    button_text_color?: string;
    hint_color?: string;
    link_color?: string;
    secondary_bg_color?: string;
    text_color?: string;
  };
};

type TelegramOnboardingExchangeResponse = Parameters<typeof setSession>[0] & {
  community: string;
  eligibility?: {
    status?: string;
  };
  membership_result?: {
    status?: string;
  } | null;
  telegram_join_request?: {
    status?: string;
  };
};

type TelegramMiniAppAutoExchangeResponse = SessionExchangeResponse & {
  community: string;
  eligibility: ApiJoinEligibility;
  membership_result?: {
    status?: string;
  } | null;
  telegram_join_request?: {
    status?: string;
  };
};

type TelegramMiniAppSessionExchangeState =
  | { kind: "checking" }
  | { kind: "error"; message: string }
  | { kind: "ready" };

export type TelegramVerifyStatus =
  | "blocked"
  | "error"
  | "joining"
  | "launching"
  | "loading"
  | "success"
  | "waiting";

type TelegramVerifyJoinResult = "blocked" | "joined" | "requested";
export type TelegramVerifyLaunchProvider = "self" | "very" | "zkpassport";

export type PendingTelegramVerificationLaunch = {
  href: string;
  provider: TelegramVerifyLaunchProvider;
};

const TELEGRAM_VERIFY_FLOW_STARTED_STORAGE_PREFIX = "pirate_tg_verify_started:";
const DEFAULT_STAGING_TELEGRAM_BOT_USERNAME = "Pirate_dev_bot";

declare global {
  interface Window {
    Telegram?: {
      WebApp?: TelegramWebAppBridge;
    };
  }
}

export function resolveTelegramMiniAppStartPath(startParam: string | null | undefined): string | null {
  const value = startParam?.trim();
  if (!value) return null;
  const separatorIndex = value.indexOf("_");
  if (separatorIndex <= 0 || separatorIndex === value.length - 1) {
    return null;
  }

  const kind = value.slice(0, separatorIndex);
  const target = value.slice(separatorIndex + 1);
  if (kind === "c") {
    return `/tg/c/${encodeURIComponent(target)}`;
  }
  if (kind === "v") {
    return `/tg/verify/${encodeURIComponent(target)}`;
  }
  if (kind === "p") {
    return `/tg/p/${encodeURIComponent(target)}`;
  }
  return null;
}

export function readTelegramMiniAppStartParam(input: {
  hash?: string | null;
  search?: string | null;
  webAppStartParam?: string | null;
}): string | null {
  const webAppStartParam = input.webAppStartParam?.trim();
  if (webAppStartParam) {
    return webAppStartParam;
  }

  const hash = input.hash?.trim().replace(/^#/u, "");
  if (hash) {
    const hashParams = new URLSearchParams(hash);
    const hashStartParam = hashParams.get("tgWebAppStartParam")?.trim()
      ?? hashParams.get("start_param")?.trim();
    if (hashStartParam) {
      return hashStartParam;
    }
  }

  const search = input.search?.trim().replace(/^\?/u, "");
  if (search) {
    const searchParams = new URLSearchParams(search);
    const queryStartParam = searchParams.get("tgWebAppStartParam")?.trim()
      ?? searchParams.get("startapp")?.trim()
      ?? searchParams.get("start_param")?.trim();
    if (queryStartParam) {
      return queryStartParam;
    }
  }

  return null;
}

export function readTelegramMiniAppInitData(input: {
  hash?: string | null;
  search?: string | null;
  webAppInitData?: string | null;
}): string | null {
  const webAppInitData = input.webAppInitData?.trim();
  if (webAppInitData) {
    return webAppInitData;
  }

  const hash = input.hash?.trim().replace(/^#/u, "");
  if (hash) {
    const hashParams = new URLSearchParams(hash);
    const hashInitData = hashParams.get("tgWebAppData")?.trim();
    if (hashInitData) {
      return hashInitData;
    }
  }

  const search = input.search?.trim().replace(/^\?/u, "");
  if (search) {
    const searchParams = new URLSearchParams(search);
    const queryInitData = searchParams.get("tgWebAppData")?.trim()
      ?? searchParams.get("init_data")?.trim();
    if (queryInitData) {
      return queryInitData;
    }
  }

  return null;
}

function useTelegramMiniAppStartParamRedirect(): boolean {
  const [resolved, setResolved] = React.useState(false);

  React.useEffect(() => {
    const startParam = readTelegramMiniAppStartParam({
      hash: window.location.hash,
      search: window.location.search,
      webAppStartParam: window.Telegram?.WebApp?.initDataUnsafe?.start_param,
    });
    const targetPath = resolveTelegramMiniAppStartPath(startParam);
    if (!targetPath || window.location.pathname === targetPath) {
      setResolved(true);
      return;
    }
    navigate(targetPath);
  }, []);

  return resolved;
}

function telegramThemeStyle(webApp: TelegramWebAppBridge | undefined): React.CSSProperties | undefined {
  const theme = webApp?.themeParams;
  if (!theme) return undefined;
  return {
    "--background": theme.bg_color,
    "--card": theme.secondary_bg_color ?? theme.bg_color,
    "--foreground": theme.text_color,
    "--muted-foreground": theme.hint_color,
    "--primary": theme.button_color,
    "--primary-foreground": theme.button_text_color,
    "--ring": theme.link_color ?? theme.button_color,
  } as React.CSSProperties;
}

function useTelegramMiniAppBridge({ backPath, showBackButton = false }: {
  backPath?: string;
  showBackButton?: boolean;
}) {
  const [style, setStyle] = React.useState<React.CSSProperties | undefined>(undefined);

  React.useEffect(() => {
    const webApp = window.Telegram?.WebApp;
    webApp?.ready?.();
    webApp?.expand?.();
    setStyle(telegramThemeStyle(webApp));

    if (!showBackButton || !webApp?.BackButton) {
      webApp?.BackButton?.hide?.();
      return;
    }

    const handleBack = () => {
      if (window.history.length > 1) {
        window.history.back();
        return;
      }
      if (backPath) {
        navigate(backPath);
        return;
      }
      webApp.close?.();
    };

    webApp.BackButton.show?.();
    webApp.BackButton.onClick?.(handleBack);
    return () => {
      webApp.BackButton?.offClick?.(handleBack);
      webApp.BackButton?.hide?.();
    };
  }, [backPath, showBackButton]);

  return style;
}

function TelegramMiniAppShell({
  backPath,
  children,
  showBackButton,
}: {
  backPath?: string;
  children: React.ReactNode;
  showBackButton?: boolean;
}) {
  const style = useTelegramMiniAppBridge({ backPath, showBackButton });

  return (
    <main
      className="min-h-screen bg-background text-foreground"
      style={style}
    >
      {children}
    </main>
  );
}

export function TelegramMiniAppHomePage() {
  const resolved = useTelegramMiniAppStartParamRedirect();

  if (!resolved) {
    return (
      <TelegramMiniAppShell>
        <div className="min-h-screen bg-background" aria-busy="true" />
      </TelegramMiniAppShell>
    );
  }

  return (
    <TelegramMiniAppShell>
      <div className="px-4 py-6">
        <PageContainer size="narrow">
          <section className="flex min-h-[70svh] flex-col justify-center gap-6">
            <div className="space-y-3">
              <Type as="h1" variant="h1">Open a community invite</Type>
              <Type as="p" variant="body">
                This Telegram link is missing its community context. Open Pirate from a community QR or invite link to continue.
              </Type>
            </div>
            <div className="flex flex-wrap gap-3">
              <Button onClick={() => navigate("/")} variant="secondary">Open Pirate</Button>
              <Button onClick={() => window.Telegram?.WebApp?.close?.()} variant="ghost">Close</Button>
            </div>
          </section>
        </PageContainer>
      </div>
    </TelegramMiniAppShell>
  );
}

function exchangeStatusText(response: TelegramOnboardingExchangeResponse | null): string {
  if (!response) {
    return "Linking your Telegram account...";
  }
  if (response.telegram_join_request?.status === "approved") {
    return "Telegram is linked and your group join request was approved. Return to Telegram.";
  }
  if (response.membership_result?.status === "joined" || response.eligibility?.status === "already_joined") {
    return "Telegram is linked. Return to Telegram and message the community bot again.";
  }
  if (response.eligibility?.status === "verification_required") {
    return "Telegram is linked. Continue verification to finish this group join request.";
  }
  return "Telegram is linked. Return to Telegram to continue.";
}

export function TelegramMiniAppExchangePage() {
  const [status, setStatus] = React.useState<"loading" | "success" | "error">("loading");
  const [message, setMessage] = React.useState("Linking your Telegram account...");
  const [exchangeResponse, setExchangeResponse] = React.useState<TelegramOnboardingExchangeResponse | null>(null);

  React.useEffect(() => {
    const webApp = window.Telegram?.WebApp;
    webApp?.ready?.();
    webApp?.expand?.();

    const token = new URL(window.location.href).searchParams.get("token")?.trim();
    const initData = readTelegramMiniAppInitData({
      hash: window.location.hash,
      search: window.location.search,
      webAppInitData: webApp?.initData,
    });
    if (!token) {
      setStatus("error");
      setMessage("Telegram onboarding link is missing its token.");
      return;
    }
    if (!initData) {
      setStatus("error");
      setMessage("Open this link from Telegram to finish linking.");
      return;
    }

    const controller = new AbortController();
    void fetch(resolveApiUrl("/telegram/session/exchange"), {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ token, init_data: initData }),
      signal: controller.signal,
    })
      .then(async (response) => {
        const body = await response.json().catch(() => null) as TelegramOnboardingExchangeResponse | { message?: string } | null;
        if (!response.ok) {
          throw new Error(body && "message" in body && typeof body.message === "string"
            ? body.message
            : "Could not link Telegram.");
        }
        const exchange = body as TelegramOnboardingExchangeResponse;
        setSession(exchange);
        setExchangeResponse(exchange);
        setMessage(exchangeStatusText(exchange));
        setStatus("success");
      })
      .catch((error) => {
        if (controller.signal.aborted) return;
        setStatus("error");
        setMessage(error instanceof Error ? error.message : "Could not link Telegram.");
      });

    return () => controller.abort();
  }, []);

  return (
    <TelegramMiniAppShell>
      <div className="px-4 py-6">
      <PageContainer size="narrow">
        <section className="flex min-h-[70svh] flex-col justify-center gap-6">
          <div className="space-y-3">
            <Type as="p" variant="overline">Telegram Mini App</Type>
            <Type as="h1" variant="h1">
              {status === "success" ? "Telegram linked" : status === "error" ? "Link failed" : "Linking Telegram"}
            </Type>
            <Type as="p" variant="body">{message}</Type>
          </div>
          <div className="flex flex-wrap gap-3">
            {status === "success" && exchangeResponse?.eligibility?.status === "verification_required" ? (
              <Button onClick={() => navigate(`/tg/verify/${encodeURIComponent(exchangeResponse.community)}`)}>
                Continue verification
              </Button>
            ) : null}
            {status === "success" && exchangeResponse ? (
              <Button
                onClick={() => window.Telegram?.WebApp?.close?.()}
                variant={exchangeResponse.eligibility?.status === "verification_required" ? "secondary" : "default"}
              >
                Return to Telegram
              </Button>
            ) : null}
            {status === "error" ? (
              <Button onClick={() => navigate("/tg")} variant="secondary">Open Telegram home</Button>
            ) : null}
          </div>
        </section>
      </PageContainer>
      </div>
    </TelegramMiniAppShell>
  );
}

function isJoinableEligibility(eligibility: ApiJoinEligibility): boolean {
  return eligibility.status === "joinable" || eligibility.joinable_now;
}

function telegramVerifyFlowStartedStorageKey(communityId: string): string {
  return `${TELEGRAM_VERIFY_FLOW_STARTED_STORAGE_PREFIX}${communityId}`;
}

function readTelegramVerifyFlowStarted(communityId: string): boolean {
  if (typeof window === "undefined") {
    return false;
  }
  try {
    return window.sessionStorage.getItem(telegramVerifyFlowStartedStorageKey(communityId)) === "1";
  } catch {
    return false;
  }
}

function writeTelegramVerifyFlowStarted(communityId: string): void {
  if (typeof window === "undefined") {
    return;
  }
  try {
    window.sessionStorage.setItem(telegramVerifyFlowStartedStorageKey(communityId), "1");
  } catch {
    // Storage can be unavailable in some embedded contexts. The active route still has an in-memory ref.
  }
}

function buildTelegramSelfReturnHref(communityId: string): string | null {
  if (typeof window === "undefined") {
    return null;
  }
  return new URL(`/tg/self-return/${encodeURIComponent(communityId)}`, window.location.origin).toString();
}

function normalizeTelegramBotUsername(value: string | null | undefined): string | null {
  const normalized = value?.trim().replace(/^@/u, "") ?? "";
  return /^[A-Za-z0-9_]{5,32}$/u.test(normalized) ? normalized : null;
}

export function resolveTelegramBotUsername(input: {
  appEnv?: string | null;
  explicitUsername?: string | null;
  dev?: boolean;
} = {}): string | null {
  const explicit = normalizeTelegramBotUsername(input.explicitUsername ?? import.meta.env.VITE_TELEGRAM_BOT_USERNAME);
  if (explicit) return explicit;

  const appEnv = String(input.appEnv ?? import.meta.env.VITE_PIRATE_APP_ENV ?? "").toLowerCase();
  if (input.dev || appEnv === "dev" || appEnv === "development" || appEnv === "staging") {
    return DEFAULT_STAGING_TELEGRAM_BOT_USERNAME;
  }
  return null;
}

export function buildTelegramStartAppHref(input: {
  botUsername: string | null | undefined;
  startParam: string | null | undefined;
}): string | null {
  const botUsername = normalizeTelegramBotUsername(input.botUsername);
  const startParam = input.startParam?.trim() ?? "";
  if (!botUsername || !/^[A-Za-z0-9_-]{1,512}$/u.test(startParam)) {
    return null;
  }
  const href = new URL(`https://t.me/${botUsername}`);
  href.searchParams.set("startapp", startParam);
  return href.toString();
}

function telegramVerifyActionKey(communityId: string, eligibility: ApiJoinEligibility): string {
  return [
    communityId,
    eligibility.status,
    eligibility.suggested_verification_provider ?? "",
    ...(eligibility.missing_capabilities ?? []),
  ].join(":");
}

export function telegramVerifyTerminalMessage(
  eligibility: ApiJoinEligibility,
  locale: string,
  options: { joinedInThisFlow?: boolean } = {},
): string | null {
  switch (eligibility.status) {
    case "already_joined":
      if (options.joinedInThisFlow) {
        return "Joined.";
      }
      return "You're already a member.";
    case "pending_request":
      return "Your join request is pending.";
    case "banned":
      return "This account cannot join this community.";
    case "gate_failed":
      return getGateFailureMessage(eligibility, { locale })
        ?? "This account does not meet the community requirements.";
    case "requestable":
      return "This community requires a join request.";
    default:
      return null;
  }
}

export function telegramVerifyPreparingMessage(provider: TelegramVerifyLaunchProvider): string {
  switch (provider) {
    case "zkpassport":
      return "Opening ZKPassport";
    case "very":
      return "Opening verification";
    case "self":
      return "Opening Self.xyz";
  }
}

export function telegramVerifyReadyTitle(provider?: TelegramVerifyLaunchProvider | null): string {
  switch (provider) {
    case "zkpassport":
      return "Verify with ZKPassport";
    case "self":
      return "Verify to join";
    case "very":
      return "Verify identity";
    default:
      return "Verify to join";
  }
}

export function telegramVerifyWaitingTitle(provider?: TelegramVerifyLaunchProvider | null): string {
  switch (provider) {
    case "zkpassport":
      return "Waiting for verification";
    case "self":
      return "Waiting for verification";
    case "very":
      return "Finish verification";
    default:
      return "Finish verification";
  }
}

export function telegramVerifyReadyMessage(provider?: TelegramVerifyLaunchProvider | null): string {
  switch (provider) {
    case "zkpassport":
      return "Use the ZKPassport App to continue.";
    case "self":
      return "Use the Self.xyz App to continue.";
    case "very":
      return "Open verification to continue.";
    default:
      return "Open verification to continue.";
  }
}

export function telegramVerifyWaitingMessage(provider?: TelegramVerifyLaunchProvider | null): string {
  switch (provider) {
    case "zkpassport":
      return "Complete verification in the ZKPassport App. Pirate will update automatically.";
    case "self":
      return "Complete verification in the Self.xyz App. Pirate will update automatically.";
    case "very":
      return "Complete verification. Pirate will update automatically.";
    default:
      return "Complete verification. Pirate will update automatically.";
  }
}

export function telegramVerifyLaunchButtonLabel(provider: TelegramVerifyLaunchProvider): string {
  switch (provider) {
    case "zkpassport":
      return "Open ZKPassport";
    case "very":
      return "Open verification";
    case "self":
      return "Open Self.xyz";
  }
}

function telegramVerifyShortRequirementMessage(
  eligibility: Pick<ApiJoinEligibility, "membership_gate_summaries" | "missing_capabilities" | "gate_evaluation">,
  locale: string,
): string {
  const gates = eligibility.membership_gate_summaries ?? [];
  const capabilities = getMissingCapabilitiesFromGateEvaluation(eligibility);
  const relevantGates = gates.filter((gate) => {
    switch (gate.gate_type) {
      case "age_over_18":
        return capabilities.includes("age_over_18");
      case "minimum_age":
        return capabilities.includes("minimum_age");
      case "nationality":
        return capabilities.includes("nationality");
      case "gender":
        return capabilities.includes("gender");
      case "unique_human":
        return capabilities.includes("unique_human");
      case "wallet_score":
        return capabilities.includes("wallet_score");
      case "altcha_pow":
        return capabilities.includes("altcha_pow");
      default:
        return false;
    }
  });
  const formattedRequirements = (relevantGates.length > 0 ? relevantGates : gates)
    .slice(0, 2)
    .map((gate) => formatGateRequirement(gate, { locale }))
    .filter((requirement, index, all) => requirement.trim() && all.indexOf(requirement) === index);
  if (formattedRequirements.length > 0) {
    return `Required: ${formattedRequirements.join(" + ")}`;
  }
  if (capabilities.includes("unique_human")) {
    return "Required: Real person check";
  }
  if (capabilities.includes("wallet_score")) {
    return "Required: Passport Score";
  }
  return "Required: Account verification";
}

function telegramVerifySelfReadyMessage(
  eligibility: Pick<ApiJoinEligibility, "membership_gate_summaries" | "missing_capabilities" | "gate_evaluation">,
  locale: string,
): string {
  const requirement = telegramVerifyShortRequirementMessage(eligibility, locale)
    .replace(/^Required:\s*/u, "")
    .trim();
  if (requirement && requirement !== "Account verification" && requirement !== "Real person check") {
    return `Prove ${requirement} anonymously with Self.xyz.`;
  }
  return "Verify anonymously with Self.xyz.";
}

export function TelegramMiniAppVerifyView({
  busy = false,
  canRetry = false,
  externalLaunchOpened = false,
  onCheckStatus,
  onOpenBoard,
  onOpenPendingLaunch,
  onRetry,
  pendingLaunch,
  status,
  title,
}: {
  busy?: boolean;
  canRetry?: boolean;
  externalLaunchOpened?: boolean;
  onCheckStatus?: () => void | Promise<void>;
  onOpenBoard?: () => void;
  onOpenPendingLaunch?: () => void;
  onRetry?: () => void;
  pendingLaunch?: PendingTelegramVerificationLaunch | null;
  status: TelegramVerifyStatus;
  title: string;
}) {
  const showSpinner = busy || (status === "waiting" && externalLaunchOpened);
  return (
    <TelegramMiniAppShell>
      <div className="px-4 py-6">
        <PageContainer size="narrow">
          <section className="flex min-h-[calc(100svh-3rem)] flex-col items-center justify-center">
            <div className="flex min-h-48 w-full max-w-md flex-col items-center justify-center text-center">
              <Type
                as="h1"
                className="max-w-sm text-balance text-2xl leading-snug tracking-normal sm:text-3xl"
                variant="h1"
              >
                {title}
              </Type>
              <div className="mt-5 flex h-12 items-center justify-center">
                {showSpinner ? (
                  <Spinner className="size-10 text-muted-foreground" />
                ) : null}
              </div>
              <div className="mt-5 flex min-h-11 flex-wrap items-center justify-center gap-3">
                {status === "waiting" ? (
                  <>
                    {pendingLaunch && !externalLaunchOpened ? (
                      <Button onClick={onOpenPendingLaunch}>
                        {telegramVerifyLaunchButtonLabel(pendingLaunch.provider)}
                      </Button>
                    ) : null}
                    {!pendingLaunch ? (
                      <Button
                        loading={busy}
                        onClick={() => {
                          void onCheckStatus?.();
                        }}
                      >
                        Check status
                      </Button>
                    ) : null}
                  </>
                ) : null}
                {(status === "error" || status === "blocked") && canRetry ? (
                  <Button loading={busy} onClick={onRetry}>
                    Try again
                  </Button>
                ) : null}
                {status === "success" ? (
                  <Button onClick={onOpenBoard}>
                    Open community
                  </Button>
                ) : null}
                {status === "error" || status === "blocked" ? (
                  <Button onClick={onOpenBoard} variant="ghost">
                    Open community
                  </Button>
                ) : null}
              </div>
            </div>
          </section>
        </PageContainer>
      </div>
    </TelegramMiniAppShell>
  );
}

export function TelegramMiniAppVerifyPage({
  communityId,
}: {
  communityId: string;
}) {
  const api = useApi();
  const { locale } = useUiLocale();
  const [exchangeResponse, setExchangeResponse] = React.useState<TelegramMiniAppAutoExchangeResponse | null>(null);
  const [eligibility, setEligibility] = React.useState<ApiJoinEligibility | null>(null);
  const [message, setMessage] = React.useState("Verifying access...");
  const [pendingLaunch, setPendingLaunch] = React.useState<PendingTelegramVerificationLaunch | null>(null);
  const [externalLaunchOpened, setExternalLaunchOpened] = React.useState(false);
  const [status, setStatus] = React.useState<TelegramVerifyStatus>("loading");
  const autoActionKeyRef = React.useRef<string | null>(null);
  const refreshAfterReturnInFlightRef = React.useRef(false);
  const verificationLaunchStartedRef = React.useRef(false);
  const verificationStartedInThisBrowserRef = React.useRef(false);
  const joinedInThisFlowRef = React.useRef(false);

  React.useEffect(() => {
    const webApp = window.Telegram?.WebApp;
    webApp?.ready?.();
    webApp?.expand?.();

    const initData = readTelegramMiniAppInitData({
      hash: window.location.hash,
      search: window.location.search,
      webAppInitData: webApp?.initData,
    });
    if (!initData) {
      setStatus("error");
      setMessage("Open this verification link from Telegram.");
      return;
    }

    const controller = new AbortController();
    autoActionKeyRef.current = null;
    refreshAfterReturnInFlightRef.current = false;
    verificationLaunchStartedRef.current = false;
    verificationStartedInThisBrowserRef.current = readTelegramVerifyFlowStarted(communityId);
    joinedInThisFlowRef.current = false;
    setPendingLaunch(null);
    setExternalLaunchOpened(false);
    setStatus("loading");
    setMessage("Verifying access...");
    void fetch(resolveApiUrl("/telegram/session/auto-exchange"), {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ community_id: communityId, init_data: initData }),
      signal: controller.signal,
    })
      .then(async (response) => {
        const body = await response.json().catch(() => null) as TelegramMiniAppAutoExchangeResponse | { message?: string } | null;
        if (!response.ok) {
          throw new Error(body && "message" in body && typeof body.message === "string"
            ? body.message
            : "Could not verify Telegram identity.");
        }
        const exchange = body as TelegramMiniAppAutoExchangeResponse;
        setSession(exchange);
        setExchangeResponse(exchange);
        setEligibility(exchange.eligibility);
        setMessage("Verifying access...");
      })
      .catch((error) => {
        if (controller.signal.aborted) return;
        setStatus("error");
        setMessage(getErrorMessage(error, "Could not verify Telegram identity."));
      });

    return () => controller.abort();
  }, [communityId]);

  const resolvedCommunityId = exchangeResponse?.community ?? communityId;
  const refetchEligibility = React.useCallback(async () => {
    const nextEligibility = await api.communities.getJoinEligibility(resolvedCommunityId);
    setEligibility(nextEligibility);
    return nextEligibility;
  }, [api, resolvedCommunityId]);

  const {
    handleJoin,
    joinError,
    joinLoading,
    joinRequested,
    selfError,
    selfLoading,
    startSelfVerification,
    startVeryVerification,
    startZkPassportVerification,
    veryLoading,
    zkPassportError,
    zkPassportLoading,
  } = useCommunityJoinVerification({
    autoJoinAfterVerification: false,
    communityId: resolvedCommunityId,
    eligibility,
    locale,
    onJoined: () => {
      setStatus("success");
      setMessage("Joined.");
    },
    refetchEligibility,
  });

  const joinVerifiedCommunity = React.useCallback(async (): Promise<TelegramVerifyJoinResult> => {
    const result = await api.communities.join(resolvedCommunityId);
    const nextEligibility = await refetchEligibility().catch(() => null);
    if (result.status === "requested") {
      return "requested";
    }
    if (result.status === "joined" || nextEligibility?.status === "already_joined") {
      return "joined";
    }
    return "blocked";
  }, [api, refetchEligibility, resolvedCommunityId]);

  const runAutoAction = React.useCallback(async (
    nextEligibility: ApiJoinEligibility,
    options: { allowJoinAfterVerification?: boolean } = {},
  ) => {
    const treatAlreadyJoinedAsFlowSuccess = nextEligibility.status === "already_joined" && (
      joinedInThisFlowRef.current
      || verificationLaunchStartedRef.current
      || verificationStartedInThisBrowserRef.current
    );
    if (treatAlreadyJoinedAsFlowSuccess) {
      joinedInThisFlowRef.current = true;
    }
    const terminalMessage = telegramVerifyTerminalMessage(nextEligibility, locale, {
      joinedInThisFlow: joinedInThisFlowRef.current || treatAlreadyJoinedAsFlowSuccess,
    });
    if (terminalMessage) {
      verificationLaunchStartedRef.current = false;
      setPendingLaunch(null);
      setExternalLaunchOpened(false);
      setStatus(nextEligibility.status === "gate_failed" || nextEligibility.status === "banned" ? "blocked" : "success");
      setMessage(terminalMessage);
      return;
    }

    if (isJoinableEligibility(nextEligibility)) {
      if (verificationLaunchStartedRef.current && !options.allowJoinAfterVerification) {
        return;
      }
      verificationLaunchStartedRef.current = false;
      setPendingLaunch(null);
      setExternalLaunchOpened(false);
      setStatus("joining");
      setMessage("Joining community...");
      try {
        const result = await joinVerifiedCommunity();
        if (result === "joined") {
          joinedInThisFlowRef.current = true;
          setStatus("success");
          setMessage("Joined.");
        } else if (result === "requested") {
          setStatus("success");
          setMessage("Your join request is pending.");
        } else {
          setStatus("blocked");
          setMessage("More verification is required.");
        }
      } catch (error) {
        setStatus("error");
        setMessage(getErrorMessage(error, "Could not join this community."));
      }
      return;
    }

    if (nextEligibility.status !== "verification_required") {
      setPendingLaunch(null);
      setExternalLaunchOpened(false);
      setStatus("blocked");
      setMessage(terminalMessage ?? "This account is not eligible to join yet.");
      return;
    }

    const provider = resolveSuggestedVerificationProvider(nextEligibility);
    if (provider === "passport") {
      verificationLaunchStartedRef.current = false;
      setPendingLaunch(null);
      await handleJoin();
      return;
    }

    verificationLaunchStartedRef.current = true;
    verificationStartedInThisBrowserRef.current = true;
    writeTelegramVerifyFlowStarted(resolvedCommunityId);
    setPendingLaunch(null);
    setExternalLaunchOpened(false);
    setStatus("launching");
    setMessage(telegramVerifyPreparingMessage(provider === "zkpassport" || provider === "very" ? provider : "self"));

    if (provider === "zkpassport") {
      const result = await startZkPassportVerification({
        deferOpen: true,
        showToastOnError: false,
      });
      if (result.started && result.href) {
        setPendingLaunch({ href: result.href, provider: "zkpassport" });
        setExternalLaunchOpened(false);
        setStatus("waiting");
        setMessage(telegramVerifyReadyMessage("zkpassport"));
      } else {
        verificationLaunchStartedRef.current = false;
        setStatus("error");
        setMessage(result.error ?? "Could not start ZKPassport verification.");
      }
      return;
    }

    if (provider === "very") {
      const result = await startVeryVerification();
      if (result.started) {
        setStatus("waiting");
        setMessage(telegramVerifyWaitingMessage("very"));
      } else {
        verificationLaunchStartedRef.current = false;
        setStatus("error");
        setMessage("Could not start verification.");
      }
      return;
    }

    const result = await startSelfVerification({
      deeplinkCallbackBaseHref: buildTelegramSelfReturnHref(resolvedCommunityId),
      showToastOnError: false,
      skipModal: true,
    });
    if (!result.started || !result.href) {
      verificationLaunchStartedRef.current = false;
      setPendingLaunch(null);
      setStatus("error");
      setMessage("Could not start Self verification.");
      return;
    }
    setPendingLaunch({ href: result.href, provider: "self" });
    setExternalLaunchOpened(false);
    setStatus("waiting");
    setMessage(telegramVerifySelfReadyMessage(nextEligibility, locale));
  }, [
    handleJoin,
    joinVerifiedCommunity,
    locale,
    startSelfVerification,
    startVeryVerification,
    startZkPassportVerification,
  ]);

  React.useEffect(() => {
    if (!exchangeResponse || !eligibility) {
      return;
    }
    const actionKey = telegramVerifyActionKey(exchangeResponse.community, eligibility);
    if (autoActionKeyRef.current === actionKey) {
      return;
    }
    autoActionKeyRef.current = actionKey;
    void runAutoAction(eligibility);
  }, [eligibility, exchangeResponse, runAutoAction]);

  React.useEffect(() => {
    const error = joinError ?? selfError ?? zkPassportError;
    if (!error) {
      return;
    }
    setStatus("error");
    setMessage(error);
  }, [joinError, selfError, zkPassportError]);

  React.useEffect(() => {
    if (joinRequested) {
      setStatus("success");
      setMessage("Your join request is pending.");
    }
  }, [joinRequested]);

  const providerBusy = selfLoading || veryLoading || zkPassportLoading;
  const providerBusyRef = React.useRef(providerBusy);
  React.useEffect(() => {
    providerBusyRef.current = providerBusy;
  }, [providerBusy]);

  const refreshVerificationStatus = React.useCallback(async (options: { showCheckingMessage?: boolean } = {}) => {
    if (!exchangeResponse || refreshAfterReturnInFlightRef.current) {
      return;
    }
    refreshAfterReturnInFlightRef.current = true;
    if (options.showCheckingMessage) {
      setMessage("Checking verification...");
    }
    try {
      const nextEligibility = await refetchEligibility();
      if (providerBusyRef.current) {
        return;
      }
      if (nextEligibility.status === "verification_required") {
        setStatus("waiting");
        setMessage(externalLaunchOpened
          ? telegramVerifyWaitingMessage(pendingLaunch?.provider)
          : telegramVerifyReadyMessage(pendingLaunch?.provider));
        return;
      }
      autoActionKeyRef.current = telegramVerifyActionKey(exchangeResponse.community, nextEligibility);
      await runAutoAction(nextEligibility, { allowJoinAfterVerification: true });
    } catch (error) {
      setStatus("error");
      setMessage(getErrorMessage(error, "Could not check verification."));
    } finally {
      refreshAfterReturnInFlightRef.current = false;
    }
  }, [exchangeResponse, externalLaunchOpened, pendingLaunch?.provider, refetchEligibility, runAutoAction]);

  React.useEffect(() => {
    if (status !== "waiting" || !exchangeResponse) {
      return;
    }

    let timeoutId: number | null = null;
    const scheduleRefresh = () => {
      if (document.visibilityState === "hidden") {
        return;
      }
      if (timeoutId) {
        window.clearTimeout(timeoutId);
      }
      timeoutId = window.setTimeout(() => {
        if (!providerBusyRef.current) {
          void refreshVerificationStatus();
        }
      }, 700);
    };

    const refreshWhenVisible = () => {
      if (document.visibilityState !== "hidden") {
        scheduleRefresh();
      }
    };

    scheduleRefresh();
    const intervalId = window.setInterval(scheduleRefresh, 2500);
    window.addEventListener("focus", scheduleRefresh);
    window.addEventListener("pageshow", scheduleRefresh);
    document.addEventListener("visibilitychange", refreshWhenVisible);
    return () => {
      if (timeoutId) {
        window.clearTimeout(timeoutId);
      }
      window.clearInterval(intervalId);
      window.removeEventListener("focus", scheduleRefresh);
      window.removeEventListener("pageshow", scheduleRefresh);
      document.removeEventListener("visibilitychange", refreshWhenVisible);
    };
  }, [exchangeResponse, refreshVerificationStatus, status]);

  const busy = status === "loading" || status === "joining" || status === "launching" || joinLoading || selfLoading || veryLoading || zkPassportLoading;
  const title = status === "success"
    ? message
    : status === "error"
      ? message
      : status === "blocked"
        ? message
        : status === "waiting"
          ? message
          : status === "loading"
            ? "Checking account"
          : status === "launching"
            ? message
            : status === "joining"
              ? message
              : "Verify to join";

  return (
    <TelegramMiniAppVerifyView
      busy={busy}
      canRetry={Boolean((status === "error" || status === "blocked") && eligibility)}
      externalLaunchOpened={externalLaunchOpened}
      onCheckStatus={async () => {
        await refreshVerificationStatus({ showCheckingMessage: true });
      }}
      onOpenBoard={() => navigate(`/tg/c/${encodeURIComponent(resolvedCommunityId)}`)}
      onOpenPendingLaunch={() => {
        if (!pendingLaunch) {
          return;
        }
        verificationStartedInThisBrowserRef.current = true;
        writeTelegramVerifyFlowStarted(resolvedCommunityId);
        setExternalLaunchOpened(true);
        setMessage(telegramVerifyWaitingMessage(pendingLaunch.provider));
        openExternalHref(pendingLaunch.href);
      }}
      onRetry={() => {
        if (!eligibility) {
          return;
        }
        autoActionKeyRef.current = null;
        void runAutoAction(eligibility);
      }}
      pendingLaunch={pendingLaunch}
      status={status}
      title={title}
    />
  );
}

export function TelegramMiniAppSelfReturnPage({
  communityId,
}: {
  communityId?: string | null;
}) {
  const [showFallback, setShowFallback] = React.useState(false);

  React.useEffect(() => {
    const timeoutId = window.setTimeout(() => setShowFallback(true), 1200);
    return () => window.clearTimeout(timeoutId);
  }, [communityId]);

  if (!showFallback) {
    return (
      <TelegramMiniAppShell>
        <div className="min-h-screen bg-background" aria-busy="true" />
      </TelegramMiniAppShell>
    );
  }

  return (
    <TelegramMiniAppShell>
      <div className="px-4 py-6">
        <PageContainer size="narrow">
          <section className="flex min-h-[calc(100svh-3rem)] flex-col items-center justify-center">
            <div className="flex min-h-48 w-full max-w-md flex-col items-center justify-center text-center">
              <Type
                as="h1"
                className="max-w-sm text-balance text-2xl leading-snug tracking-normal sm:text-3xl"
                variant="h1"
              >
                Return to Telegram
              </Type>
            </div>
          </section>
        </PageContainer>
      </div>
    </TelegramMiniAppShell>
  );
}

function useTelegramMiniAppSessionExchange(communityId: string): TelegramMiniAppSessionExchangeState {
  const [state, setState] = React.useState<TelegramMiniAppSessionExchangeState>({ kind: "checking" });

  React.useEffect(() => {
    const webApp = window.Telegram?.WebApp;
    webApp?.ready?.();
    webApp?.expand?.();

    const initData = readTelegramMiniAppInitData({
      hash: window.location.hash,
      search: window.location.search,
      webAppInitData: webApp?.initData,
    });
    if (!initData) {
      setState({ kind: "ready" });
      return;
    }

    const controller = new AbortController();
    setState({ kind: "checking" });
    void fetch(resolveApiUrl("/telegram/session/auto-exchange"), {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ community_id: communityId, init_data: initData }),
      signal: controller.signal,
    })
      .then(async (response) => {
        const body = await response.json().catch(() => null) as TelegramMiniAppAutoExchangeResponse | { message?: string } | null;
        if (!response.ok) {
          throw new Error(body && "message" in body && typeof body.message === "string"
            ? body.message
            : "Could not verify Telegram identity.");
        }
        setSession(body as TelegramMiniAppAutoExchangeResponse);
        setState({ kind: "ready" });
      })
      .catch((error) => {
        if (controller.signal.aborted) return;
        setState({
          kind: "error",
          message: getErrorMessage(error, "Could not verify Telegram identity."),
        });
      });

    return () => controller.abort();
  }, [communityId]);

  return state;
}

export function TelegramMiniAppCommunityPage({
  communityId,
}: {
  communityId: string;
}) {
  const sessionExchange = useTelegramMiniAppSessionExchange(communityId);

  if (sessionExchange.kind === "checking") {
    return (
      <TelegramMiniAppShell showBackButton>
        <div className="flex min-h-[70svh] items-center justify-center px-4">
          <Spinner className="size-9 text-muted-foreground" />
        </div>
      </TelegramMiniAppShell>
    );
  }

  if (sessionExchange.kind === "error") {
    return (
      <TelegramMiniAppShell showBackButton>
        <div className="px-4 py-6">
          <PageContainer size="narrow">
            <section className="flex min-h-[70svh] flex-col justify-center gap-6 text-center">
              <div className="space-y-3">
                <Type as="h1" variant="h2">Could not open this community</Type>
                <Type as="p" className="text-muted-foreground" variant="body">
                  {sessionExchange.message}
                </Type>
              </div>
              <Button onClick={() => window.location.reload()} variant="secondary">Try again</Button>
            </section>
          </PageContainer>
        </div>
      </TelegramMiniAppShell>
    );
  }

  return (
    <TelegramMiniAppShell showBackButton>
      <div className="px-3 pb-8 pt-[calc(env(safe-area-inset-top)+1rem)]">
        <PublicCommunityRoutePage
          buildPostPath={(postId) => `/tg/p/${encodeURIComponent(postId)}`}
          communityId={communityId}
          disableCanonicalRouteReplace
        />
      </div>
    </TelegramMiniAppShell>
  );
}

export function TelegramMiniAppPostPage({
  postId,
}: {
  postId: string;
}) {
  return (
    <TelegramMiniAppShell backPath="/tg" showBackButton>
      <PostPage postId={postId} telegramMiniApp />
    </TelegramMiniAppShell>
  );
}
