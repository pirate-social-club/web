"use client";
import * as React from "react";
import type {
  RewardCampaign,
  RewardCampaignFundingQuote,
} from "@pirate/api-contracts";
import type {
  BoostCampaignSheetProps,
  BoostEligibleActivity,
  BoostPayoutTierDraft,
  BoostRewardIdentityProvider,
} from "@/components/compositions/rewards/reward-booster-surfaces";
import type {
  BountyObjective,
  LegacyEitherBounty,
  SongBountiesSheetProps,
  SongBountyLifecycleStatus,
  SongBountySlot,
} from "@/components/compositions/rewards/song-bounties-sheet";
import { usePiratePrivyRuntime, usePiratePrivyWallets } from "@/components/auth/privy-provider";
import { useApi } from "@/lib/api";
import { ApiError, isApiNotFoundError } from "@/lib/api/client";
import {
  executeUsdcTransfer,
  findConnectedFundingWallet,
  resolveRewardFundingTransferInput,
} from "@/lib/commerce/routed-checkout";
import { formatUsdCentsLabel, parseUsdInput, usdToCents } from "@/lib/formatting/currency";
import { getErrorMessage } from "@/lib/error-utils";
import { getPirateNetworkConfig } from "@/lib/network-config";
import {
  boostPlanProblemLabel,
  boostRewardCountLabel,
  resolveDailyAccrualPlan,
} from "@/lib/rewards/boost-plan";
import {
  INITIAL_BOOST_FUNDING_WORKFLOW_STATE,
  reduceBoostFundingWorkflow,
} from "./boost-funding-workflow";
import {
  INITIAL_BOOST_POLICY_WORKFLOW_STATE,
  reduceBoostPolicyWorkflow,
} from "./boost-policy-workflow";
import {
  acceptsCampaignTopUp,
  blocksNewCampaign,
  campaignContributionProblem,
  campaignFundingTxHash,
  campaignPayoutTiers,
} from "./boost-campaign-resource";
import type { BoostCampaignControllerInput } from "./boost-campaign-controller-types";
import { boostFundingErrorMessage } from "./boost-funding-errors";
import {
  nationalityTiersPreviewEnabled,
  rewardIdentityProviderChoices,
  supportsNationalityTierDraftPreview,
  type RewardCampaignCapabilitiesWithProviderChoices,
} from "./boost-reward-provider-policy";
import {
  boostIdempotencyKey,
  campaignStorageKey,
  createRequestStorageKey,
  pendingFundingStorageKey,
  quoteRequestStorageKey,
  readPendingFunding,
  readTerminalFunding,
  requestKey,
  TERMINAL_FUNDING_CODES,
  terminalFundingMessage,
  terminalFundingStorageKey,
  type TerminalFunding,
  writePendingFunding,
} from "./boost-funding-recovery";
export type { BoostCampaignControllerInput } from "./boost-campaign-controller-types";
export { useBoostMenuEligibility } from "./use-boost-menu-eligibility";
const SCORE_THRESHOLD_BPS = 7_000;
const FUNDING_FINALITY_POLL_INTERVAL_MS = 10_000;

function songBountyLifecycleStatus(status: RewardCampaign["status"]): SongBountyLifecycleStatus {
  switch (status) {
    case "draft":
    case "funding_quoted":
    case "funding_confirming":
      return "funding_confirming";
    case "scheduled":
    case "active":
      return "active";
    case "paused":
      return "paused";
    case "operational_hold":
      return "operational_hold";
    case "exhausted":
      return "exhausted";
    case "ended":
    case "canceled":
      return "empty";
    default: {
      const exhaustive: never = status;
      return exhaustive;
    }
  }
}

function campaignRewardLabel(campaign: RewardCampaign): string {
  const amounts = [
    campaign.daily_reward_cents,
    ...campaignPayoutTiers(campaign).map((tier) => tier.amount_cents),
  ].filter((amount): amount is number => Number.isFinite(amount) && amount > 0);
  if (amounts.length === 0) return "$0.00 per day";
  const minimum = Math.min(...amounts);
  const maximum = Math.max(...amounts);
  const minimumLabel = formatUsdCentsLabel(minimum) ?? "$0.00";
  const maximumLabel = formatUsdCentsLabel(maximum) ?? minimumLabel;
  return minimum === maximum
    ? `${minimumLabel} per day`
    : `${minimumLabel}–${maximumLabel} per day`;
}

