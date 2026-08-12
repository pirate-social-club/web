"use client";

import * as React from "react";
import type {
  JoinEligibility as ApiJoinEligibility,
  SessionExchangeResponse,
} from "@pirate/api-contracts";

import { useCommunityJoinVerification } from "@/app/authenticated-state/use-community-join-verification";
import { PostPage } from "@/app/authenticated-routes";
import { StudyRoutePage } from "@/app/authenticated-routes/study-route";
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
  getMissingCapabilitiesFromGateEvaluation,
  getGateFailureMessage,
  type HumanVerificationProvider,
  resolveAvailableHumanVerificationProviders,
  resolveSuggestedVerificationProvider,
} from "@/lib/identity-gates";
import { openExternalHref } from "@/lib/open-external-href";
import { useUiLocale } from "@/lib/ui-locale";
import { solveAltchaChallengeHeadless } from "@/lib/verification/altcha-headless";

import {
  TelegramMiniAppVerifyView,
  telegramVerifyReadyMessage,
} from "./telegram-mini-app-verify-view";
import {
  launchTelegramSelfVerification,
  launchTelegramZkPassportVerification,
  telegramVerifySelfReadyMessage,
} from "./telegram-verification-planning";
import {
  initialTelegramVerifyFlowState,
  telegramVerifyReducer,
  telegramVerifyScreenCommitDelayMs,
  type TelegramVerifyFlowAction,
  type TelegramVerifyFlowState,
  type TelegramVerifyLaunchProvider,
  type TelegramVerifyScreenState,
} from "./telegram-mini-app-verify-controller";

export {
  telegramVerifyLaunchButtonLabel,

  telegramVerifyReadyMessage,
  telegramVerifyReadyTitle,
  resolveTelegramVerifyViewModel,
  telegramVerifyWaitingMessage,
  telegramVerifyWaitingTitle,
} from "./telegram-mini-app-verify-view";
export type {

  TelegramVerifyLaunchProvider,
  TelegramVerifyScreenState,
} from "./telegram-mini-app-verify-controller";

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
  offEvent?: (eventType: "themeChanged", eventHandler: () => void) => void;
  onEvent?: (eventType: "themeChanged", eventHandler: () => void) => void;
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

export function hasOnlyTelegramJoinAltchaRequirement(eligibility: ApiJoinEligibility): boolean {
  const missingCapabilities = getMissingCapabilitiesFromGateEvaluation(eligibility);
  return missingCapabilities.length > 0
    && missingCapabilities.every((capability) => capability === "altcha_pow");
}

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

type TelegramVerifyJoinResult = "blocked" | "joined" | "requested";

const TELEGRAM_VERIFY_FLOW_STARTED_STORAGE_PREFIX = "pirate_tg_verify_started:";
const TELEGRAM_VERIFY_LAUNCH_WATCHDOG_MS = 15_000;
const DEFAULT_STAGING_TELEGRAM_BOT_USERNAME = "Pirate_dev_bot";

