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
import type {
  HandleAvailability,
  HandleClaimPhase,
  HandlePaymentInstructions,
  HandleSearchResult,
} from "@/components/compositions/community/handle-claim-modal/handle-claim-modal.types";

type CommunityHandleApi = Pick<ApiClient["communities"], "claimHandle" | "quoteHandle">;

type ExecuteHandleCheckout = (params: {
  paymentInstructions: CommunityHandlePaymentInstructions;
  wallet: PirateConnectedEvmWallet;
}) => Promise<Hex>;

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

export function buildHandleClaimGateActions(
  summaries: MembershipGateSummary[] | null | undefined,
): Array<"self" | "wallet"> {
  const actions = new Set<"self" | "wallet">();
  for (const summary of summaries ?? []) {
    if (summary.accepted_providers?.includes("self")) actions.add("self");
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
  const executeCheckout = input.executeCheckout ?? executeHandleUsdcCheckout;
  const debounceMs = input.debounceMs ?? DEFAULT_QUOTE_DEBOUNCE_MS;

  React.useEffect(() => {
    sequenceRef.current += 1;
    setQuote(null);
    setSearchResult(undefined);
    setClaimedHandle(null);
    setError(null);
    setPhase((current) => current === "intro" ? "intro" : "search");
  }, [input.namespaceVerificationId]);

  const onSearchChange = React.useCallback((value: string) => {
    setSearchValue(value);
    setQuote(null);
    setSearchResult(undefined);
    setClaimedHandle(null);
    setError(null);
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
      };
      void input.api.quoteHandle(input.communityId, body).then((nextQuote) => {
        if (sequence !== sequenceRef.current) return;
        setQuote(nextQuote);
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

  const onClaim = React.useCallback(async () => {
    if (!quote || !quote.eligible || quote.availability !== "available" || phase === "processing") {
      return;
    }

    setPhase("processing");
    setError(null);
    let fundingTxRef: Hex | null = null;
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
        fundingTxRef = await executeCheckout({
          paymentInstructions: quote.payment_instructions,
          wallet: fundingWallet,
        });
      }

      const handle = await input.api.claimHandle(input.communityId, {
        quote: quote.id,
        ...(input.settlementWalletAttachmentId && fundingTxRef
          ? { settlement_wallet_attachment: input.settlementWalletAttachmentId }
          : {}),
        ...(fundingTxRef ? { funding_tx_ref: fundingTxRef, settlement_tx_ref: fundingTxRef } : {}),
      });
      setClaimedHandle(handle);
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
