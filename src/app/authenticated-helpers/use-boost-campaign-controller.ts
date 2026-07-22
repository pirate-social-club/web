"use client";

import * as React from "react";
import type {
  RewardCampaign,
  RewardCampaignCapabilities,
  RewardCampaignFundingQuote,
} from "@pirate/api-contracts";

import type { BoostCampaignSheetProps, BoostEligibleActivity } from "@/components/compositions/rewards/reward-booster-surfaces";
import { usePiratePrivyWallets } from "@/components/auth/privy-provider";
import { useApi } from "@/lib/api";
import { ApiError, isApiNotFoundError } from "@/lib/api/client";
import {
  executeUsdcTransfer,
  findConnectedFundingWallet,
  resolveRewardFundingTransferInput,
} from "@/lib/commerce/routed-checkout";
import { formatUsdLabel } from "@/lib/formatting/currency";
import { getErrorMessage } from "@/lib/error-utils";
import { getPirateNetworkConfig } from "@/lib/network-config";
import {
  boostPlanProblemLabel,
  boostRewardCountLabel,
  resolveDailyAccrualPlan,
} from "@/lib/rewards/boost-plan";

const SCORE_THRESHOLD_BPS = 7_000;
const CAMPAIGN_STORAGE_PREFIX = "pirate_reward_campaign:";
const PENDING_FUNDING_STORAGE_PREFIX = "pirate_reward_pending_funding:";
const TERMINAL_FUNDING_STORAGE_PREFIX = "pirate_reward_terminal_funding:";
const CREATE_KEY_STORAGE_PREFIX = "pirate_reward_create_key:";
const QUOTE_KEY_STORAGE_PREFIX = "pirate_reward_quote_key:";

const TERMINAL_FUNDING_CODES = new Set([
  "funding_refund_pending",
  "funding_quote_expired",
  "funding_confirmed_after_quote_expiry",
  "funding_quote_already_claimed",
  "one_live",
  "conflict",
  "funding_transaction_already_consumed",
  "funding_transaction_mismatch",
]);

interface PendingFunding {
  campaignId: string;
  quote: RewardCampaignFundingQuote;
  transactionHash: string | null;
}

interface TerminalFunding {
  campaignId: string;
  code: string;
  message: string;
  quoteId: string;
  transactionHash: string;
}

function idempotencyKey(prefix: string): string {
  return `${prefix}_${globalThis.crypto?.randomUUID?.() ?? `${Date.now()}_${Math.random().toString(16).slice(2)}`}`;
}

function shortAddress(value: string): string {
  return value.length > 14 ? `${value.slice(0, 8)}…${value.slice(-6)}` : value;
}

function chainLabel(chainId: number): string {
  if (chainId === 8453) return "Base";
  if (chainId === 84532) return "Base Sepolia";
  return `chain ${chainId}`;
}

function campaignStorageKey(communityId: string, postId: string): string {
  return `${CAMPAIGN_STORAGE_PREFIX}${communityId}:${postId}`;
}

function pendingFundingStorageKey(communityId: string, postId: string): string {
  return `${PENDING_FUNDING_STORAGE_PREFIX}${communityId}:${postId}`;
}

function terminalFundingStorageKey(communityId: string, postId: string): string {
  return `${TERMINAL_FUNDING_STORAGE_PREFIX}${communityId}:${postId}`;
}

function requestKey(storageKey: string, prefix: string): string {
  const existing = globalThis.localStorage?.getItem(storageKey);
  if (existing) return existing;
  const created = idempotencyKey(prefix);
  globalThis.localStorage?.setItem(storageKey, created);
  return created;
}

function createRequestStorageKey(communityId: string, postId: string): string {
  return `${CREATE_KEY_STORAGE_PREFIX}${communityId}:${postId}`;
}

function quoteRequestStorageKey(campaignId: string): string {
  return `${QUOTE_KEY_STORAGE_PREFIX}${campaignId}`;
}

function readTerminalFunding(communityId: string, postId: string): TerminalFunding | null {
  try {
    const value = globalThis.localStorage?.getItem(terminalFundingStorageKey(communityId, postId));
    return value ? JSON.parse(value) as TerminalFunding : null;
  } catch {
    return null;
  }
}

function readPendingFunding(communityId: string, postId: string): PendingFunding | null {
  try {
    const value = globalThis.localStorage?.getItem(pendingFundingStorageKey(communityId, postId));
    return value ? JSON.parse(value) as PendingFunding : null;
  } catch {
    return null;
  }
}