type TelegramVerifyDebugEvent = {
  at: string;
  data?: Record<string, unknown>;
  label: string;
};

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
  if (kind === "s") {
    const lengthSeparatorIndex = target.indexOf("_");
    if (lengthSeparatorIndex <= 0) return null;
    const communityLengthText = target.slice(0, lengthSeparatorIndex);
    if (!/^[1-9][0-9]{0,2}$/u.test(communityLengthText)) return null;
    const payload = target.slice(lengthSeparatorIndex + 1);
    const communityLength = Number(communityLengthText);
    if (payload.length <= communityLength) return null;
    const communityId = payload.slice(0, communityLength);
    const postId = payload.slice(communityLength);
    return `/tg/c/${encodeURIComponent(communityId)}/p/${encodeURIComponent(postId)}/study`;
  }
  if (kind === "c" || kind === "join") {
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

export function buildTelegramStudyStartParam(communityId: string, postId: string): string | null {
  const community = communityId.trim();
  const post = postId.trim();
  if (
    !community
    || !post
    || !/^[A-Za-z0-9_-]+$/u.test(community)
    || !/^[A-Za-z0-9_-]+$/u.test(post)
  ) {
    return null;
  }
  const value = `s_${community.length}_${community}${post}`;
  return value.length <= 512 ? value : null;
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
  const background = theme.bg_color;
  const foreground = theme.text_color;
  const secondary = theme.secondary_bg_color ?? theme.bg_color;
  const hint = theme.hint_color;
  const button = theme.button_color;
  const buttonText = theme.button_text_color;
  const link = theme.link_color ?? theme.button_color;
  return {
    "--background": background,
    "--border": hint ? `color-mix(in oklab, ${hint} 35%, transparent)` : undefined,
    "--border-soft": hint ? `color-mix(in oklab, ${hint} 20%, transparent)` : undefined,
    "--card": secondary,
    "--card-foreground": foreground,
    "--foreground": foreground,
    "--input": hint ? `color-mix(in oklab, ${hint} 45%, transparent)` : undefined,
    "--muted": secondary,
    "--muted-foreground": hint,
    "--popover": secondary,
    "--popover-foreground": foreground,
    "--primary": button,
    "--primary-foreground": buttonText,
    "--primary-subtle": button && secondary ? `color-mix(in oklab, ${button} 10%, ${secondary})` : undefined,
    "--ring": link,
    "--secondary": secondary,
    "--secondary-foreground": foreground,
    "--sidebar-background": background,
    "--sidebar-foreground": foreground,
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
    const syncTheme = () => setStyle(telegramThemeStyle(webApp));
    syncTheme();
    webApp?.onEvent?.("themeChanged", syncTheme);

    if (!showBackButton || !webApp?.BackButton) {
      webApp?.BackButton?.hide?.();
      return () => {
        webApp?.offEvent?.("themeChanged", syncTheme);
      };
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
      webApp.offEvent?.("themeChanged", syncTheme);
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
    return "Linking Telegram account";
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
  const [message, setMessage] = React.useState("Linking Telegram account");
  const [exchangeResponse, setExchangeResponse] = React.useState<TelegramOnboardingExchangeResponse | null>(null);
  const [attempt, setAttempt] = React.useState(0);

  React.useEffect(() => {
    const webApp = window.Telegram?.WebApp;
    webApp?.ready?.();
    webApp?.expand?.();
    setStatus("loading");
    setMessage("Linking Telegram account");
    setExchangeResponse(null);

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
  }, [attempt]);

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
              <>
                <Button onClick={() => setAttempt((value) => value + 1)}>Try again</Button>
                <Button onClick={() => navigate("/tg")} variant="secondary">Open Telegram home</Button>
              </>
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

function telegramVerifyDebugEnabled(): boolean {
  if (typeof window === "undefined") {
    return false;
  }
  try {
    return new URL(window.location.href).searchParams.get("debug") === "1";
  } catch {
    return false;
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

function telegramVerifyBlockedMessage(eligibility: ApiJoinEligibility, locale: string): string {
  switch (eligibility.failure_reason) {
    case "missing_verification":
    case "nationality_mismatch":
    case "gender_mismatch":
    case "minimum_age_mismatch":
    case "wallet_score_too_low":
      return telegramVerifyShortRequirementMessage(eligibility, locale);
    default:
      return getGateFailureMessage(eligibility, { locale })
        ?? "This account is not eligible to join this community.";
  }
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
      return telegramVerifyBlockedMessage(eligibility, locale);
    case "requestable":
      return "This community requires a join request.";
    default:
      return null;
  }
}

export function TelegramMiniAppVerifyPage({
  communityId,
}: {
  communityId: string;
}) {
  const api = useApi();
  const { locale } = useUiLocale();
  const [flowState, dispatchFlowState] = React.useReducer(
    telegramVerifyReducer,
    undefined,
    initialTelegramVerifyFlowState,
  );
  const flowStateRef = React.useRef<TelegramVerifyFlowState>(flowState);
  const [displayedScreen, setDisplayedScreen] = React.useState<TelegramVerifyScreenState>({ kind: "idle" });
  const pendingScreenCommitRef = React.useRef<number | null>(null);
  const [debugEnabled] = React.useState(() => telegramVerifyDebugEnabled());
  const [debugEvents, setDebugEvents] = React.useState<TelegramVerifyDebugEvent[]>([]);
  const refreshAfterReturnInFlightRef = React.useRef(false);

  const recordDebug = React.useCallback((label: string, data?: Record<string, unknown>) => {
    if (!debugEnabled) {
      return;
    }
    setDebugEvents((events) => [
      ...events.slice(-19),
      {
        at: new Date().toISOString(),
        ...(data ? { data } : {}),
        label,
      },
    ]);
  }, [debugEnabled]);

  React.useEffect(() => {
    flowStateRef.current = flowState;
  }, [flowState]);

  React.useEffect(() => () => {
    if (pendingScreenCommitRef.current !== null) {
      window.clearTimeout(pendingScreenCommitRef.current);
    }
  }, []);

  const commitScreen = React.useCallback((screen: TelegramVerifyScreenState) => {
    if (pendingScreenCommitRef.current !== null) {
      window.clearTimeout(pendingScreenCommitRef.current);
      pendingScreenCommitRef.current = null;
    }
    const commitDelayMs = telegramVerifyScreenCommitDelayMs(screen);
    if (commitDelayMs !== null) {
      pendingScreenCommitRef.current = window.setTimeout(() => {
        pendingScreenCommitRef.current = null;
        setDisplayedScreen(screen);
      }, commitDelayMs);
      return;
    }
    setDisplayedScreen(screen);
  }, []);

  const applyFlowAction = React.useCallback((action: TelegramVerifyFlowAction) => {
    const previousState = flowStateRef.current;
    const nextState = telegramVerifyReducer(previousState, action);
    flowStateRef.current = nextState;
    dispatchFlowState(action);
    if (nextState.screen !== previousState.screen) {
      commitScreen(nextState.screen);
    }
    return nextState;
  }, [commitScreen]);

  const resolvedCommunityId = flowState.exchangeCommunityId ?? communityId;

  const refetchEligibility = React.useCallback(async () => {
    const targetCommunityId = flowStateRef.current.exchangeCommunityId ?? communityId;
    const nextEligibility = await api.communities.getJoinEligibility(targetCommunityId);
    applyFlowAction({ eligibility: nextEligibility, type: "eligibilityUpdated" });
    return nextEligibility;
  }, [api, applyFlowAction, communityId]);

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
    eligibility: flowState.eligibility,
    locale,
    onJoined: () => {
      void refetchEligibility().catch(() => null);
      applyFlowAction({ result: "joined", type: "done" });
    },
    refetchEligibility,
  });

  const joinVerifiedCommunity = React.useCallback(async (): Promise<TelegramVerifyJoinResult> => {
    const targetCommunityId = flowStateRef.current.exchangeCommunityId ?? communityId;
    const result = await api.communities.join(targetCommunityId);
    const nextEligibility = await api.communities.getJoinEligibility(targetCommunityId).catch(() => null);
    if (nextEligibility) {
      applyFlowAction({ eligibility: nextEligibility, type: "eligibilityUpdated" });
    }
    if (result.status === "requested") {
      return "requested";
    }
    if (result.status === "joined" || nextEligibility?.status === "already_joined") {
      return "joined";
    }
    return "blocked";
  }, [api, applyFlowAction, communityId]);

  const runAutoAction = React.useCallback(async (
    nextEligibility: ApiJoinEligibility,
    options: {
      allowJoinAfterVerification?: boolean;
      selectedProvider?: HumanVerificationProvider;
    } = {},
  ) => {
    const state = flowStateRef.current;
    const targetCommunityId = state.exchangeCommunityId ?? communityId;
    recordDebug("auto-action:start", {
      allowJoinAfterVerification: Boolean(options.allowJoinAfterVerification),
      eligibility: nextEligibility.status,
      joinableNow: Boolean(nextEligibility.joinable_now),
      provider: nextEligibility.suggested_verification_provider ?? null,
    });

    const treatAlreadyJoinedAsFlowSuccess = nextEligibility.status === "already_joined" && (
      state.joinedInThisFlow
      || state.launchedVerification
      || state.startedInThisBrowser
    );
    const terminalMessage = telegramVerifyTerminalMessage(nextEligibility, locale, {
      joinedInThisFlow: state.joinedInThisFlow || treatAlreadyJoinedAsFlowSuccess,
    });

    if (terminalMessage) {
      if (nextEligibility.status === "already_joined") {
        applyFlowAction({
          result: treatAlreadyJoinedAsFlowSuccess ? "joined" : "already_member",
          type: "done",
        });
      } else if (nextEligibility.status === "pending_request") {
        applyFlowAction({ result: "pending_request", type: "done" });
      } else {
        applyFlowAction({
          canRetry: Boolean(flowStateRef.current.eligibility),
          message: terminalMessage,
          type: "blocked",
        });
      }
      recordDebug("auto-action:terminal", { eligibility: nextEligibility.status, message: terminalMessage });
      return;
    }

    if (isJoinableEligibility(nextEligibility)) {
      if (flowStateRef.current.launchedVerification && !options.allowJoinAfterVerification) {
        recordDebug("auto-action:join-suppressed-after-launch");
        return;
      }
      applyFlowAction({ type: "joining" });
      try {
        const result = await joinVerifiedCommunity();
        recordDebug("join:result", { result });
        if (result === "joined") {
          applyFlowAction({ result: "joined", type: "done" });
        } else if (result === "requested") {
          applyFlowAction({ result: "pending_request", type: "done" });
        } else {
          applyFlowAction({
            canRetry: true,
            message: "More verification is required.",
            type: "blocked",
          });
        }
      } catch (error) {
        applyFlowAction({
          canRetry: true,
          message: getErrorMessage(error, "Could not join this community."),
          type: "error",
        });
        recordDebug("join:error", { message: getErrorMessage(error, "Could not join this community.") });
      }
      return;
    }

    if (nextEligibility.status !== "verification_required") {
      applyFlowAction({
        canRetry: Boolean(flowStateRef.current.eligibility),
        message: terminalMessage ?? "This account is not eligible to join yet.",
        type: "blocked",
      });
      recordDebug("auto-action:blocked", { eligibility: nextEligibility.status });
      return;
    }

    if (hasOnlyTelegramJoinAltchaRequirement(nextEligibility)) {
      applyFlowAction({ type: "checking" });
      recordDebug("altcha:start", { communityId: targetCommunityId });
      try {
        const payload = await solveAltchaChallengeHeadless({
          action: `community:${nextEligibility.community ?? targetCommunityId}`,
          loadChallenge: api.verification.createAltchaChallenge,
          scope: "community_join",
        });
        const result = await api.communities.join(targetCommunityId, undefined, { altchaPayload: payload });
        const refreshedEligibility = await refetchEligibility();
        recordDebug("altcha:result", {
          eligibility: refreshedEligibility.status,
          result: result.status,
        });
        if (result.status === "requested" || refreshedEligibility.status === "pending_request") {
          applyFlowAction({ result: "pending_request", type: "done" });
        } else if (result.status === "joined" || refreshedEligibility.status === "already_joined") {
          applyFlowAction({ result: "joined", type: "done" });
        } else {
          applyFlowAction({
            canRetry: true,
            message: "More verification is required.",
            type: "blocked",
          });
        }
      } catch (error) {
        applyFlowAction({
          canRetry: true,
          message: getErrorMessage(error, "Browser anti-bot check failed."),
          type: "error",
        });
        recordDebug("altcha:error", { message: getErrorMessage(error, "Browser anti-bot check failed.") });
      }
      return;
    }

    const availableProviders = resolveAvailableHumanVerificationProviders(nextEligibility);
    if (availableProviders.length > 1 && !options.selectedProvider) {
      applyFlowAction({ providers: availableProviders, type: "choosingProviders" });
      recordDebug("verification-provider:choices", { providers: availableProviders });
      return;
    }
    if (options.selectedProvider && !availableProviders.includes(options.selectedProvider)) {
      applyFlowAction({
        canRetry: true,
        message: "That verification provider is not accepted for this community requirement.",
        type: "blocked",
      });
      return;
    }
    const provider = options.selectedProvider ?? resolveSuggestedVerificationProvider(nextEligibility);
    recordDebug("verification-provider:selected", { provider });
    if (!provider) {
      applyFlowAction({
        canRetry: true,
        message: "No supported verification provider is available for this community requirement.",
        type: "blocked",
      });
      return;
    }
    if (provider === "passport") {
      await handleJoin();
      return;
    }

    const launchProvider: TelegramVerifyLaunchProvider = provider === "zkpassport" || provider === "very"
      ? provider
      : "self";
    writeTelegramVerifyFlowStarted(targetCommunityId);
    applyFlowAction({ provider: launchProvider, type: "preparing" });

    if (provider === "zkpassport") {
      recordDebug("zkpassport:start");
      const result = await launchTelegramZkPassportVerification({
        eligibility: nextEligibility,
        startVerification: startZkPassportVerification,
      });
      recordDebug("zkpassport:result", {
        hasHref: Boolean(result.href),
        started: result.started,
        error: result.error ?? null,
      });
      if (result.started && result.href) {
        applyFlowAction({
          href: result.href,
          message: telegramVerifyReadyMessage("zkpassport"),
          provider: "zkpassport",
          type: "ready",
        });
      } else {
        applyFlowAction({
          canRetry: true,
          message: result.error ?? "Could not start ZKPassport verification.",
          type: "error",
        });
      }
      return;
    }

    if (provider === "very") {
      recordDebug("very:start");
      const result = await startVeryVerification();
      recordDebug("very:result", { started: result.started });
      if (result.started) {
        applyFlowAction({ type: "checking" });
      } else {
        applyFlowAction({
          canRetry: true,
          message: "Could not start verification.",
          type: "error",
        });
      }
      return;
    }

    recordDebug("self:start", { communityId: targetCommunityId });
    const result = await launchTelegramSelfVerification({
      callbackBaseHref: buildTelegramSelfReturnHref(targetCommunityId),
      eligibility: nextEligibility,
      startVerification: startSelfVerification,
    });
    recordDebug("self:result", {
      error: result.error ?? null,
      hasHref: Boolean(result.href),
      hrefLength: result.href?.length ?? 0,
      openedModal: Boolean(result.openedModal),
      started: result.started,
    });
    if (!result.started || !result.href) {
      applyFlowAction({
        canRetry: true,
        message: result.error ?? "Could not start Self verification.",
        type: "error",
      });
      return;
    }
    applyFlowAction({
      href: result.href,
      message: telegramVerifySelfReadyMessage(nextEligibility, locale),
      provider: "self",
      type: "ready",
    });
  }, [
    applyFlowAction,
    api.communities,
    api.verification.createAltchaChallenge,
    communityId,
    handleJoin,
    joinVerifiedCommunity,
    locale,
    recordDebug,
    refetchEligibility,
    startSelfVerification,
    startVeryVerification,
    startZkPassportVerification,
  ]);
  const runAutoActionRef = React.useRef(runAutoAction);
  React.useEffect(() => {
    runAutoActionRef.current = runAutoAction;
  }, [runAutoAction]);

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
      applyFlowAction({
        canRetry: false,
        message: "Open this verification link from Telegram.",
        type: "error",
      });
      recordDebug("init-data-missing");
      return;
    }

    const controller = new AbortController();
    refreshAfterReturnInFlightRef.current = false;
    if (pendingScreenCommitRef.current !== null) {
      window.clearTimeout(pendingScreenCommitRef.current);
      pendingScreenCommitRef.current = null;
    }
    setDisplayedScreen({ kind: "idle" });
    applyFlowAction({
      startedInThisBrowser: readTelegramVerifyFlowStarted(communityId),
      type: "bootStarted",
    });
    recordDebug("auto-exchange:start", { communityId });
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
        applyFlowAction({
          communityId: exchange.community,
          eligibility: exchange.eligibility,
          type: "exchangeResolved",
        });
        recordDebug("auto-exchange:success", {
          community: exchange.community,
          eligibility: exchange.eligibility.status,
          provider: exchange.eligibility.suggested_verification_provider ?? null,
        });
        await runAutoActionRef.current(exchange.eligibility);
      })
      .catch((error) => {
        if (controller.signal.aborted) return;
        applyFlowAction({
          canRetry: false,
          message: getErrorMessage(error, "Could not verify Telegram identity."),
          type: "error",
        });
        recordDebug("auto-exchange:error", { message: getErrorMessage(error, "Could not verify Telegram identity.") });
      });

    return () => controller.abort();
  }, [applyFlowAction, communityId, recordDebug]);

  React.useEffect(() => {
    const error = joinError ?? selfError ?? zkPassportError;
    if (!error) {
      return;
    }
    applyFlowAction({
      canRetry: Boolean(flowStateRef.current.eligibility),
      message: error,
      type: "error",
    });
  }, [applyFlowAction, joinError, selfError, zkPassportError]);

  React.useEffect(() => {
    if (joinRequested) {
      applyFlowAction({ result: "pending_request", type: "done" });
    }
  }, [applyFlowAction, joinRequested]);

  React.useEffect(() => {
    const screen = flowState.screen;
    if (screen.kind !== "preparing") {
      return;
    }
    const timeoutId = window.setTimeout(() => {
      recordDebug("launching:watchdog-timeout", { provider: screen.provider });
      applyFlowAction({
        canRetry: true,
        message: screen.provider === "self"
        ? "Self verification did not finish preparing. Try again; if it repeats, open this page with ?debug=1."
        : "Verification did not finish preparing. Try again; if it repeats, open this page with ?debug=1.",
        type: "error",
      });
    }, TELEGRAM_VERIFY_LAUNCH_WATCHDOG_MS);
    return () => window.clearTimeout(timeoutId);
  }, [applyFlowAction, flowState.screen, recordDebug]);

  const providerBusy = selfLoading || veryLoading || zkPassportLoading;
  const providerBusyRef = React.useRef(providerBusy);
  React.useEffect(() => {
    providerBusyRef.current = providerBusy;
  }, [providerBusy]);

  const refreshVerificationStatus = React.useCallback(async (options: { showCheckingMessage?: boolean } = {}) => {
    const exchangeCommunityId = flowStateRef.current.exchangeCommunityId;
    if (!exchangeCommunityId || refreshAfterReturnInFlightRef.current) {
      return;
    }
    refreshAfterReturnInFlightRef.current = true;
    if (options.showCheckingMessage) {
      applyFlowAction({ type: "checking" });
    }
    try {
      const nextEligibility = await refetchEligibility();
      if (providerBusyRef.current) {
        return;
      }
      if (nextEligibility.status === "verification_required") {
        const currentScreen = flowStateRef.current.screen;
        if (currentScreen.kind === "ready" && currentScreen.provider === "self") {
          applyFlowAction({
            href: currentScreen.href,
            message: telegramVerifySelfReadyMessage(nextEligibility, locale),
            provider: "self",
            type: "ready",
          });
        }
        return;
      }
      await runAutoAction(nextEligibility, { allowJoinAfterVerification: true });
    } catch (error) {
      applyFlowAction({
        canRetry: true,
        message: getErrorMessage(error, "Could not check verification."),
        type: "error",
      });
    } finally {
      refreshAfterReturnInFlightRef.current = false;
    }
  }, [applyFlowAction, locale, refetchEligibility, runAutoAction]);

  React.useEffect(() => {
    if (flowState.screen.kind !== "external_started" || !flowState.exchangeCommunityId) {
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
  }, [flowState.exchangeCommunityId, flowState.screen.kind, refreshVerificationStatus]);

  const screen = displayedScreen;
  const pendingLaunch = screen.kind === "ready"
    ? { href: screen.href, provider: screen.provider }
    : null;

  return (
    <TelegramMiniAppVerifyView
      debugEvents={debugEnabled ? debugEvents : undefined}
      onOpenBoard={() => navigate(`/tg/c/${encodeURIComponent(resolvedCommunityId)}`)}
      onChooseProvider={(provider) => {
        const currentEligibility = flowStateRef.current.eligibility;
        if (!currentEligibility) return;
        void runAutoAction(currentEligibility, { selectedProvider: provider });
      }}
      onOpenPendingLaunch={() => {
        if (!pendingLaunch) {
          return;
        }
        writeTelegramVerifyFlowStarted(resolvedCommunityId);
        applyFlowAction({ type: "externalOpened" });
        openExternalHref(pendingLaunch.href, { preferBrowserWindow: pendingLaunch.provider === "self" });
      }}
      onRetry={() => {
        const currentEligibility = flowStateRef.current.eligibility;
        if (!currentEligibility) {
          return;
        }
        applyFlowAction({ type: "retry" });
        void runAutoAction(currentEligibility);
      }}
      providerBusy={joinLoading || selfLoading || veryLoading || zkPassportLoading}
      screen={screen}
      ShellComponent={TelegramMiniAppShell}
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

function useTelegramMiniAppSessionExchange(
  communityId: string,
  context: "default" | "study" = "default",
): TelegramMiniAppSessionExchangeState {
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
      body: JSON.stringify({
        community_id: communityId,
        context,
        init_data: initData,
      }),
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
  }, [communityId, context]);

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
          buildPostPath={buildTelegramCommunityPostPath}
          communityId={communityId}
          disableCanonicalRouteReplace
        />
      </div>
    </TelegramMiniAppShell>
  );
}

