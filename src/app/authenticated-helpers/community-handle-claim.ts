"use client";

import * as React from "react";
import type {
  CommunityHandle,
  CommunityHandlePaymentInstructions,
  CommunityHandleQuote,
  CommunityHandleQuoteRequest,
  MembershipGateSummary,
} from "@pirate/api-contracts";
import type { Hex } from "viem";

import type { ApiClient } from "@/lib/api/client";
import { ApiError } from "@/lib/api/client";
import type { PirateConnectedEvmWallet } from "@/lib/auth/privy-wallet";
import {
  executeHandleUsdcCheckout,
  findConnectedFundingWallet,
} from "@/lib/commerce/routed-checkout";
import { buildCommunitySidebarRequirements } from "@/lib/community-sidebar-helpers";
import { getErrorMessage } from "@/lib/error-utils";
import { useUiLocale } from "@/lib/ui-locale";
import { getWalletTransactionErrorMessage } from "@/lib/wallet-error-utils";
import { solveAltchaChallengeHeadless } from "@/lib/verification/altcha-headless";
import type {
  HandleAvailability,
  HandleClaimGateAction,
  HandleClaimPhase,
  HandlePaymentInstructions,
  HandleSearchResult,
} from "@/components/compositions/community/handle-claim-modal/handle-claim-modal.types";

type CommunityHandleApi = Pick<ApiClient["communities"], "claimHandle" | "quoteHandle">;

type ExecuteHandleCheckout = (params: {
  paymentInstructions: CommunityHandlePaymentInstructions;
  wallet: PirateConnectedEvmWallet;
}) => Promise<Hex>;

type HandleClaimVerificationOptions = {
  membershipGateSummaries?: MembershipGateSummary[] | null;
  showToastOnError?: boolean;
};

export function useHandleClaimModalActionHandlers(input: {
  claimGateSummaries: MembershipGateSummary[];
  completeProofOfWorkGate: () => void | Promise<void>;
  startGateVerification: (gate: MembershipGateSummary) => unknown;
  startSelfVerification: (options: HandleClaimVerificationOptions) => unknown;
  startVerificationProvider: (
    provider: "self" | "very" | "zkpassport",
    options: HandleClaimVerificationOptions,
  ) => unknown;
}) {
  const membershipGateSummaries = input.claimGateSummaries;
  return React.useMemo(() => ({
    onProofOfWorkClick: () => void input.completeProofOfWorkGate(),
    onSelfVerificationClick: () => void input.startSelfVerification({
      membershipGateSummaries,
      showToastOnError: true,
    }),
    onVerificationProviderClick: (provider: "self" | "very" | "zkpassport") => {
      void input.startVerificationProvider(provider, {
        membershipGateSummaries,
        showToastOnError: true,
      });
    },
    onWalletConnectionClick: () => {
      const gate = membershipGateSummaries.find((summary) =>
        summary.gate_type === "erc721_holding"
        || summary.gate_type === "erc721_inventory_match"
        || summary.gate_type === "asset_balance",
      );
      if (gate) void input.startGateVerification(gate);
    },
  }), [input, membershipGateSummaries]);
}

const DEFAULT_QUOTE_DEBOUNCE_MS = 450;

function mapAvailability(value: CommunityHandleQuote["availability"] | string | null | undefined): HandleAvailability {
  if (
    value === "available" ||
    value === "taken" ||
    value === "reserved" ||
    value === "already_claimed_by_viewer" ||
    value === "viewer_has_claim" ||
    value === "namespace_unavailable"
  ) {
    return value;
  }
  return "unavailable";
}

function mapConflictAvailability(value: unknown): HandleAvailability | null {
  if (
    value === "taken" ||
    value === "reserved" ||
    value === "already_claimed_by_viewer" ||
    value === "viewer_has_claim" ||
    value === "namespace_unavailable"
  ) {
    return value;
  }
  return null;
}

function mapPaymentInstructions(
  instructions: CommunityHandlePaymentInstructions | null | undefined,
): HandlePaymentInstructions | null {
  if (!instructions) return null;
  return {
    chainId: instructions.chain.chain_id ?? 0,
    chainDisplayName: instructions.chain.display_name ?? `EIP-155:${instructions.chain.chain_id ?? "unknown"}`,
    tokenAddress: instructions.token_address,
    recipientAddress: instructions.recipient_address,
    amountAtomic: instructions.amount_atomic,
    amountDisplay: instructions.amount_display,
  };
}

function buildHandleClaimGateActions(
  summaries: MembershipGateSummary[] | null | undefined,
): HandleClaimGateAction[] {
  const actions = new Set<HandleClaimGateAction>();
  for (const summary of summaries ?? []) {
    if (summary.accepted_providers?.includes("self")) actions.add("self");
    if (summary.accepted_providers?.includes("very")) actions.add("very");
    if (summary.accepted_providers?.includes("zkpassport")) actions.add("zkpassport");
    if (summary.gate_type === "altcha_pow") actions.add("pow");
    if (
      summary.gate_type === "erc721_holding"
      || summary.gate_type === "erc721_inventory_match"
      || summary.gate_type === "asset_balance"
    ) actions.add("wallet");
  }
  return [...actions];
}