export function useBoostCampaignController(input: BoostCampaignControllerInput) {
  const api = useApi();
  const { connectedWallets } = usePiratePrivyWallets({ enabled: input.authenticated && input.song });
  const { reconnectEthereumWallet } = usePiratePrivyRuntime();
  const [capabilities, setCapabilities] = React.useState<RewardCampaignCapabilitiesWithProviderChoices | null>(null);
  const [policyAllowed, setPolicyAllowed] = React.useState(true);
  const [campaign, setCampaign] = React.useState<RewardCampaign | null>(null);
  const [campaignResolved, setCampaignResolved] = React.useState(false);
  const [quote, setQuote] = React.useState<RewardCampaignFundingQuote | null>(null);
  const [bountiesOpen, setBountiesOpen] = React.useState(false);
  const [sheetOpen, setSheetOpen] = React.useState(false);
  const [policyOpen, setPolicyOpen] = React.useState(false);
  const [eligibleActivity, setEligibleActivity] = React.useState<BoostEligibleActivity>("karaoke");
  const [identityProvider, setIdentityProvider] = React.useState<BoostRewardIdentityProvider>("very");
  const [dailyRewardInput, setDailyRewardInput] = React.useState("1.00");
  const [budgetInput, setBudgetInput] = React.useState("10.00");
  const [payoutTiers, setPayoutTiers] = React.useState<BoostPayoutTierDraft[]>([]);
  const [nationalityPricingEnabled, setNationalityPricingEnabled] = React.useState(false);
  const [reviewAttempted, setReviewAttempted] = React.useState(false);
  const [fundingWorkflow, dispatchFundingWorkflow] = React.useReducer(
    reduceBoostFundingWorkflow,
    INITIAL_BOOST_FUNDING_WORKFLOW_STATE,
  );
  const {
    busy,
    errorMessage,
    status: sheetState,
    supportReference,
    terminalCode,
    transactionHash,
  } = fundingWorkflow;
  const [policyWorkflow, dispatchPolicyWorkflow] = React.useReducer(
    reduceBoostPolicyWorkflow,
    INITIAL_BOOST_POLICY_WORKFLOW_STATE,
  );
  const [nowSeconds, setNowSeconds] = React.useState(() => Math.floor(Date.now() / 1_000));
  const createQuoteInFlight = React.useRef(false);
  const sendFundingInFlight = React.useRef(false);
  const confirmFundingInFlight = React.useRef(false);
  const policyUpdateInFlight = React.useRef(false);
  const recoveredFundingConfirm = React.useRef(false);
  const fundingOwnerKey = `${input.communityId ?? ""}:${input.postId}`;
  const fundingOwnerKeyRef = React.useRef(fundingOwnerKey);
  if (fundingOwnerKeyRef.current !== fundingOwnerKey) {
    fundingOwnerKeyRef.current = fundingOwnerKey;
    createQuoteInFlight.current = false;
    sendFundingInFlight.current = false;
    confirmFundingInFlight.current = false;
    recoveredFundingConfirm.current = false;
  }
  const policyOwnerKey = `${input.communityId ?? ""}:${input.postId}`;
  const policyOwnerKeyRef = React.useRef(policyOwnerKey);
  if (policyOwnerKeyRef.current !== policyOwnerKey) {
    policyOwnerKeyRef.current = policyOwnerKey;
    policyUpdateInFlight.current = false;
  }

  React.useEffect(() => {
    dispatchPolicyWorkflow({ type: "owner-changed" });
  }, [policyOwnerKey]);

  React.useEffect(() => {
    dispatchFundingWorkflow({ type: "owner-changed" });
  }, [fundingOwnerKey]);

  React.useEffect(() => {
    if (!input.authenticated || !input.song || !input.communityId) {
      setCapabilities(null);
      setCampaign(null);
      setCampaignResolved(true);
      return;
    }
    setCampaignResolved(false);
    let cancelled = false;
    const pending = readPendingFunding(input.communityId, input.postId);
    const terminal = readTerminalFunding(input.communityId, input.postId);
    const storedCampaignId = terminal?.campaignId ?? pending?.campaignId
      ?? globalThis.localStorage?.getItem(campaignStorageKey(input.communityId, input.postId))
      ?? input.activeCampaignId;
    const loadCampaign = async (): Promise<{ campaign: RewardCampaign | null; missingStored: boolean }> => {
      let missingStored = false;
      if (storedCampaignId) {
        try {
          const storedCampaign = await api.rewards.getCampaign(storedCampaignId);
          if (!["ended", "canceled"].includes(storedCampaign.status)) {
            return { campaign: storedCampaign, missingStored };
          }
          try {
            return {
              campaign: await api.rewards.getCampaignForSong(input.communityId!, input.postId),
              missingStored,
            };
          } catch (error: unknown) {
            if (isApiNotFoundError(error)) return { campaign: storedCampaign, missingStored };
            throw error;
          }
        } catch (error: unknown) {
          if (!isApiNotFoundError(error)) throw error;
          missingStored = true;
        }
      }
      try {
        return {
          campaign: await api.rewards.getCampaignForSong(input.communityId!, input.postId),
          missingStored,
        };
      } catch (error: unknown) {
        if (isApiNotFoundError(error)) return { campaign: null, missingStored };
        throw error;
      }
    };
    void Promise.all([
      api.rewards.getCampaignCapabilities(input.postId),
      loadCampaign(),
    ]).then(([nextCapabilities, storedCampaignResult]) => {
      if (cancelled) return;
      const storedCampaign = storedCampaignResult.campaign;
      setCapabilities(nextCapabilities);
      setCampaign(storedCampaign);
      setCampaignResolved(true);
      if (storedCampaignResult.missingStored) {
        globalThis.localStorage?.removeItem(campaignStorageKey(input.communityId!, input.postId));
        globalThis.localStorage?.removeItem(pendingFundingStorageKey(input.communityId!, input.postId));
        globalThis.localStorage?.removeItem(terminalFundingStorageKey(input.communityId!, input.postId));
      }
      if (storedCampaign) {
        globalThis.localStorage?.setItem(
          campaignStorageKey(input.communityId!, input.postId),
          storedCampaign.id,
        );
      }
      if (storedCampaign) {
        setEligibleActivity(storedCampaign.eligible_activity);
        setIdentityProvider(storedCampaign.reward_identity_provider);
        setDailyRewardInput((storedCampaign.daily_reward_cents / 100).toFixed(2));
        const storedTiers = campaignPayoutTiers(storedCampaign);
        if (storedTiers.length > 0) {
          setNationalityPricingEnabled(true);
          setPayoutTiers(storedTiers.map((tier, index) => ({
            id: `stored_payout_tier_${index}`,
            nationalities: tier.nationalities,
            amountLabel: (tier.amount_cents / 100).toFixed(2),
          })));
          dispatchFundingWorkflow({ type: "show", status: "draft-preview" });
        }
      }
      const serverTransactionHash = campaignFundingTxHash(storedCampaign);
      const serverFunded = Boolean(storedCampaign && storedCampaign.funded_cents > 0);
      const terminalAlreadyReflectedByServer = Boolean(
        terminal
        && storedCampaign?.id === terminal.campaignId
        && serverFunded
        && ["scheduled", "active"].includes(storedCampaign.status)
        && serverTransactionHash === terminal.transactionHash,
      );
      if (terminalAlreadyReflectedByServer) {
        globalThis.localStorage?.removeItem(terminalFundingStorageKey(input.communityId!, input.postId));
        dispatchFundingWorkflow({
          type: "activated",
          transactionHash: serverTransactionHash,
        });
      } else if (terminal && storedCampaign?.id === terminal.campaignId) {
        dispatchFundingWorkflow({
          type: "review-required",
          code: terminal.code,
          message: terminal.message,
          supportReference: terminal.quoteId,
          transactionHash: terminal.transactionHash,
        });
        const fundingId = terminal.fundingId ?? terminal.quoteId.split(" / ")[0];
        void api.rewards.confirmFundingQuote(storedCampaign.id, fundingId, {
          tx_hash: terminal.transactionHash,
        }).then(async (funding) => {
          if (cancelled) return;
          if (funding.status === "confirmed") {
            const refreshed = await api.rewards.getCampaign(storedCampaign.id);
            if (cancelled) return;
            setCampaign(refreshed);
            globalThis.localStorage?.removeItem(terminalFundingStorageKey(input.communityId!, input.postId));
            dispatchFundingWorkflow({
              type: "activated",
              transactionHash: campaignFundingTxHash(refreshed) ?? terminal.transactionHash,
            });
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
          dispatchFundingWorkflow({ type: "review-updated", code: statusCode, message });
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
            dispatchFundingWorkflow({ type: "review-updated", code: "funding_refunded", message });
          }
        });
      } else if (pending && storedCampaign?.id === pending.campaignId) {
        setQuote(pending.quote);
        if (pending.transactionHash) {
          dispatchFundingWorkflow({
            type: "awaiting-finality",
            transactionHash: pending.transactionHash,
          });
          recoveredFundingConfirm.current = true;
        } else {
          dispatchFundingWorkflow({
            type: "show",
            status: pending.quote.expires_at <= Math.floor(Date.now() / 1_000) ? "compose" : "quote",
          });
        }
      } else if (
        storedCampaign
        && serverFunded
        && ["scheduled", "active"].includes(storedCampaign.status)
      ) {
        dispatchFundingWorkflow({
          type: "activated",
          transactionHash: serverTransactionHash,
        });
      }
    }).catch(() => {
      if (!cancelled) {
        setCapabilities(null);
        setCampaignResolved(true);
      }
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
  const nationalityTierCapability = capabilities?.nationality_payout_tiers;
  const tierFundingEnabled = nationalityTierCapability === "enabled";
  const tiersPreviewAvailable = tierFundingEnabled || Boolean(
    nationalityTiersPreviewEnabled()
    && supportsNationalityTierDraftPreview(nationalityTierCapability)
  );
  const identityProviderChoices = React.useMemo(() => rewardIdentityProviderChoices(
    nationalityPricingEnabled
      ? capabilities?.nationality_tier_identity_providers
      : capabilities?.flat_identity_providers,
    nationalityPricingEnabled ? "self" : "very",
  ), [capabilities, nationalityPricingEnabled]);
  const parsedPayoutTiers = React.useMemo(() => payoutTiers.map((tier) => ({
    nationalities: tier.nationalities,
    amountCents: usdToCents(parseUsdInput(tier.amountLabel)),
  })), [payoutTiers]);
  const plan = React.useMemo(
    () => limits ? resolveDailyAccrualPlan(
      dailyRewardInput,
      budgetInput,
      limits,
      tiersPreviewAvailable && nationalityPricingEnabled ? parsedPayoutTiers : undefined,
    ) : null,
    [budgetInput, dailyRewardInput, limits, nationalityPricingEnabled, parsedPayoutTiers, tiersPreviewAvailable],
  );
  const fundingWallet = quote ? findConnectedFundingWallet({
    connectedWallets,
    primaryWalletAddress: quote.sender_address,
  }) : null;
  const walletMismatch = Boolean(quote && !fundingWallet);
  const completionRangeLabel = React.useMemo(() => {
    if (!nationalityPricingEnabled || !plan?.tiered || plan.budgetCents == null || plan.rewardCount == null) return undefined;
    const amounts = [plan.dailyRewardCents, ...parsedPayoutTiers.map((tier) => tier.amountCents)]
      .filter((amount): amount is number => amount != null && amount > 0);
    if (amounts.length === 0) return undefined;
    const upper = Math.floor(plan.budgetCents / Math.min(...amounts));
    return `${plan.rewardCount.toLocaleString("en")}–${upper.toLocaleString("en")} completions`;
  }, [nationalityPricingEnabled, parsedPayoutTiers, plan]);

  const createQuote = React.useCallback(async (existingCampaign?: RewardCampaign | null) => {
    if (createQuoteInFlight.current || !input.communityId || !capabilities || !plan?.valid || plan.budgetCents == null || plan.dailyRewardCents == null) return;
    const requestOwnerKey = fundingOwnerKeyRef.current;
    createQuoteInFlight.current = true;
    dispatchFundingWorkflow({ type: "operation-started" });
    try {
      const now = Math.floor(Date.now() / 1_000);
      const createKeyStorage = createRequestStorageKey(input.communityId, input.postId);
      const tieredDraft = tiersPreviewAvailable && nationalityPricingEnabled && payoutTiers.length > 0;
      const selectedProvider = existingCampaign?.reward_identity_provider ?? identityProvider;
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
        reward_identity_provider: selectedProvider,
        reward_period_cap_cents: plan.dailyRewardCents,
        starts_at: now,
      });
      if (fundingOwnerKeyRef.current !== requestOwnerKey) return;
      globalThis.localStorage?.removeItem(createKeyStorage);
      setCampaign(targetCampaign);
      globalThis.localStorage?.setItem(campaignStorageKey(input.communityId, input.postId), targetCampaign.id);
      if (tieredDraft && !tierFundingEnabled) {
        dispatchFundingWorkflow({ type: "show", status: "draft-preview" });
        return;
      }
      const quoteKeyStorage = quoteRequestStorageKey(targetCampaign.id);
      const nextQuote = await api.rewards.createFundingQuote(targetCampaign.id, {
        amount_cents: existingCampaign ? plan.budgetCents : targetCampaign.budget_cents,
        idempotency_key: requestKey(quoteKeyStorage, "reward_quote"),
        reward_identity_provider: targetCampaign.reward_identity_provider,
      });
      if (fundingOwnerKeyRef.current !== requestOwnerKey) return;
      globalThis.localStorage?.removeItem(quoteKeyStorage);
      setQuote(nextQuote);
      writePendingFunding(input.communityId, input.postId, {
        campaignId: targetCampaign.id,
        quote: nextQuote,
        transactionHash: nextQuote.tx_hash ?? null,
      });
      dispatchFundingWorkflow({ type: "quote-ready", transactionHash: nextQuote.tx_hash ?? null });
    } catch (error) {
      if (fundingOwnerKeyRef.current !== requestOwnerKey) return;
      dispatchFundingWorkflow({
        type: "failed",
        message: boostFundingErrorMessage(error, "Could not prepare bounty funding."),
      });
    } finally {
      if (fundingOwnerKeyRef.current === requestOwnerKey) {
        createQuoteInFlight.current = false;
        dispatchFundingWorkflow({ type: "operation-finished" });
      }
    }
  }, [api.rewards, capabilities, eligibleActivity, identityProvider, input.communityId, input.postId, nationalityPricingEnabled, parsedPayoutTiers, payoutTiers.length, plan, tierFundingEnabled, tiersPreviewAvailable]);

  React.useEffect(() => {
    if (campaign) return;
    if (!identityProviderChoices.includes(identityProvider)) {
      setIdentityProvider(identityProviderChoices[0]!);
    }
  }, [campaign, identityProvider, identityProviderChoices]);

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
    const requestOwnerKey = fundingOwnerKeyRef.current;
    const nextCampaign = await api.rewards.getCampaign(campaignId);
    if (fundingOwnerKeyRef.current !== requestOwnerKey) return false;
    setCampaign(nextCampaign);
    const serverTransactionHash = campaignFundingTxHash(nextCampaign);
    if (serverTransactionHash) {
      dispatchFundingWorkflow({ type: "transaction-recorded", transactionHash: serverTransactionHash });
    }
    if (
      nextCampaign.funded_cents > 0
      && ["scheduled", "active"].includes(nextCampaign.status)
    ) {
      if (input.communityId) {
        globalThis.localStorage?.removeItem(pendingFundingStorageKey(input.communityId, input.postId));
        globalThis.localStorage?.removeItem(terminalFundingStorageKey(input.communityId, input.postId));
      }
      dispatchFundingWorkflow({ type: "activated", transactionHash: serverTransactionHash });
      input.onCampaignActivated?.();
      return true;
    }
    dispatchFundingWorkflow({ type: "awaiting-finality" });
    return false;
  // The input container is recreated by callers; these listed members are the complete callback inputs.
  // eslint-disable-next-line react-hooks/exhaustive-deps
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
    }
    dispatchFundingWorkflow({
      type: "review-required",
      code,
      message,
      supportReference: requestId ? `${targetQuote.id} / ${requestId}` : targetQuote.id,
      transactionHash: hash,
    });
  }, [input.communityId, input.postId]);

  const confirmSubmittedFunding = React.useCallback(async (
    targetCampaign: RewardCampaign,
    targetQuote: RewardCampaignFundingQuote,
    hash: string,
  ) => {
    if (confirmFundingInFlight.current) return;
    const requestOwnerKey = fundingOwnerKeyRef.current;
    confirmFundingInFlight.current = true;
    dispatchFundingWorkflow({ type: "confirmation-started" });
    try {
      const funding = await api.rewards.confirmFundingQuote(
        targetCampaign.id,
        targetQuote.id,
        { tx_hash: hash },
      );
      if (fundingOwnerKeyRef.current !== requestOwnerKey) return;
      if (funding.status === "confirming" || funding.status === "quoted") {
        dispatchFundingWorkflow({ type: "awaiting-finality", transactionHash: hash });
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
      if (fundingOwnerKeyRef.current !== requestOwnerKey) return;
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
      dispatchFundingWorkflow({ type: "awaiting-finality", transactionHash: hash });
    } finally {
      if (fundingOwnerKeyRef.current === requestOwnerKey) {
        confirmFundingInFlight.current = false;
        dispatchFundingWorkflow({ type: "operation-finished" });
      }
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
    const requestOwnerKey = fundingOwnerKeyRef.current;
    if (quote.expires_at <= Math.floor(Date.now() / 1_000)) {
      void createQuote(campaign);
      return;
    }
    sendFundingInFlight.current = true;
    dispatchFundingWorkflow({ type: "operation-started", status: "confirming" });
    // Local mirror of the submitted hash: the catch below must know whether a
    // transaction exists to choose between "retry safely" and "check status".
    let submittedHash: string | null = null;
    try {
      const hash = await executeUsdcTransfer({
        transfer: resolveRewardFundingTransferInput(quote),
        wallet: fundingWallet,
        onSubmitted: (submitted) => {
          submittedHash = submitted;
          if (fundingOwnerKeyRef.current !== requestOwnerKey) return;
          dispatchFundingWorkflow({ type: "transaction-submitted", transactionHash: submitted });
          if (input.communityId) {
            writePendingFunding(input.communityId, input.postId, {
              campaignId: campaign.id,
              quote,
              transactionHash: submitted,
            });
          }
        },
      });
      if (fundingOwnerKeyRef.current !== requestOwnerKey) return;
      await confirmSubmittedFunding(campaign, quote, hash);
    } catch (error) {
      if (fundingOwnerKeyRef.current !== requestOwnerKey) return;
      if (submittedHash) {
        dispatchFundingWorkflow({ type: "awaiting-finality", transactionHash: submittedHash });
      } else {
        dispatchFundingWorkflow({
          type: "failed",
          message: boostFundingErrorMessage(
            error,
            "Could not submit bounty funding.",
            {
              networkLabel: getPirateNetworkConfig().base.label,
              submitted: false,
            },
          ),
        });
      }
    } finally {
      if (fundingOwnerKeyRef.current === requestOwnerKey) {
        sendFundingInFlight.current = false;
        dispatchFundingWorkflow({ type: "operation-finished" });
      }
    }
  }, [campaign, confirmSubmittedFunding, createQuote, fundingWallet, input.communityId, input.postId, quote]);

  const campaignAcceptsTopUp = acceptsCampaignTopUp(campaign);
  const hasCampaignConflict = (Boolean(input.activeCampaignId) || blocksNewCampaign(campaign))
    && !campaignAcceptsTopUp;
  const thirdPartyBlocked = !input.viewerIsAuthor && !policyAllowed;
  const authoritativeEligibleActivity = sheetState === "compose"
    ? eligibleActivity
    : campaign?.eligible_activity ?? eligibleActivity;
  const activityUnavailable = Boolean(
    !campaign
    && capabilities
    && !capabilities.eligible_activities.includes(authoritativeEligibleActivity),
  );

  const handleConfirm = React.useCallback(() => {
    if (busy || hasCampaignConflict || thirdPartyBlocked || activityUnavailable) return;
    if (sheetState === "compose") {
      setReviewAttempted(true);
      if (nationalityPricingEnabled && payoutTiers.length === 0) return;
    }
    if (sheetState === "compose") void createQuote(campaign?.status === "draft" ? campaign : null);
    if (sheetState === "top_up") void createQuote(campaign);
    if (sheetState === "quote") void sendFunding();
  }, [activityUnavailable, busy, campaign, createQuote, hasCampaignConflict, nationalityPricingEnabled, payoutTiers.length, sendFunding, sheetState, thirdPartyBlocked]);

  const openBoost = React.useCallback(() => {
    if (!input.authenticated) {
      input.requestAuth();
      return;
    }
    if (sheetState === "funding-review") {
      // Terminal review is intentionally sticky until an explicit retry is allowed.
    }
    else if (
      quote
      && transactionHash
      && ["confirming", "awaiting-finality"].includes(sheetState)
    ) {
      dispatchFundingWorkflow({ type: "awaiting-finality", transactionHash });
    }
    else if (quote && sheetState === "quote") {
      if (quote.expires_at <= Math.floor(Date.now() / 1_000)) void createQuote(campaign);
      else dispatchFundingWorkflow({ type: "show", status: "quote" });
    }
    else if (campaignAcceptsTopUp) {
      setQuote(null);
      dispatchFundingWorkflow({ type: "show", status: "top_up" });
    }
    else if (campaignPayoutTiers(campaign).length > 0 && !tierFundingEnabled) {
      dispatchFundingWorkflow({ type: "show", status: "draft-preview" });
    }
    else if (campaignPayoutTiers(campaign).length > 0 && !quote) void createQuote(campaign);
    else if (!quote) {
      dispatchFundingWorkflow({ type: "restart" });
    }
    else if (quote.expires_at <= Math.floor(Date.now() / 1_000)) void createQuote(campaign);
    else dispatchFundingWorkflow({ type: "show", status: "quote" });
    setSheetOpen(true);
  }, [campaign, campaignAcceptsTopUp, createQuote, input, quote, sheetState, tierFundingEnabled, transactionHash]);

  const openBounties = React.useCallback(() => {
    if (!input.authenticated) {
      input.requestAuth();
      return;
    }
    setBountiesOpen(true);
  }, [input]);

  const updatePolicy = React.useCallback(async (allowed: boolean) => {
    if (!input.communityId || policyUpdateInFlight.current) return;
    const requestOwnerKey = policyOwnerKeyRef.current;
    policyUpdateInFlight.current = true;
    dispatchPolicyWorkflow({ type: "update-started" });
    try {
      const policy = await api.rewards.updateSongOwnerPolicy(input.communityId, input.postId, {
        third_party_rewards: allowed ? "allowed" : "blocked",
      });
      if (policyOwnerKeyRef.current !== requestOwnerKey) return;
      setPolicyAllowed(policy.third_party_rewards === "allowed");
      dispatchPolicyWorkflow({ type: "update-succeeded" });
    } catch (error) {
      if (policyOwnerKeyRef.current !== requestOwnerKey) return;
      dispatchPolicyWorkflow({
        type: "update-failed",
        message: getErrorMessage(error, "Could not update bounty settings."),
      });
    } finally {
      if (policyOwnerKeyRef.current === requestOwnerKey) {
        policyUpdateInFlight.current = false;
      }
    }
  }, [api.rewards, input.communityId, input.postId]);

  const explorerBase = getPirateNetworkConfig().base.explorerUrl.replace(/\/$/u, "");
  const rewardCount = plan?.rewardCount ?? 0;
  const canUseBounties = Boolean(
    input.song
      && input.authenticated
      && capabilities?.enabled
      && capabilities.post_eligible,
  );
  const canBrowseBounties = canUseBounties && campaignResolved;
  const campaignOccupiesSlots = Boolean(
    campaign
      && campaign.status !== "ended"
      && campaign.status !== "canceled",
  );
  const campaignStatus = campaign ? songBountyLifecycleStatus(campaign.status) : "empty";
  const canFundCampaign = Boolean(canBrowseBounties && campaignAcceptsTopUp && !thirdPartyBlocked);
  const canCreateObjective = (objective: BountyObjective) => Boolean(
    canBrowseBounties
      && !campaignOccupiesSlots
      && capabilities?.eligible_activities.includes(objective),
  );
  const bountiesSlots: SongBountySlot[] = (["study", "karaoke"] as const).map((objective) => {
    if (campaignOccupiesSlots && campaign && campaign.eligible_activity === objective) {
      return {
        canCreate: false,
        canFund: canFundCampaign,
        objective,
        remainingLabel: formatUsdCentsLabel(campaign.remaining_cents) ?? undefined,
        rewardLabel: campaignRewardLabel(campaign),
        status: campaignStatus,
      } satisfies SongBountySlot;
    }
    const canCreate = canCreateObjective(objective);
    const actionDisabledReason = campaignOccupiesSlots && campaign
      ? `A ${campaign.eligible_activity === "either" ? "Study or Karaoke" : campaign.eligible_activity} bounty already occupies this song. A separate ${objective} bounty is not available yet.`
      : !canCreate
        ? `${objective[0].toUpperCase()}${objective.slice(1)} bounties are not eligible for this song right now.`
        : undefined;
    return {
      actionDisabledReason,
      canCreate,
      canFund: false,
      objective,
      status: "empty" as const,
    } satisfies SongBountySlot;
  });
  const legacyEither: LegacyEitherBounty | undefined = campaignOccupiesSlots
    && campaign?.eligible_activity === "either"
    ? {
        remainingLabel: formatUsdCentsLabel(campaign.remaining_cents) ?? undefined,
        rewardLabel: campaignRewardLabel(campaign),
        status: campaignStatus === "empty" ? "active" : campaignStatus,
      }
    : undefined;
  const bountiesCapabilities: SongBountiesSheetProps["capabilities"] = {
    canCreate: canBrowseBounties && !campaignOccupiesSlots,
    canFund: canFundCampaign,
    reason: !campaignResolved
      ? "Loading bounties…"
      : !capabilities
        ? "Bounty funding is unavailable right now."
        : thirdPartyBlocked
          ? "The song owner is not accepting bounties from other people."
          : undefined,
  };
  const onBountySlotAction = React.useCallback((objective: BountyObjective | "either", action: "create" | "fund" | "view") => {
    if (action === "view") return;
    if (objective !== "either" && action === "create") {
      setEligibleActivity(objective);
    }
    setBountiesOpen(false);
    openBoost();
  }, [openBoost]);
  const bountiesSheetProps: SongBountiesSheetProps = {
    capabilities: bountiesCapabilities,
    legacyEither,
    onOpenChange: setBountiesOpen,
    onSlotAction: onBountySlotAction,
    open: bountiesOpen,
    showTicketPool: false,
    slots: bountiesSlots,
  };
  const availabilityProblem = hasCampaignConflict
      ? campaignContributionProblem(campaign)
    : thirdPartyBlocked
      ? "The song owner is not accepting bounties from other people."
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
    bountiesSheetProps,
    openBounties,
    openBoost,
    openPolicy: () => setPolicyOpen(true),
    policySheetProps: {
      allowThirdPartyRewards: policyAllowed,
      busy: policyWorkflow.status === "updating",
      errorMessage: policyWorkflow.status === "failed" ? policyWorkflow.message : undefined,
      onAllowThirdPartyRewardsChange: (allowed: boolean) => void updatePolicy(allowed),
      onOpenChange: setPolicyOpen,
      open: policyOpen,
    },
    sheetProps: {
      busy,
      canRestartFunding: terminalCode === "funding_failed",
      budgetDisplayLabel: formatUsdCentsLabel(plan?.budgetCents ?? 0) ?? "$0.00",
      budgetLabel: budgetInput,
      budgetPresets: sheetState === "top_up"
        ? ["$10.00", "$25.00", "$50.00"]
        : ["$5.00", "$10.00", "$25.00"],
      completionRangeLabel,
      dailyRewardLabel: dailyRewardInput,
      dailyRewardDisplayLabel: plan?.dailyRewardCents != null
        ? formatUsdCentsLabel(plan.dailyRewardCents) ?? undefined
        : undefined,
      eligibleActivity: authoritativeEligibleActivity,
      eligibleActivities: capabilities?.eligible_activities,
      identityProvider,
      identityProviderChoices: campaign ? [] : identityProviderChoices,
      endsAtLabel: campaign
        ? new Intl.DateTimeFormat("en-US", { day: "numeric", month: "short" }).format(new Date(campaign.ends_at * 1_000))
        : undefined,
      errorMessage,
      explorerTxUrl: (transactionHash ?? campaignFundingTxHash(campaign))
        ? `${explorerBase}/tx/${transactionHash ?? campaignFundingTxHash(campaign)}`
        : undefined,
      fundingAmountLabel: quote ? formatUsdCentsLabel(quote.amount_cents) ?? undefined : undefined,
      fundedLabel: campaign ? formatUsdCentsLabel(campaign.funded_cents) ?? undefined : undefined,
      onBudgetChange: setBudgetInput,
      ...(tiersPreviewAvailable ? {
        nationalityPricingEnabled,
        payoutTiers,
        onNationalityPricingEnabledChange: (enabled: boolean) => {
          setNationalityPricingEnabled(enabled);
          setReviewAttempted(false);
        },
        onAddPayoutTier: () => setPayoutTiers((tiers) => [
          ...tiers,
          { id: boostIdempotencyKey("payout_tier"), nationalities: [], amountLabel: "" },
        ]),
        onRemovePayoutTier: (tierId: string) => setPayoutTiers((tiers) => tiers.filter((tier) => tier.id !== tierId)),
        onPayoutTierNationalitiesChange: (tierId: string, nationalities: string[]) => setPayoutTiers((tiers) => tiers.map(
          (tier) => tier.id === tierId ? { ...tier, nationalities } : tier,
        )),
        onPayoutTierAmountChange: (tierId: string, amountLabel: string) => setPayoutTiers((tiers) => tiers.map(
          (tier) => tier.id === tierId ? { ...tier, amountLabel } : tier,
        )),
        maxClaimDisplayLabel: plan?.maxClaimCents != null
          ? formatUsdCentsLabel(plan.maxClaimCents) ?? undefined
          : undefined,
      } : {}),
      onConfirm: handleConfirm,
      onConnectWallet: reconnectEthereumWallet ?? undefined,
      onDailyRewardChange: setDailyRewardInput,
      onEligibleActivityChange: setEligibleActivity,
      onIdentityProviderChange: setIdentityProvider,
      onOpenChange: setSheetOpen,
      onRefresh: () => {
        if (sheetState === "funding-review") return;
        if (campaign && quote && transactionHash) {
          void confirmSubmittedFunding(campaign, quote, transactionHash);
          return;
        }
        if (campaign) {
          void refreshCampaign(campaign.id).catch(() => {
            dispatchFundingWorkflow({ type: "awaiting-finality" });
          });
        }
      },
      onRetry: () => {
        if (sheetState === "funding-review" && terminalCode === "funding_failed") {
          if (input.communityId) {
            globalThis.localStorage?.removeItem(terminalFundingStorageKey(input.communityId, input.postId));
          }
          setQuote(null);
          dispatchFundingWorkflow({ type: "restart" });
          void createQuote(campaign);
          return;
        }
        if (sheetState === "funding-review") return;
        if (campaign && quote && transactionHash) {
          void confirmSubmittedFunding(campaign, quote, transactionHash);
          return;
        }
        void createQuote(campaign);
      },
      open: sheetOpen,
      planProblem: availabilityProblem ?? (activityUnavailable
        ? "This bounty activity is unavailable right now."
        : reviewAttempted && nationalityPricingEnabled && payoutTiers.length === 0
          ? "Add at least one country amount."
        : !capabilities
        ? "Bounty funding is unavailable right now."
        : plan?.problem
          ? boostPlanProblemLabel(plan.problem, limits!)
          : undefined),
      rewardCountLabel: boostRewardCountLabel(rewardCount),
      rewardsPaidLabel: campaign ? formatUsdCentsLabel(campaign.credited_cents) ?? undefined : undefined,
      remainingLabel: campaign ? formatUsdCentsLabel(campaign.remaining_cents) ?? undefined : undefined,
      retryLabel: transactionHash ? "Check funding" : "Start again",
      state: sheetState,
      supportReference,
      transactionHash: transactionHash ?? campaignFundingTxHash(campaign) ?? undefined,
      walletMismatch,
      walletMismatchReason: connectedWallets.length > 0 ? "different-wallet" : "no-wallet",
    } satisfies BoostCampaignSheetProps,
  };
}