export function buildTelegramCommunityPostPath(postId: string): string {
  return `/tg/p/${encodeURIComponent(postId)}`;
}

export function TelegramMiniAppPostPage({
  postId,
}: {
  postId: string;
}) {
  const api = useApi();
  const [communityState, setCommunityState] = React.useState<
    { kind: "loading" } | { kind: "ready"; communityId: string } | { kind: "error"; message: string }
  >({ kind: "loading" });

  React.useEffect(() => {
    const controller = new AbortController();
    setCommunityState({ kind: "loading" });
    void loadTelegramPostCommunityId(api.publicPosts, postId)
      .then((communityId) => {
        if (controller.signal.aborted) return;
        setCommunityState({ kind: "ready", communityId });
      })
      .catch((error: unknown) => {
        if (controller.signal.aborted) return;
        setCommunityState({
          kind: "error",
          message: getErrorMessage(error, "Could not open this post."),
        });
      });
    return () => controller.abort();
  }, [api.publicPosts, postId]);

  if (communityState.kind === "loading") {
    return (
      <TelegramMiniAppShell backPath="/tg" showBackButton>
        <div className="flex min-h-[70svh] items-center justify-center px-4">
          <Spinner className="size-9 text-muted-foreground" />
        </div>
      </TelegramMiniAppShell>
    );
  }
  if (communityState.kind === "error") {
    return (
      <TelegramMiniAppShell backPath="/tg" showBackButton>
        <div className="px-4 py-6 text-center">
          <Type as="h1" variant="h2">Could not open this post</Type>
          <Type as="p" className="mt-3 text-muted-foreground" variant="body">
            {communityState.message}
          </Type>
        </div>
      </TelegramMiniAppShell>
    );
  }
  return (
    <TelegramMiniAppPostWithSession
      communityId={communityState.communityId}
      postId={postId}
    />
  );
}