function mapQuoteToSearchResult(quote: CommunityHandleQuote, locale?: string | null): HandleSearchResult {
  const claimGate = quote.claim_gate;
  return {
    availability: quote.eligible ? mapAvailability(quote.availability) : "unavailable",
    priceCents: quote.price_cents,
    pricingTier: quote.pricing_tier ?? undefined,
    reason: quote.reason ?? undefined,
    paymentInstructions: mapPaymentInstructions(quote.payment_instructions),
    claimGateSatisfied: claimGate ? claimGate.satisfied : undefined,
    claimGateRequirements: claimGate && !claimGate.satisfied
      ? buildCommunitySidebarRequirements({ gateSummaries: claimGate.summaries ?? null, locale })
      : undefined,
    claimGateActions: claimGate && !claimGate.satisfied
      ? buildHandleClaimGateActions(claimGate.summaries)
      : undefined,
  };
}

function conflictDetails(error: unknown): { availability: HandleAvailability; reason: string } | null {
  if (!(error instanceof ApiError) || !error.details) return null;
  const availability = mapConflictAvailability(error.details.availability);
  const reason = error.details.reason;
  if (!availability || typeof reason !== "string") return null;
  return {
    availability,
    reason,
  };
}

function getClaimErrorMessage(error: unknown, fallback: string): string {
  if (error instanceof ApiError && error.code === "funding_confirmation_timeout") {
    return "We could not confirm your payment in time. Try claiming again with the same transaction.";
  }
  return getErrorMessage(error, fallback);
}