function writePendingFunding(communityId: string, postId: string, pending: PendingFunding): void {
  globalThis.localStorage?.setItem(pendingFundingStorageKey(communityId, postId), JSON.stringify(pending));
}

function terminalFundingMessage(code: string): string {
  if (code === "funding_refund_pending") {
    return "Funds were received, but the campaign was not activated. A refund is pending; do not send again.";
  }
  if (code === "funding_refunded" || code === "funding_quote_already_claimed") {
    return "Funding was refunded or already entered refund handling. The campaign was not activated.";
  }
  if (code === "funding_transaction_already_consumed" || code === "funding_transaction_mismatch") {
    return "This transaction could not fund this campaign. Support review is required; do not send again.";
  }
  return "Funds were received, but the campaign was not activated. Refund or support review is required; do not send again.";
}

function blocksNewCampaign(campaign: RewardCampaign | null): boolean {
  return campaign != null && ["scheduled", "active", "paused", "operational_hold"].includes(campaign.status);
}

export interface BoostCampaignControllerInput {
  activePublicOffer: boolean;
  authenticated: boolean;
  communityId: string | null;
  postId: string;
  requestAuth: () => void;
  song: boolean;
  viewerIsAuthor: boolean;
}

export function useBoostCampaignController(input: BoostCampaignControllerInput) {
  const api = useApi();
  const { connectedWallets } = usePiratePrivyWallets({ enabled: input.authenticated && input.song });
  const [capabilities, setCapabilities] = React.useState<RewardCampaignCapabilities | null>(null);
  const [policyAllowed, setPolicyAllowed] = React.useState(true);
  const [campaign, setCampaign] = React.useState<RewardCampaign | null>(null);
  const [quote, setQuote] = React.useState<RewardCampaignFundingQuote | null>(null);
  const [transactionHash, setTransactionHash] = React.useState<string | null>(null);
  const [supportReference, setSupportReference] = React.useState<string | undefined>();
  const [sheetOpen, setSheetOpen] = React.useState(false);
  const [policyOpen, setPolicyOpen] = React.useState(false);
  const [sheetState, setSheetState] = React.useState<BoostCampaignSheetProps["state"]>("compose");
  const [eligibleActivity, setEligibleActivity] = React.useState<BoostEligibleActivity>("karaoke");
  const [dailyRewardInput, setDailyRewardInput] = React.useState("1.00");
  const [budgetInput, setBudgetInput] = React.useState("10.00");
  const [busy, setBusy] = React.useState(false);
  const [errorMessage, setErrorMessage] = React.useState<string | undefined>();
  const [policyError, setPolicyError] = React.useState<string | undefined>();
  const [nowSeconds, setNowSeconds] = React.useState(() => Math.floor(Date.now() / 1_000));
  const createQuoteInFlight = React.useRef(false);
  const sendFundingInFlight = React.useRef(false);

  React.useEffect(() => {
    if (!input.authenticated || !input.song || !input.communityId) {
      setCapabilities(null);
      setCampaign(null);
      return;
    }
    let cancelled = false;
    const pending = readPendingFunding(input.communityId, input.postId);
    const terminal = readTerminalFunding(input.communityId, input.postId);
    const storedCampaignId = terminal?.campaignId ?? pending?.campaignId
      ?? globalThis.localStorage?.getItem(campaignStorageKey(input.communityId, input.postId));
    void Promise.all([
      api.rewards.getCampaignCapabilities(input.postId),
      api.rewards.getSongOwnerPolicy(input.communityId, input.postId).catch((error: unknown) => {
        if (isApiNotFoundError(error)) return null;
        throw error;
      }),
      storedCampaignId ? api.rewards.getCampaign(storedCampaignId).catch(() => null) : Promise.resolve(null),
    ]).then(([nextCapabilities, policy, storedCampaign]) => {
      if (cancelled) return;
      setCapabilities(nextCapabilities);
      setPolicyAllowed(policy?.third_party_rewards !== "blocked");
      setCampaign(storedCampaign);
      if (terminal && storedCampaign?.id === terminal.campaignId) {
        setTransactionHash(terminal.transactionHash);
        setSupportReference(terminal.quoteId);
        setErrorMessage(terminal.message);
        setSheetState("funding-review");
      } else if (pending && storedCampaign?.id === pending.campaignId) {
        setQuote(pending.quote);
        setTransactionHash(pending.transactionHash);
        if (pending.transactionHash) {
          setErrorMessage(undefined);
          setSheetState("confirming");
        } else {
          setSheetState(pending.quote.expires_at <= Math.floor(Date.now() / 1_000) ? "expired" : "quote");
        }
      }
    }).catch(() => {
      if (!cancelled) setCapabilities(null);
    });
    return () => { cancelled = true; };
  }, [api.rewards, input.authenticated, input.communityId, input.postId, input.song]);

  React.useEffect(() => {
    if (!sheetOpen || sheetState !== "quote" || !quote) return;
    setNowSeconds(Math.floor(Date.now() / 1_000));
    const timer = window.setInterval(() => setNowSeconds(Math.floor(Date.now() / 1_000)), 1_000);
    return () => window.clearInterval(timer);
  }, [quote, sheetOpen, sheetState]);

  const limits = React.useMemo(() => capabilities ? {
    maxBudgetCents: capabilities.max_budget_cents,
    maxRewardCents: capabilities.max_reward_cents,
    minBudgetCents: capabilities.min_budget_cents,
  } : null, [capabilities]);
  const plan = React.useMemo(
    () => limits ? resolveDailyAccrualPlan(dailyRewardInput, budgetInput, limits) : null,
    [budgetInput, dailyRewardInput, limits],
  );
  const fundingWallet = quote ? findConnectedFundingWallet({
    connectedWallets,
    primaryWalletAddress: quote.sender_address,
  }) : null;
  const walletMismatch = Boolean(quote && !fundingWallet);

  const createQuote = React.useCallback(async (existingCampaign?: RewardCampaign | null) => {
    if (createQuoteInFlight.current || !input.communityId || !capabilities || !plan?.valid || plan.budgetCents == null || plan.dailyRewardCents == null) return;
    createQuoteInFlight.current = true;
    setBusy(true);
    setErrorMessage(undefined);
    setSheetState("preparing");
    try {
      const now = Math.floor(Date.now() / 1_000);
      const createKeyStorage = createRequestStorageKey(input.communityId, input.postId);
      const targetCampaign = existingCampaign ?? await api.rewards.createCampaign({
        budget_cents: plan.budgetCents,
        community: input.communityId,
        daily_reward_cents: plan.dailyRewardCents,
        eligible_activity: eligibleActivity,
        ends_at: now + capabilities.default_duration_seconds,
        idempotency_key: requestKey(createKeyStorage, "reward_campaign"),
        milestone_7_cents: 0,
        milestone_30_cents: 0,
        min_score_bps: SCORE_THRESHOLD_BPS,
        post: input.postId,
        reward_period_cap_cents: plan.dailyRewardCents,
        starts_at: now,
      });
      globalThis.localStorage?.removeItem(createKeyStorage);
      setCampaign(targetCampaign);
      globalThis.localStorage?.setItem(campaignStorageKey(input.communityId, input.postId), targetCampaign.id);
      const quoteKeyStorage = quoteRequestStorageKey(targetCampaign.id);
      const nextQuote = await api.rewards.createFundingQuote(targetCampaign.id, {
        amount_cents: targetCampaign.budget_cents,
        idempotency_key: requestKey(quoteKeyStorage, "reward_quote"),
      });
      globalThis.localStorage?.removeItem(quoteKeyStorage);
      setQuote(nextQuote);
      setTransactionHash(nextQuote.tx_hash ?? null);
      writePendingFunding(input.communityId, input.postId, {
        campaignId: targetCampaign.id,
        quote: nextQuote,
        transactionHash: nextQuote.tx_hash ?? null,
      });
      setSheetState("quote");
    } catch (error) {
      setErrorMessage(getErrorMessage(error, "Could not prepare reward funding."));
      setSheetState("failed");
    } finally {
      createQuoteInFlight.current = false;
      setBusy(false);
    }
  }, [api.rewards, capabilities, eligibleActivity, input.communityId, input.postId, plan]);

  React.useEffect(() => {
    if (
      !sheetOpen
      || sheetState !== "quote"
      || !quote
      || !campaign
      || transactionHash
      || quote.expires_at > nowSeconds
    ) return;
    void createQuote(campaign);
  }, [campaign, createQuote, nowSeconds, quote, sheetOpen, sheetState, transactionHash]);

  const pollCampaign = React.useCallback(async (campaignId: string) => {
    for (let attempt = 0; attempt < 20; attempt += 1) {
      const nextCampaign = await api.rewards.getCampaign(campaignId);
      setCampaign(nextCampaign);
      if (["scheduled", "active"].includes(nextCampaign.status)) {
        setSheetState("active");
        return;
      }
      if (["canceled", "exhausted", "ended"].includes(nextCampaign.status)) {
        throw new Error(`Campaign entered ${nextCampaign.status} before activation.`);
      }
      await new Promise((resolve) => window.setTimeout(resolve, 1_500));
    }
    throw new Error("Funding was submitted, but campaign activation is still pending. Check status again shortly.");
  }, [api.rewards]);

  const confirmSubmittedFunding = React.useCallback(async (
    targetCampaign: RewardCampaign,
    targetQuote: RewardCampaignFundingQuote,
    hash: string,
  ) => {
    setBusy(true);
    setErrorMessage(undefined);
    setSheetState("confirming");
    try {
      const funding = await api.rewards.confirmFundingQuote(targetCampaign.id, targetQuote.id, { tx_hash: hash });
      // Keep this string check compatible with the currently pinned API contract while
      // the release pin advances to the API version that adds refund_pending.
      if ((funding.status as string) === "refund_pending") {
        throw new ApiError("funding_refund_pending", "Funding reached the treasury and is awaiting refund.", 409);
      }
      if (funding.status === "refunded") {
        throw new ApiError("funding_refunded", "Funding was refunded and the campaign was not activated.", 409);
      }
      if (funding.status === "confirming") {
        setSheetState("confirming");
        return;
      }
      await pollCampaign(targetCampaign.id);
      if (input.communityId) {
        globalThis.localStorage?.removeItem(pendingFundingStorageKey(input.communityId, input.postId));
      }
    } catch (error) {
      const code = error instanceof ApiError ? error.code : "";
      if ((TERMINAL_FUNDING_CODES.has(code) || code === "funding_refunded") && input.communityId) {
        const message = terminalFundingMessage(code);
        const terminal: TerminalFunding = {
          campaignId: targetCampaign.id,
          code,
          message,
          quoteId: error instanceof ApiError && error.requestId
            ? `${targetQuote.id} / ${error.requestId}`
            : targetQuote.id,
          transactionHash: hash,
        };
        globalThis.localStorage?.removeItem(pendingFundingStorageKey(input.communityId, input.postId));
        globalThis.localStorage?.setItem(terminalFundingStorageKey(input.communityId, input.postId), JSON.stringify(terminal));
        setSupportReference(terminal.quoteId);
        setErrorMessage(message);
        setSheetState("funding-review");
        return;
      }
      setErrorMessage(getErrorMessage(error, "The transfer was submitted and remains pending. Do not send again."));
      setSheetState("confirming");
    } finally {
      setBusy(false);
    }
  }, [api.rewards, input.communityId, input.postId, pollCampaign]);

  const sendFunding = React.useCallback(async () => {
    if (sendFundingInFlight.current || !quote || !campaign || !fundingWallet) {
      return;
    }
    if (quote.expires_at <= Math.floor(Date.now() / 1_000)) {
      void createQuote(campaign);
      return;
    }
    sendFundingInFlight.current = true;
    setBusy(true);
    setErrorMessage(undefined);
    setSheetState("confirming");
    try {
      const hash = await executeUsdcTransfer({
        transfer: resolveRewardFundingTransferInput(quote),
        wallet: fundingWallet,
        onSubmitted: (submittedHash) => {
          setTransactionHash(submittedHash);
          if (input.communityId) {
            writePendingFunding(input.communityId, input.postId, {
              campaignId: campaign.id,
              quote,
              transactionHash: submittedHash,
            });
          }
        },
      });
      await confirmSubmittedFunding(campaign, quote, hash);
    } catch (error) {
      setErrorMessage(getErrorMessage(error, "Could not submit reward funding."));
      setSheetState("failed");
    } finally {
      sendFundingInFlight.current = false;
      setBusy(false);
    }
  }, [campaign, confirmSubmittedFunding, createQuote, fundingWallet, input.communityId, input.postId, quote]);

  const hasCampaignConflict = input.activePublicOffer || blocksNewCampaign(campaign);
  const thirdPartyBlocked = !input.viewerIsAuthor && !policyAllowed;
  const activityUnavailable = Boolean(capabilities && !capabilities.eligible_activities.includes(eligibleActivity));

  const handleConfirm = React.useCallback(() => {
    if (busy || hasCampaignConflict || thirdPartyBlocked || activityUnavailable) return;
    if (sheetState === "compose") void createQuote(campaign?.status === "draft" ? campaign : null);
    if (sheetState === "quote") void sendFunding();
  }, [activityUnavailable, busy, campaign, createQuote, hasCampaignConflict, sendFunding, sheetState, thirdPartyBlocked]);

  const openBoost = React.useCallback(() => {
    if (!input.authenticated) {
      input.requestAuth();
      return;
    }
    if (sheetState === "funding-review") setSheetState("funding-review");
    else if (!quote) {
      setErrorMessage(undefined);
      setSheetState("compose");
    }
    else if (transactionHash) setSheetState("confirming");
    else if (quote.expires_at <= Math.floor(Date.now() / 1_000)) void createQuote(campaign);
    else setSheetState("quote");
    setSheetOpen(true);
  }, [campaign, createQuote, input, quote, sheetState, transactionHash]);

  const updatePolicy = React.useCallback(async (allowed: boolean) => {
    if (!input.communityId || busy) return;
    setBusy(true);
    setPolicyError(undefined);
    try {
      const policy = await api.rewards.updateSongOwnerPolicy(input.communityId, input.postId, {
        third_party_rewards: allowed ? "allowed" : "blocked",
      });
      setPolicyAllowed(policy.third_party_rewards === "allowed");
    } catch (error) {
      setPolicyError(getErrorMessage(error, "Could not update reward settings."));
    } finally {
      setBusy(false);
    }
  }, [api.rewards, busy, input.communityId, input.postId]);

  const explorerBase = getPirateNetworkConfig().base.explorerUrl.replace(/\/$/u, "");
  const rewardCount = plan?.rewardCount ?? 0;
  const quoteSecondsRemaining = quote ? Math.max(0, quote.expires_at - nowSeconds) : 0;
  const availabilityProblem = hasCampaignConflict
    ? "This song already has a live boost. A new campaign can be funded after it ends."
    : thirdPartyBlocked
      ? "The song owner is not accepting boosts from other people."
      : undefined;

  return {
    // Keep the entry point visible for blocked songs so the menu explains why a
    // second campaign cannot be created instead of silently making Boost vanish.
    canBoost: Boolean(input.song && input.authenticated && capabilities?.enabled && capabilities.post_eligible),
    canManagePolicy: Boolean(
      input.song
      && input.authenticated
      && input.viewerIsAuthor
      && capabilities?.enabled
      && capabilities.post_eligible
    ),
    campaign,
    openBoost,
    openPolicy: () => setPolicyOpen(true),
    policySheetProps: {
      allowThirdPartyRewards: policyAllowed,
      busy,
      errorMessage: policyError,
      onAllowThirdPartyRewardsChange: (allowed: boolean) => void updatePolicy(allowed),
      onOpenChange: setPolicyOpen,
      open: policyOpen,
    },
    sheetProps: {
      budgetLabel: budgetInput,
      budgetPresets: ["5.00", "10.00", "25.00"],
      chainLabel: quote ? chainLabel(quote.chain_id) : capabilities ? chainLabel(capabilities.chain_id) : "Base",
      dailyRewardLabel: dailyRewardInput,
      eligibleActivity,
      eligibleActivities: capabilities?.eligible_activities,
      errorMessage,
      explorerTxUrl: transactionHash ? `${explorerBase}/tx/${transactionHash}` : undefined,
      expiresInLabel: quote && sheetState === "quote" ? `${Math.floor(quoteSecondsRemaining / 60)}:${String(quoteSecondsRemaining % 60).padStart(2, "0")}` : undefined,
      fundingAmountLabel: quote ? formatUsdLabel(quote.amount_cents / 100) ?? undefined : undefined,
      onBudgetChange: setBudgetInput,
      onConfirm: handleConfirm,
      onDailyRewardChange: setDailyRewardInput,
      onEligibleActivityChange: setEligibleActivity,
      onOpenChange: setSheetOpen,
      onRefresh: () => {
        if (campaign && quote && transactionHash) {
          void confirmSubmittedFunding(campaign, quote, transactionHash);
        }
      },
      onRetry: () => {
        if (campaign && quote && transactionHash) {
          void confirmSubmittedFunding(campaign, quote, transactionHash);
          return;
        }
        void createQuote(campaign);
      },
      open: sheetOpen,
      planProblem: availabilityProblem ?? (activityUnavailable
        ? "This reward activity is unavailable right now."
        : !capabilities
        ? "Reward funding is unavailable right now."
        : plan?.problem
          ? boostPlanProblemLabel(plan.problem, limits!)
          : undefined),
      rewardCountLabel: boostRewardCountLabel(rewardCount),
      retryLabel: transactionHash ? "Retry confirmation" : "Start again",
      senderAddressLabel: quote ? shortAddress(quote.sender_address) : undefined,
      state: sheetState,
      supportReference,
      treasuryAddress: quote?.treasury_address,
      walletMismatch,
    } satisfies BoostCampaignSheetProps,
  };
}