export async function loadTelegramPostCommunityId(
  publicPosts: { get: (postId: string) => Promise<{ post: { community: string } }> },
  postId: string,
): Promise<string> {
  const post = await publicPosts.get(postId);
  return post.post.community;
}

function TelegramMiniAppPostWithSession({
  communityId,
  postId,
}: {
  communityId: string;
  postId: string;
}) {
  const sessionExchange = useTelegramMiniAppSessionExchange(communityId);
  if (sessionExchange.kind === "checking") {
    return (
      <TelegramMiniAppShell backPath={`/tg/c/${encodeURIComponent(communityId)}`} showBackButton>
        <div className="flex min-h-[70svh] items-center justify-center px-4">
          <Spinner className="size-9 text-muted-foreground" />
        </div>
      </TelegramMiniAppShell>
    );
  }
  if (sessionExchange.kind === "error") {
    return (
      <TelegramMiniAppShell backPath={`/tg/c/${encodeURIComponent(communityId)}`} showBackButton>
        <div className="px-4 py-6 text-center">
          <Type as="h1" variant="h2">Could not verify Telegram</Type>
          <Type as="p" className="mt-3 text-muted-foreground" variant="body">
            {sessionExchange.message}
          </Type>
        </div>
      </TelegramMiniAppShell>
    );
  }
  return (
    <TelegramMiniAppShell backPath={`/tg/c/${encodeURIComponent(communityId)}`} showBackButton>
      <PostPage postId={postId} telegramMiniApp />
    </TelegramMiniAppShell>
  );
}