export function useCommunityHandleClaimController(input: {
  api: CommunityHandleApi;
  communityId: string;
  namespaceVerificationId?: string | null;
  connectedWallets: PirateConnectedEvmWallet[];
  primaryWalletAddress?: string | null;
  settlementWalletAttachmentId?: string | null;
  debounceMs?: number;
  executeCheckout?: ExecuteHandleCheckout;
  createAltchaChallenge?: ApiClient["verification"]["createAltchaChallenge"];
}) {
  const { locale } = useUiLocale();
  const [phase, setPhase] = React.useState<HandleClaimPhase>("intro");
  const [searchValue, setSearchValue] = React.useState("");
  const [quote, setQuote] = React.useState<CommunityHandleQuote | null>(null);
  const [searchResult, setSearchResult] = React.useState<HandleSearchResult | undefined>();
  const [claimedHandle, setClaimedHandle] = React.useState<CommunityHandle | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const [quoteRefreshKey, setQuoteRefreshKey] = React.useState(0);
  const sequenceRef = React.useRef(0);
  const claimIntentRef = React.useRef<string | null>(null);
  const submittedFundingRef = React.useRef<{
    claimIntent: string | null;
    quoteId: string;
    txRef: Hex;
  } | null>(null);
  const executeCheckout = input.executeCheckout ?? executeHandleUsdcCheckout;
  const debounceMs = input.debounceMs ?? DEFAULT_QUOTE_DEBOUNCE_MS;

  React.useEffect(() => {
    sequenceRef.current += 1;
    setQuote(null);
    setSearchResult(undefined);
    setClaimedHandle(null);
    setError(null);
    claimIntentRef.current = null;
    submittedFundingRef.current = null;
    setPhase((current) => current === "intro" ? "intro" : "search");
  }, [input.namespaceVerificationId]);

  const onSearchChange = React.useCallback((value: string) => {
    setSearchValue(value);
    setQuote(null);
    setSearchResult(undefined);
    setClaimedHandle(null);
    setError(null);
    claimIntentRef.current = null;
    submittedFundingRef.current = null;
    setPhase(value.trim() ? "search" : "intro");
  }, []);

  React.useEffect(() => {
    const desiredLabel = searchValue.trim();
    const sequence = ++sequenceRef.current;
    if (!desiredLabel) {
      return;
    }

    const timeout = window.setTimeout(() => {
      setPhase("quoting");
      const body: CommunityHandleQuoteRequest = {
        desired_label: desiredLabel,
        ...(input.namespaceVerificationId
          ? { namespace_verification: input.namespaceVerificationId }
          : {}),
        ...(claimIntentRef.current ? { claim_intent: claimIntentRef.current } : {}),
      };
      void input.api.quoteHandle(input.communityId, body).then((nextQuote) => {
        if (sequence !== sequenceRef.current) return;
        setQuote(nextQuote);
        claimIntentRef.current = nextQuote.claim_intent ?? null;
        setSearchResult(mapQuoteToSearchResult(nextQuote, locale));
        setError(null);
        setPhase("confirm");
      }).catch((caught) => {
        if (sequence !== sequenceRef.current) return;
        setQuote(null);
        setSearchResult(undefined);
        setError(getErrorMessage(caught, "Could not check this name."));
        setPhase("search");
      });
    }, debounceMs);

    return () => window.clearTimeout(timeout);
  }, [debounceMs, input.api, input.communityId, input.namespaceVerificationId, locale, quoteRefreshKey, searchValue]);

  const refreshQuote = React.useCallback(() => {
    if (!searchValue.trim() || phase === "processing") return;
    setQuoteRefreshKey((current) => current + 1);
  }, [phase, searchValue]);

  const completeProofOfWorkGate = React.useCallback(async () => {
    const intentId = quote?.claim_intent ?? claimIntentRef.current;
    const desiredLabel = searchValue.trim();
    if (!intentId || !desiredLabel || !input.createAltchaChallenge) {
      setError("Could not start the proof-of-work check for this name.");
      return;
    }
    setError(null);
    setPhase("quoting");
    try {
      const payload = await solveAltchaChallengeHeadless({
        action: `handle-claim-intent:${intentId}`,
        loadChallenge: input.createAltchaChallenge,
        scope: "namespace_handle_claim",
      });
      const nextQuote = await input.api.quoteHandle(input.communityId, {
        desired_label: desiredLabel,
        ...(input.namespaceVerificationId
          ? { namespace_verification: input.namespaceVerificationId }
          : {}),
        claim_intent: intentId,
        altcha: payload,
      });
      setQuote(nextQuote);
      claimIntentRef.current = nextQuote.claim_intent ?? intentId;
      setSearchResult(mapQuoteToSearchResult(nextQuote, locale));
      setPhase(nextQuote.eligible ? "confirm" : "search");
    } catch (caught) {
      setError(getErrorMessage(caught, "Could not complete the proof-of-work check."));
      setPhase("search");
    }
  }, [input.api, input.communityId, input.createAltchaChallenge, input.namespaceVerificationId, locale, quote?.claim_intent, searchValue]);

  const onClaim = React.useCallback(async () => {
    if (!quote || !quote.eligible || quote.availability !== "available" || phase === "processing") {
      return;
    }

    setPhase("processing");
    setError(null);
    const reusableFunding = submittedFundingRef.current;
    let fundingTxRef: Hex | null = reusableFunding
      && reusableFunding.quoteId === quote.id
      && reusableFunding.claimIntent === (quote.claim_intent ?? null)
      ? reusableFunding.txRef
      : null;
    try {
      if ((quote.price_cents ?? 0) > 0) {
        if (!quote.payment_instructions) {
          throw new Error("This paid quote is missing payment instructions.");
        }
        if (!input.settlementWalletAttachmentId) {
          throw new Error("Connect a primary wallet before claiming this name.");
        }
        const fundingWallet = findConnectedFundingWallet({
          connectedWallets: input.connectedWallets,
          primaryWalletAddress: input.primaryWalletAddress,
        });
        if (!fundingWallet) {
          throw new Error("Connect your primary wallet before claiming this name.");
        }
        if (!fundingTxRef) {
          fundingTxRef = await executeCheckout({
            paymentInstructions: quote.payment_instructions,
            wallet: fundingWallet,
          });
          submittedFundingRef.current = {
            claimIntent: quote.claim_intent ?? null,
            quoteId: quote.id,
            txRef: fundingTxRef,
          };
        }
      }

      const handle = await input.api.claimHandle(input.communityId, {
        quote: quote.id,
        ...(quote.claim_intent ? { claim_intent: quote.claim_intent } : {}),
        ...(quote.action_authorization ? { action_authorization: quote.action_authorization } : {}),
        ...(input.settlementWalletAttachmentId && fundingTxRef
          ? { settlement_wallet_attachment: input.settlementWalletAttachmentId }
          : {}),
        ...(fundingTxRef ? { funding_tx_ref: fundingTxRef, settlement_tx_ref: fundingTxRef } : {}),
      });
      setClaimedHandle(handle);
      submittedFundingRef.current = null;
      setPhase("success");
    } catch (caught) {
      const details = conflictDetails(caught);
      if (details) {
        setSearchResult((current) => ({
          availability: details.availability,
          priceCents: current?.priceCents ?? quote.price_cents,
          pricingTier: current?.pricingTier,
          reason: details.reason,
          paymentInstructions: current?.paymentInstructions ?? mapPaymentInstructions(quote.payment_instructions),
        }));
      }
      setError(fundingTxRef
        ? getClaimErrorMessage(caught, "Could not claim this name.")
        : getWalletTransactionErrorMessage(caught, "Could not claim this name."));
      setPhase("confirm");
    }
  }, [
    executeCheckout,
    input.api,
    input.communityId,
    input.connectedWallets,
    input.primaryWalletAddress,
    input.settlementWalletAttachmentId,
    phase,
    quote,
  ]);

  return {
    claimedHandle,
    claimedLabel: claimedHandle?.label ?? null,
    claimGateSummaries: quote?.claim_gate?.summaries ?? [],
    completeProofOfWorkGate,
    error,
    onClaim,
    onSearchChange,
    phase,
    processing: phase === "processing",
    quote,
    refreshQuote,
    searchResult,
    searchValue,
  };
}
