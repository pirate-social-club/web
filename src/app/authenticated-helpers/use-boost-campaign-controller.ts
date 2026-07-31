"use client";

import * as React from "react";
import type {
  RewardCampaign,
  RewardCampaignCapabilities,
  RewardCampaignFundingQuote,
} from "@pirate/api-contracts";

import type { BoostCampaignSheetProps, BoostEligibleActivity } from "@/components/compositions/rewards/reward-booster-surfaces";
import type { BoostPayoutTierDraft } from "@/components/compositions/rewards/reward-booster-surfaces";
import { usePiratePrivyRuntime, usePiratePrivyWallets } from "@/components/auth/privy-provider";
import { useApi } from "@/lib/api";
import { ApiError, isApiNotFoundError } from "@/lib/api/client";
import {
  executeUsdcTransfer,
  findConnectedFundingWallet,
  resolveRewardFundingTransferInput,
} from "@/lib/commerce/routed-checkout";
import { formatUsdLabel } from "@/lib/formatting/currency";
import { parseUsdInput, usdToCents } from "@/lib/formatting/currency";
import { readViteEnv } from "@/lib/vite-env";
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
const FUNDING_FINALITY_POLL_INTERVAL_MS = 10_000;
function nationalityTiersPreviewEnabled(): boolean {
  return readViteEnv("VITE_REWARD_NATIONALITY_TIERS_PREVIEW") === "true";
}