export function TelegramMiniAppStudyPage({
  communityId,
  postId,
}: {
  communityId: string;
  postId: string;
}) {
  const sessionExchange = useTelegramMiniAppSessionExchange(communityId, "study");
  const communityPath = `/tg/c/${encodeURIComponent(communityId)}`;

  if (sessionExchange.kind === "checking") {
    return (
      <TelegramMiniAppShell backPath={communityPath} showBackButton>
        <div className="flex min-h-[70svh] items-center justify-center px-4">
          <Spinner className="size-9 text-muted-foreground" />
        </div>
      </TelegramMiniAppShell>
    );
  }

  if (sessionExchange.kind === "error") {
    return (
      <TelegramMiniAppShell backPath={communityPath} showBackButton>
        <div className="px-4 py-6">
          <PageContainer size="narrow">
            <section className="flex min-h-[70svh] flex-col justify-center gap-6 text-center">
              <div className="space-y-3">
                <Type as="h1" variant="h2">Could not open study</Type>
                <Type as="p" className="text-muted-foreground" variant="body">
                  {sessionExchange.message}
                </Type>
              </div>
              <Button onClick={() => navigate(communityPath)} variant="secondary">
                Open community
              </Button>
            </section>
          </PageContainer>
        </div>
      </TelegramMiniAppShell>
    );
  }

  return (
    <TelegramMiniAppShell backPath={communityPath} showBackButton>
      <TelegramAccountLinkOffer communityId={communityId} />
      <StudyRoutePage
        postId={postId}
        returnPath={communityPath}
        telegramMiniApp
      />
    </TelegramMiniAppShell>
  );
}

function TelegramAccountLinkOffer({ communityId }: { communityId: string }) {
  const api = useApi();
  const [state, setState] = React.useState<
    { kind: "idle" } | { kind: "opening" } | { kind: "opened" } | { kind: "error"; message: string }
  >({ kind: "idle" });

  const openLink = React.useCallback(() => {
    if (state.kind === "opening") return;
    setState({ kind: "opening" });
    void api.users.createTelegramAccountLinkIntent(communityId)
      .then(({ link_url: linkUrl }) => {
        setState({ kind: "opened" });
        openExternalHref(linkUrl);
      })
      .catch((error: unknown) => {
        setState({
          kind: "error",
          message: getErrorMessage(error, "Could not start account linking."),
        });
      });
  }, [api.users, communityId, state.kind]);

  return (
    <div className="px-4 pt-4">
      <PageContainer size="narrow">
        <section className="rounded-[var(--radius-xl)] border border-border bg-muted/40 p-4">
          <Type as="h2" variant="h4">Already use Pirate on the web?</Type>
          <Type as="p" className="mt-1 text-muted-foreground" variant="caption">
            Link before studying to keep one streak and review history.
          </Type>
          <Button
            className="mt-3 w-full"
            disabled={state.kind === "opening" || state.kind === "opened"}
            onClick={openLink}
            size="sm"
            variant="secondary"
          >
            {state.kind === "opening"
              ? "Opening…"
              : state.kind === "opened"
                ? "Finish linking in your browser"
                : "Link existing Pirate account"}
          </Button>
          {state.kind === "error" ? (
            <Type as="p" className="mt-2 text-destructive" variant="caption">
              {state.message}
            </Type>
          ) : null}
        </section>
      </PageContainer>
    </div>
  );
}