const TERMINAL_FUNDING_CODES = new Set([
  "funding_failed",
  "funding_operator_incident",
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
  fundingId?: string;
  message: string;
  quoteId: string;
  transactionHash: string;
}

export function useBoostMenuEligibility(input: {
  authenticated: boolean;
  postIds: readonly string[];
}): ReadonlySet<string> {
  const api = useApi();
  const postIdsKey = [...new Set(input.postIds.filter(Boolean))].sort().join(",");
  const [eligiblePostIds, setEligiblePostIds] = React.useState<ReadonlySet<string>>(() => new Set());

  React.useEffect(() => {
    if (!input.authenticated || !postIdsKey) {
      setEligiblePostIds(new Set());
      return;
    }

    let cancelled = false;
    const postIds = postIdsKey.split(",");
    void Promise.all(postIds.map(async (postId) => {
      try {
        const capabilities = await api.rewards.getCampaignCapabilities(postId);
        return capabilities.enabled && capabilities.post_eligible ? postId : null;
      } catch {
        return null;
      }
    })).then((results) => {
      if (!cancelled) setEligiblePostIds(new Set(results.filter((postId): postId is string => Boolean(postId))));
    });

    return () => { cancelled = true; };
  }, [api.rewards, input.authenticated, postIdsKey]);

  return eligiblePostIds;
}

function idempotencyKey(prefix: string): string {
  return `${prefix}_${globalThis.crypto?.randomUUID?.() ?? `${Date.now()}_${Math.random().toString(16).slice(2)}`}`;
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
  if (code === "funding_failed") {
    return "This transaction failed on-chain. No funds were received. Start a new funding attempt.";
  }
  if (code === "funding_operator_incident") {
    return "Funding needs support review. Do not send again.";
  }
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

export type BoostFundingErrorKind =
  | "wrong-network"
  | "user-rejected"
  | "wallet-unavailable"
  | "insufficient-usdc"
  | "insufficient-gas"
  | "rpc-failure"
  | "unknown";

function rawErrorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  return typeof error === "string" ? error : "";
}

/**
 * Bucket wallet/provider/transport failures so the booster never shows raw Viem
 * or EIP-1193 internals. Match on the raw message (not getErrorMessage, which
 * can blank network errors) and keep the order: more specific causes first. Gas
 * errors precede token-balance errors because Viem's InsufficientFundsError
 * ("gas * gasFee + value ... exceeds the balance") mentions both.
 */
export function classifyBoostFundingError(error: unknown): BoostFundingErrorKind {
  const message = rawErrorMessage(error);
  if (/current chain of the wallet/i.test(message) && /target chain for the transaction/i.test(message)) {
    return "wrong-network";
  }
  if (/user (rejected|denied)|rejected the (request|transaction)/i.test(message)) {
    return "user-rejected";
  }
  if (/insufficient funds|gas \s*\*|intrinsic gas/i.test(message)) {
    return "insufficient-gas";
  }
  if (/insufficient|exceeds (the )?balance/i.test(message)) {
    return "insufficient-usdc";
  }
  if (/no (connected|available) wallet|wallet (is )?(not connected|unavailable|disconnected)|ethereum provider is not available/i.test(message)) {
    return "wallet-unavailable";
  }
  if (/failed to fetch|fetch failed|network error|timed? ?out|econn(reset|refused)|http request failed|\b50[23]\b|rate limit/i.test(message)) {
    return "rpc-failure";
  }
  return "unknown";
}

export interface BoostFundingErrorContext {
  /** Settlement-chain label for wrong-network copy (e.g. "Base Sepolia"); tracks the active network config. */
  networkLabel?: string;
  /** True once the wallet returned a tx hash; a transport failure after that is a status check, not a safe re-send. */
  submitted?: boolean;
}

export function boostFundingErrorMessage(
  error: unknown,
  fallback: string,
  context: BoostFundingErrorContext = {},
): string {
  switch (classifyBoostFundingError(error)) {
    case "wrong-network":
      return `Switch your wallet to ${context.networkLabel ?? "the required network"}, then try again. No payment was sent.`;
    case "user-rejected":
      return "You canceled the payment in your wallet. No payment was sent.";
    case "wallet-unavailable":
      return "Your wallet is not connected. Reconnect your Pirate Wallet, then try again. No payment was sent.";
    case "insufficient-usdc":
      return "Your wallet does not have enough USDC to fund this boost. No payment was sent.";
    case "insufficient-gas":
      return "Your wallet does not have enough ETH for network fees. No payment was sent.";
    case "rpc-failure":
      return context.submitted
        ? "The network did not respond after your transfer was sent. Check status; do not send again."
        : "The network did not respond. No payment was sent; try again.";
    default:
      // Unknown provider errors must not leak engineering internals to the sheet;
      // API errors carry server-vetted copy and may pass through.
      return error instanceof ApiError ? getErrorMessage(error, fallback) : fallback;
  }
}

function blocksNewCampaign(campaign: RewardCampaign | null): boolean {
  return campaign != null && [
    "scheduled",
    "active",
    "paused",
    "operational_hold",
    "exhausted",
  ].includes(campaign.status);
}

function campaignFundingTxHash(campaign: RewardCampaign | null): string | null {
  return (campaign as (RewardCampaign & { funding_tx_hash?: string | null }) | null)
    ?.funding_tx_hash ?? null;
}

function campaignPayoutTiers(campaign: RewardCampaign | null): Array<{
  amount_cents: number;
  nationalities: string[];
}> {
  return (campaign as (RewardCampaign & {
    payout_tiers?: Array<{ amount_cents: number; nationalities: string[] }>;
  }) | null)?.payout_tiers ?? [];
}

export interface BoostCampaignControllerInput {
  activeCampaignId: string | null;
  authenticated: boolean;
  communityId: string | null;
  onCampaignActivated?: () => void;
  postId: string;
  requestAuth: () => void;
  song: boolean;
  viewerIsAuthor: boolean;
}

export function useBoostCampaignController(input: BoostCampaignControllerInput) {
  const api = useApi();
  const { connectedWallets } = usePiratePrivyWallets({ enabled: input.authenticated && input.song });
  const { reconnectEthereumWallet } = usePiratePrivyRuntime();
  const [capabilities, setCapabilities] = React.useState<(RewardCampaignCapabilities & {
    nationality_payout_tiers?: "unavailable" | "draft_only";
  }) | null>(null);
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
  const [payoutTiers, setPayoutTiers] = React.useState<BoostPayoutTierDraft[]>([]);
  const [busy, setBusy] = React.useState(false);
  const [errorMessage, setErrorMessage] = React.useState<string | undefined>();
  const [terminalCode, setTerminalCode] = React.useState<string | null>(null);
  const [policyError, setPolicyError] = React.useState<string | undefined>();
  const [nowSeconds, setNowSeconds] = React.useState(() => Math.floor(Date.now() / 1_000));
  const createQuoteInFlight = React.useRef(false);
  const sendFundingInFlight = React.useRef(false);
  const confirmFundingInFlight = React.useRef(false);
  const recoveredFundingConfirm = React.useRef(false);

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
      ?? globalThis.localStorage?.getItem(campaignStorageKey(input.communityId, input.postId))
      ?? input.activeCampaignId;
    void Promise.all([
      api.rewards.getCampaignCapabilities(input.postId),
      storedCampaignId
        ? api.rewards.getCampaign(storedCampaignId).then(
          (nextCampaign) => ({ campaign: nextCampaign, missing: false }),
          (error: unknown) => {
            if (isApiNotFoundError(error)) return { campaign: null, missing: true };
            throw error;
          },
        )
        : Promise.resolve({ campaign: null, missing: false }),
    ]).then(([nextCapabilities, storedCampaignResult]) => {
      if (cancelled) return;
      const storedCampaign = storedCampaignResult.campaign;
      setCapabilities(nextCapabilities);
      setCampaign(storedCampaign);
      if (storedCampaignId && storedCampaignResult.missing) {
        globalThis.localStorage?.removeItem(campaignStorageKey(input.communityId!, input.postId));
        globalThis.localStorage?.removeItem(pendingFundingStorageKey(input.communityId!, input.postId));
        globalThis.localStorage?.removeItem(terminalFundingStorageKey(input.communityId!, input.postId));
        return;
      }
      if (storedCampaign) {
        setEligibleActivity(storedCampaign.eligible_activity);
        setDailyRewardInput((storedCampaign.daily_reward_cents / 100).toFixed(2));
        const storedTiers = campaignPayoutTiers(storedCampaign);
        if (storedTiers.length > 0) {
          setPayoutTiers(storedTiers.map((tier, index) => ({
            id: `stored_payout_tier_${index}`,
            nationalities: tier.nationalities,
            amountLabel: (tier.amount_cents / 100).toFixed(2),
          })));
          setSheetState("draft-preview");
        }
      }
      const serverTransactionHash = campaignFundingTxHash(storedCampaign);
      const serverFunded = Boolean(storedCampaign && storedCampaign.funded_cents > 0);
      if (
        storedCampaign
        && serverFunded
        && ["scheduled", "active"].includes(storedCampaign.status)
      ) {
        globalThis.localStorage?.removeItem(pendingFundingStorageKey(input.communityId!, input.postId));
        globalThis.localStorage?.removeItem(terminalFundingStorageKey(input.communityId!, input.postId));
        setTransactionHash(serverTransactionHash ?? pending?.transactionHash ?? terminal?.transactionHash ?? null);
        setTerminalCode(null);
        setErrorMessage(undefined);
        setSheetState("active");
      } else if (terminal && storedCampaign?.id === terminal.campaignId) {
        setTransactionHash(terminal.transactionHash);
        setSupportReference(terminal.quoteId);
        setErrorMessage(terminal.message);
        setTerminalCode(terminal.code);
        setSheetState("funding-review");
        const fundingId = terminal.fundingId ?? terminal.quoteId.split(" / ")[0];
        void api.rewards.confirmFundingQuote(storedCampaign.id, fundingId, {
          tx_hash: terminal.transactionHash,
        }).then(async (funding) => {
          if (cancelled) return;
          if (funding.status === "confirmed") {
            const refreshed = await api.rewards.getCampaign(storedCampaign.id);
            if (cancelled) return;
            setCampaign(refreshed);
            setTransactionHash(campaignFundingTxHash(refreshed) ?? terminal.transactionHash);
            globalThis.localStorage?.removeItem(terminalFundingStorageKey(input.communityId!, input.postId));
            setTerminalCode(null);
            setErrorMessage(undefined);
            setSheetState("active");
            return;
          }
          const statusCode = funding.status === "failed"
            ? "funding_failed"
            : funding.status === "operator_incident"
              ? "funding_operator_incident"
              : funding.status === "refund_pending"
                ? "funding_refund_pending"
                : funding.status === "refunded"
                  ? "funding_refunded"
                  : terminal.code;
          const message = terminalFundingMessage(statusCode);
          const refreshedTerminal = { ...terminal, code: statusCode, fundingId, message };
          globalThis.localStorage?.setItem(
            terminalFundingStorageKey(input.communityId!, input.postId),
            JSON.stringify(refreshedTerminal),
          );
          setTerminalCode(statusCode);
          setErrorMessage(message);
        }).catch((error: unknown) => {
          if (cancelled || !(error instanceof ApiError)) return;
          if (error.code === "funding_quote_already_claimed") {
            const message = terminalFundingMessage("funding_refunded");
            const refreshedTerminal = {
              ...terminal,
              code: "funding_refunded",
              fundingId,
              message,
            };
            globalThis.localStorage?.setItem(
              terminalFundingStorageKey(input.communityId!, input.postId),
              JSON.stringify(refreshedTerminal),
            );
            setTerminalCode("funding_refunded");
            setErrorMessage(message);
          }
        });
      } else if (pending && storedCampaign?.id === pending.campaignId) {
        setQuote(pending.quote);
        setTransactionHash(pending.transactionHash);
        if (pending.transactionHash) {
          setErrorMessage(undefined);
          setSheetState("awaiting-finality");
          recoveredFundingConfirm.current = true;
        } else {
          setSheetState(pending.quote.expires_at <= Math.floor(Date.now() / 1_000) ? "compose" : "quote");
        }
      }
    }).catch(() => {
      if (!cancelled) setCapabilities(null);
    });
    // The song-owner policy read is advisory: the API enforces the policy on
    // its own at campaign creation and activation. Fetch it independently so a
    // failure degrades only the policy state — it must never null capabilities
    // and hide the Boost entry point. Fail open (a 404 already means "no
    // policy set", i.e. allowed), and reset explicitly because policyAllowed
    // is sticky across posts and also gates the funding confirm CTA.
    void api.rewards.getSongOwnerPolicy(input.communityId, input.postId).then((policy) => {
      if (cancelled) return;
      setPolicyAllowed(policy?.third_party_rewards !== "blocked");
    }).catch((error: unknown) => {
      if (cancelled) return;
      if (!isApiNotFoundError(error)) {
        console.warn("[boost] song-owner policy fetch failed; defaulting to allowed", error);
      }
      setPolicyAllowed(true);
    });
    return () => { cancelled = true; };
  }, [api.rewards, input.activeCampaignId, input.authenticated, input.communityId, input.postId, input.song]);

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
  const tiersPreviewAvailable = Boolean(
    nationalityTiersPreviewEnabled()
    && capabilities?.nationality_payout_tiers === "draft_only"
  );
  const parsedPayoutTiers = React.useMemo(() => payoutTiers.map((tier) => ({
    nationalities: tier.nationalities,
    amountCents: usdToCents(parseUsdInput(tier.amountLabel)),
  })), [payoutTiers]);
  const plan = React.useMemo(
    () => limits ? resolveDailyAccrualPlan(
      dailyRewardInput,
      budgetInput,
      limits,
      tiersPreviewAvailable ? parsedPayoutTiers : undefined,
    ) : null,
    [budgetInput, dailyRewardInput, limits, parsedPayoutTiers, tiersPreviewAvailable],
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
    try {
      const now = Math.floor(Date.now() / 1_000);
      const createKeyStorage = createRequestStorageKey(input.communityId, input.postId);
      const tieredDraft = tiersPreviewAvailable && payoutTiers.length > 0;
      const targetCampaign = existingCampaign ?? await api.rewards.createCampaign({
        budget_cents: plan.budgetCents,
        community: input.communityId,
        daily_reward_cents: plan.dailyRewardCents,
        ...(tieredDraft ? {
          default_amount_cents: plan.dailyRewardCents,
          payout_tiers: parsedPayoutTiers.map((tier) => ({
            amount_cents: tier.amountCents!,
            nationalities: tier.nationalities.map((code) => code.trim().toUpperCase()).sort(),
          })),
        } : {}),
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
      if (tieredDraft) {
        setSheetState("draft-preview");
        return;
      }
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
      setErrorMessage(boostFundingErrorMessage(error, "Could not prepare reward funding."));
      setSheetState("failed");
    } finally {
      createQuoteInFlight.current = false;
      setBusy(false);
    }
  }, [api.rewards, capabilities, eligibleActivity, input.communityId, input.postId, parsedPayoutTiers, payoutTiers.length, plan, tiersPreviewAvailable]);

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

  const refreshCampaign = React.useCallback(async (campaignId: string) => {
    const nextCampaign = await api.rewards.getCampaign(campaignId);
    setCampaign(nextCampaign);
    const serverTransactionHash = campaignFundingTxHash(nextCampaign);
    if (serverTransactionHash) setTransactionHash(serverTransactionHash);
    if (
      nextCampaign.funded_cents > 0
      && ["scheduled", "active"].includes(nextCampaign.status)
    ) {
      if (input.communityId) {
        globalThis.localStorage?.removeItem(pendingFundingStorageKey(input.communityId, input.postId));
        globalThis.localStorage?.removeItem(terminalFundingStorageKey(input.communityId, input.postId));
      }
      setTerminalCode(null);
      setErrorMessage(undefined);
      setSheetState("active");
      input.onCampaignActivated?.();
      return true;
    }
    setSheetState("awaiting-finality");
    return false;
  }, [api.rewards, input.communityId, input.onCampaignActivated, input.postId]);

  const applyTerminalFunding = React.useCallback((
    code: string,
    targetCampaign: RewardCampaign,
    targetQuote: RewardCampaignFundingQuote,
    hash: string,
    requestId?: string,
  ) => {
    const message = terminalFundingMessage(code);
    if (input.communityId) {
      const terminal: TerminalFunding = {
        campaignId: targetCampaign.id,
        code,
        fundingId: targetQuote.id,
        message,
        quoteId: requestId ? `${targetQuote.id} / ${requestId}` : targetQuote.id,
        transactionHash: hash,
      };
      globalThis.localStorage?.removeItem(pendingFundingStorageKey(input.communityId, input.postId));
      globalThis.localStorage?.setItem(
        terminalFundingStorageKey(input.communityId, input.postId),
        JSON.stringify(terminal),
      );
      setSupportReference(terminal.quoteId);
    }
    setTerminalCode(code);
    setErrorMessage(message);
    setSheetState("funding-review");
  }, [input.communityId, input.postId]);

  const confirmSubmittedFunding = React.useCallback(async (
    targetCampaign: RewardCampaign,
    targetQuote: RewardCampaignFundingQuote,
    hash: string,
  ) => {
    if (confirmFundingInFlight.current) return;
    confirmFundingInFlight.current = true;
    setBusy(true);
    setErrorMessage(undefined);
    setSheetState("confirming");
    try {
      const funding = await api.rewards.confirmFundingQuote(
        targetCampaign.id,
        targetQuote.id,
        { tx_hash: hash },
      );
      if (funding.status === "confirming" || funding.status === "quoted") {
        setSheetState("awaiting-finality");
        return;
      }
      if (funding.status === "failed") {
        applyTerminalFunding("funding_failed", targetCampaign, targetQuote, hash);
        return;
      }
      if (funding.status === "operator_incident") {
        applyTerminalFunding("funding_operator_incident", targetCampaign, targetQuote, hash);
        return;
      }
      if (funding.status === "refund_pending") {
        applyTerminalFunding("funding_refund_pending", targetCampaign, targetQuote, hash);
        return;
      }
      if (funding.status === "refunded") {
        applyTerminalFunding("funding_refunded", targetCampaign, targetQuote, hash);
        return;
      }
      await refreshCampaign(targetCampaign.id);
    } catch (error) {
      const code = error instanceof ApiError ? error.code : "";
      if ((TERMINAL_FUNDING_CODES.has(code) || code === "funding_refunded") && input.communityId) {
        applyTerminalFunding(
          code,
          targetCampaign,
          targetQuote,
          hash,
          error instanceof ApiError ? error.requestId ?? undefined : undefined,
        );
        return;
      }
      setErrorMessage(undefined);
      setSheetState("awaiting-finality");
    } finally {
      confirmFundingInFlight.current = false;
      setBusy(false);
    }
  }, [api.rewards, applyTerminalFunding, input.communityId, refreshCampaign]);

  React.useEffect(() => {
    if (
      sheetState !== "awaiting-finality"
      || !campaign
      || !quote
      || !transactionHash
    ) return;

    // A submission recovered from storage has not been checked in this
    // session; confirm it immediately instead of waiting a full interval.
    if (recoveredFundingConfirm.current) {
      recoveredFundingConfirm.current = false;
      void confirmSubmittedFunding(campaign, quote, transactionHash);
    }
    const timer = window.setInterval(() => {
      void confirmSubmittedFunding(campaign, quote, transactionHash);
    }, FUNDING_FINALITY_POLL_INTERVAL_MS);
    return () => window.clearInterval(timer);
  }, [campaign, confirmSubmittedFunding, quote, sheetState, transactionHash]);

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
    // Local mirror of the submitted hash: the catch below must know whether a
    // transaction exists to choose between "retry safely" and "check status".
    let submittedHash: string | null = null;
    try {
      const hash = await executeUsdcTransfer({
        transfer: resolveRewardFundingTransferInput(quote),
        wallet: fundingWallet,
        onSubmitted: (submitted) => {
          submittedHash = submitted;
          setTransactionHash(submitted);
          if (input.communityId) {
            writePendingFunding(input.communityId, input.postId, {
              campaignId: campaign.id,
              quote,
              transactionHash: submitted,
            });
          }
        },
      });
      await confirmSubmittedFunding(campaign, quote, hash);
    } catch (error) {
      if (submittedHash) {
        setErrorMessage(undefined);
        setSheetState("awaiting-finality");
      } else {
        setErrorMessage(boostFundingErrorMessage(
          error,
          "Could not submit reward funding.",
          {
            networkLabel: getPirateNetworkConfig().base.label,
            submitted: false,
          },
        ));
        setSheetState("failed");
      }
    } finally {
      sendFundingInFlight.current = false;
      setBusy(false);
    }
  }, [campaign, confirmSubmittedFunding, createQuote, fundingWallet, input.communityId, input.postId, quote]);

  const hasCampaignConflict = Boolean(input.activeCampaignId) || blocksNewCampaign(campaign);
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
    if (campaign && ["scheduled", "active"].includes(campaign.status)) setSheetState("active");
    else if (sheetState === "funding-review") setSheetState("funding-review");
    else if (campaignPayoutTiers(campaign).length > 0) setSheetState("draft-preview");
    else if (!quote) {
      setErrorMessage(undefined);
      setSheetState("compose");
    }
    else if (transactionHash) setSheetState("awaiting-finality");
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
  const availabilityProblem = hasCampaignConflict
      ? "This song already has a live boost. Adding funds to it is not available here yet."
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
      busy,
      canRestartFunding: terminalCode === "funding_failed",
      budgetDisplayLabel: formatUsdLabel((plan?.budgetCents ?? 0) / 100) ?? "$0.00",
      budgetLabel: budgetInput,
      budgetPresets: ["$5.00", "$10.00", "$25.00"],
      dailyRewardLabel: dailyRewardInput,
      dailyRewardDisplayLabel: plan?.dailyRewardCents != null
        ? formatUsdLabel(plan.dailyRewardCents / 100) ?? undefined
        : undefined,
      eligibleActivity,
      eligibleActivities: capabilities?.eligible_activities,
      endsAtLabel: campaign
        ? new Intl.DateTimeFormat("en-US", { day: "numeric", month: "short" }).format(new Date(campaign.ends_at * 1_000))
        : undefined,
      errorMessage,
      explorerTxUrl: (transactionHash ?? campaignFundingTxHash(campaign))
        ? `${explorerBase}/tx/${transactionHash ?? campaignFundingTxHash(campaign)}`
        : undefined,
      fundingAmountLabel: quote ? formatUsdLabel(quote.amount_cents / 100) ?? undefined : undefined,
      fundedLabel: campaign ? formatUsdLabel(campaign.funded_cents / 100) ?? undefined : undefined,
      onBudgetChange: setBudgetInput,
      ...(tiersPreviewAvailable ? {
        payoutTiers,
        onAddPayoutTier: () => setPayoutTiers((tiers) => [
          ...tiers,
          { id: idempotencyKey("payout_tier"), nationalities: [], amountLabel: "" },
        ]),
        onRemovePayoutTier: (tierId: string) => setPayoutTiers((tiers) => tiers.filter((tier) => tier.id !== tierId)),
        onPayoutTierNationalitiesChange: (tierId: string, nationalities: string[]) => setPayoutTiers((tiers) => tiers.map(
          (tier) => tier.id === tierId ? { ...tier, nationalities } : tier,
        )),
        onPayoutTierAmountChange: (tierId: string, amountLabel: string) => setPayoutTiers((tiers) => tiers.map(
          (tier) => tier.id === tierId ? { ...tier, amountLabel } : tier,
        )),
        maxClaimDisplayLabel: plan?.maxClaimCents != null
          ? formatUsdLabel(plan.maxClaimCents / 100) ?? undefined
          : undefined,
      } : {}),
      onConfirm: handleConfirm,
      onConnectWallet: reconnectEthereumWallet ?? undefined,
      onDailyRewardChange: setDailyRewardInput,
      onEligibleActivityChange: setEligibleActivity,
      onOpenChange: setSheetOpen,
      onRefresh: () => {
        if (campaign && quote && transactionHash) {
          void confirmSubmittedFunding(campaign, quote, transactionHash);
          return;
        }
        if (campaign) void refreshCampaign(campaign.id).catch(() => setSheetState("awaiting-finality"));
      },
      onRetry: () => {
        if (sheetState === "funding-review" && terminalCode === "funding_failed") {
          if (input.communityId) {
            globalThis.localStorage?.removeItem(terminalFundingStorageKey(input.communityId, input.postId));
          }
          setTerminalCode(null);
          setTransactionHash(null);
          setQuote(null);
          setErrorMessage(undefined);
          void createQuote(campaign);
          return;
        }
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
      rewardsPaidLabel: campaign ? formatUsdLabel(campaign.credited_cents / 100) ?? undefined : undefined,
      remainingLabel: campaign ? formatUsdLabel(campaign.remaining_cents / 100) ?? undefined : undefined,
      retryLabel: transactionHash ? "Check funding" : "Start again",
      state: sheetState,
      supportReference,
      walletMismatch,
      walletMismatchReason: connectedWallets.length > 0 ? "different-wallet" : "no-wallet",
    } satisfies BoostCampaignSheetProps,
  };
}
