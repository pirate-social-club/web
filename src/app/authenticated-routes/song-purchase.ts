"use client";

import * as React from "react";
import type {
  CommunityListing as ApiCommunityListing,
  CommunityPurchaseQuotePreflight,
  CommunityPurchaseQuote,
  CommunityPurchaseSettlement,
} from "@pirate/api-contracts";

import { useApi } from "@/lib/api";
import type { ApiClient } from "@/lib/api/client";
import { useSession } from "@/lib/api/session-store";
import { usePiratePrivyWallets } from "@/lib/auth/privy-provider";
import type { PirateConnectedEvmWallet } from "@/lib/auth/privy-wallet";
import { DEFAULT_STORY_CHECKOUT_ROUTE, executeRoutedStoryCheckout, findConnectedFundingWallet } from "@/lib/commerce/routed-checkout";
import { getErrorMessage } from "@/lib/error-utils";
import { toast } from "@/components/primitives/sonner";
import { SongPurchaseModal } from "@/components/compositions/song-purchase-modal/song-purchase-modal";
import { SelfVerificationModal } from "@/components/compositions/self-verification-modal/self-verification-modal";
import { formatUsdLabel } from "@/lib/formatting/currency";
import { useSelfVerification } from "@/lib/verification/use-self-verification";
import { useUiLocale } from "@/lib/ui-locale";

type CommunitiesApi = Pick<
  ApiClient["communities"],
  "createPurchaseQuote" | "failPurchase" | "settlePurchase"
>;

export type SongPurchaseSuccessMessage = (params: {
  settlement: CommunityPurchaseSettlement;
  titleText: string;
}) => string;

export async function executeSongPurchase(params: {
  communities: CommunitiesApi;
  communityId: string;
  connectedWallets: PirateConnectedEvmWallet[];
  listing: ApiCommunityListing;
  onError: (message: string) => void;
  onSuccess: (message: string) => void;
  primaryWalletAddress?: string | null;
  refreshSongCommerce: () => Promise<void> | void;
  settlementWalletAttachmentId?: string | null;
  successMessage: SongPurchaseSuccessMessage;
  titleText: string;
}) {
  if (!params.settlementWalletAttachmentId) {
    params.onError("Connect a primary wallet before buying this song.");
    return;
  }

  let quoteId: string | null = null;
  let fundingTxRef: string | null = null;
  try {
    const fundingWallet = findConnectedFundingWallet({
      connectedWallets: params.connectedWallets,
      primaryWalletAddress: params.primaryWalletAddress,
    });
    if (!fundingWallet) {
      params.onError("Connect your primary wallet before buying this song.");
      return;
    }

    const quote = await params.communities.createPurchaseQuote(params.communityId, {
      listing_id: params.listing.listing_id,
      ...DEFAULT_STORY_CHECKOUT_ROUTE,
    });
    quoteId = quote.quote_id;
    fundingTxRef = await executeRoutedStoryCheckout({
      quote,
      wallet: fundingWallet,
    });
    const settlement = await params.communities.settlePurchase(params.communityId, {
      quote_id: quote.quote_id,
      settlement_wallet_attachment_id: params.settlementWalletAttachmentId,
      funding_tx_ref: fundingTxRef,
      settlement_tx_ref: fundingTxRef,
    });
    await params.refreshSongCommerce();
    params.onSuccess(params.successMessage({ settlement, titleText: params.titleText }));
  } catch (error) {
    if (quoteId && !fundingTxRef) {
      void params.communities.failPurchase(params.communityId, { quote_id: quoteId }).catch(() => undefined);
    }
    params.onError(getErrorMessage(error, "Could not unlock this song."));
  }
}

export function useSongPurchase({
  commerceEnabled,
  refreshSongCommerce,
}: {
  commerceEnabled: boolean;
  refreshSongCommerce: () => Promise<void> | void;
}) {
  const api = useApi();
  const session = useSession();
  const { connectedWallets } = usePiratePrivyWallets({ enabled: commerceEnabled });

  return React.useCallback((params: {
    communityId: string;
    listing: ApiCommunityListing;
    successMessage: SongPurchaseSuccessMessage;
    titleText: string;
  }) => executeSongPurchase({
    communities: api.communities,
    communityId: params.communityId,
    connectedWallets,
    listing: params.listing,
    onError: toast.error,
    onSuccess: toast.success,
    primaryWalletAddress: session?.profile.primary_wallet_address,
    refreshSongCommerce,
    settlementWalletAttachmentId: session?.user.primary_wallet_attachment_id,
    successMessage: params.successMessage,
    titleText: params.titleText,
  }), [
    api.communities,
    connectedWallets,
    refreshSongCommerce,
    session?.profile.primary_wallet_address,
    session?.user.primary_wallet_attachment_id,
  ]);
}

type PendingSongPurchase = {
  communityId: string;
  listing: ApiCommunityListing;
  successMessage: SongPurchaseSuccessMessage;
  titleText: string;
};

type QuotedSongPurchase = PendingSongPurchase & {
  maxSelfDiscountPercent: number | null;
  quote: CommunityPurchaseQuote;
};

export function resolveQuoteDiscountPercent(quote: Pick<CommunityPurchaseQuote, "base_price_usd" | "final_price_usd">): number | null {
  if (
    typeof quote.base_price_usd !== "number"
    || typeof quote.final_price_usd !== "number"
    || !Number.isFinite(quote.base_price_usd)
    || !Number.isFinite(quote.final_price_usd)
    || quote.base_price_usd <= 0
    || quote.final_price_usd >= quote.base_price_usd
  ) {
    return null;
  }

  const discountPercent = ((quote.base_price_usd - quote.final_price_usd) / quote.base_price_usd) * 100;
  return Math.round(discountPercent * 10) / 10;
}

export function useSongPurchaseFlow({
  commerceEnabled,
  refreshSongCommerce,
}: {
  commerceEnabled: boolean;
  refreshSongCommerce: () => Promise<void> | void;
}) {
  const api = useApi();
  const session = useSession();
  const { locale } = useUiLocale();
  const { connectedWallets } = usePiratePrivyWallets({ enabled: commerceEnabled });
  const [pendingPurchase, setPendingPurchase] = React.useState<QuotedSongPurchase | null>(null);
  const [purchaseError, setPurchaseError] = React.useState<string | null>(null);
  const [purchaseProcessing, setPurchaseProcessing] = React.useState(false);

  const createPreflight = React.useCallback(async (params: PendingSongPurchase): Promise<CommunityPurchaseQuotePreflight | null> => {
    try {
      return await api.communities.preflightPurchaseQuote(params.communityId, {
        listing_id: params.listing.listing_id,
        ...DEFAULT_STORY_CHECKOUT_ROUTE,
      });
    } catch {
      return null;
    }
  }, [api.communities]);

  const createQuote = React.useCallback(async (params: PendingSongPurchase): Promise<CommunityPurchaseQuote> => {
    return await api.communities.createPurchaseQuote(params.communityId, {
      listing_id: params.listing.listing_id,
      ...DEFAULT_STORY_CHECKOUT_ROUTE,
    });
  }, [api.communities]);

  const refreshPendingQuoteAfterVerification = React.useCallback(async () => {
    if (!pendingPurchase || purchaseProcessing) return;

    try {
      await api.communities.failPurchase(pendingPurchase.communityId, { quote_id: pendingPurchase.quote.quote_id });
      const quote = await createQuote(pendingPurchase);
      setPendingPurchase({ ...pendingPurchase, quote });
      setPurchaseError(null);
    } catch (error) {
      const message = getErrorMessage(error, "Could not refresh the discounted quote.");
      setPurchaseError(message);
      toast.error(message);
    }
  }, [api.communities, createQuote, pendingPurchase, purchaseProcessing]);

  const {
    handleModalOpenChange: handleSelfModalOpenChange,
    selfError,
    selfModalOpen,
    selfPrompt,
    startVerification,
  } = useSelfVerification({
    completeErrorMessage: "Could not complete Self.xyz verification.",
    locale,
    onVerified: refreshPendingQuoteAfterVerification,
    startErrorMessage: "Could not start Self.xyz verification.",
    storageKey: "pirate:song-purchase-self-verification",
    verificationIntent: "commerce_pricing",
  });

  const startSelfPricingVerification = React.useCallback(() => {
    void startVerification({
      requestedCapabilities: ["nationality"],
      unavailableMessage: "Self.xyz pricing verification is not available.",
    });
  }, [startVerification]);

  const closePurchaseModal = React.useCallback((open: boolean) => {
    if (open) return;
    if (purchaseProcessing) return;
    const quoteToFail = pendingPurchase;
    setPendingPurchase(null);
    setPurchaseError(null);
    if (quoteToFail) {
      void api.communities.failPurchase(quoteToFail.communityId, { quote_id: quoteToFail.quote.quote_id }).catch(() => undefined);
    }
  }, [api.communities, pendingPurchase, purchaseProcessing]);

  const buySong = React.useCallback(async (params: PendingSongPurchase) => {
    setPurchaseError(null);

    if (!session?.user.primary_wallet_attachment_id) {
      toast.error("Connect a primary wallet before buying this song.");
      return;
    }

    const fundingWallet = findConnectedFundingWallet({
      connectedWallets,
      primaryWalletAddress: session?.profile.primary_wallet_address,
    });
    if (!fundingWallet) {
      toast.error("Connect your primary wallet before buying this song.");
      return;
    }

    try {
      const [preflight, quote] = await Promise.all([
        createPreflight(params),
        createQuote(params),
      ]);
      setPendingPurchase({
        ...params,
        maxSelfDiscountPercent: preflight?.max_self_discount_percent ?? null,
        quote,
      });
    } catch (error) {
      toast.error(getErrorMessage(error, "Could not prepare this purchase."));
    }
  }, [
    connectedWallets,
    createPreflight,
    createQuote,
    session?.profile.primary_wallet_address,
    session?.user.primary_wallet_attachment_id,
  ]);

  const confirmPurchase = React.useCallback(async () => {
    if (!pendingPurchase || purchaseProcessing) return;

    if (!session?.user.primary_wallet_attachment_id) {
      setPurchaseError("Connect a primary wallet before buying this song.");
      return;
    }

    const fundingWallet = findConnectedFundingWallet({
      connectedWallets,
      primaryWalletAddress: session?.profile.primary_wallet_address,
    });
    if (!fundingWallet) {
      setPurchaseError("Connect your primary wallet before buying this song.");
      return;
    }

    setPurchaseProcessing(true);
    setPurchaseError(null);
    let fundingTxRef: string | null = null;
    try {
      fundingTxRef = await executeRoutedStoryCheckout({
        quote: pendingPurchase.quote,
        wallet: fundingWallet,
      });
      const settlement = await api.communities.settlePurchase(pendingPurchase.communityId, {
        quote_id: pendingPurchase.quote.quote_id,
        settlement_wallet_attachment_id: session.user.primary_wallet_attachment_id,
        funding_tx_ref: fundingTxRef,
        settlement_tx_ref: fundingTxRef,
      });
      await refreshSongCommerce();
      toast.success(pendingPurchase.successMessage({ settlement, titleText: pendingPurchase.titleText }));
      setPendingPurchase(null);
    } catch (error) {
      if (!fundingTxRef) {
        void api.communities.failPurchase(pendingPurchase.communityId, { quote_id: pendingPurchase.quote.quote_id }).catch(() => undefined);
        setPendingPurchase(null);
      }
      const message = getErrorMessage(error, "Could not unlock this song.");
      setPurchaseError(message);
      toast.error(message);
    } finally {
      setPurchaseProcessing(false);
    }
  }, [
    api.communities,
    connectedWallets,
    pendingPurchase,
    purchaseProcessing,
    refreshSongCommerce,
    session?.profile.primary_wallet_address,
    session?.user.primary_wallet_attachment_id,
  ]);

  const quoteDiscountPercent = pendingPurchase ? resolveQuoteDiscountPercent(pendingPurchase.quote) : null;
  const shouldOfferSelfVerification = !quoteDiscountPercent && (pendingPurchase?.maxSelfDiscountPercent ?? 0) > 0;

  const purchaseModal = pendingPurchase
    ? React.createElement(React.Fragment, null,
      React.createElement(SongPurchaseModal, {
        confirmedDiscountPercent: quoteDiscountPercent,
        error: purchaseError,
        fundingAssetLabel: DEFAULT_STORY_CHECKOUT_ROUTE.funding_asset?.display_name ?? "USDC",
        onConfirm: confirmPurchase,
        onOpenChange: closePurchaseModal,
        onSelfVerificationClick: shouldOfferSelfVerification ? startSelfPricingVerification : undefined,
        open: true,
        priceLabel: formatUsdLabel(pendingPurchase.quote.final_price_usd) ?? "$0.00",
        processing: purchaseProcessing,
        selfVerificationSavingsPercent: shouldOfferSelfVerification ? pendingPurchase.maxSelfDiscountPercent : null,
        songTitle: pendingPurchase.titleText,
      }),
      selfPrompt
        ? React.createElement(SelfVerificationModal, {
          actionLabel: selfPrompt.actionLabel,
          description: selfPrompt.description,
          error: selfError,
          href: selfPrompt.href,
          onOpenChange: handleSelfModalOpenChange,
          open: selfModalOpen,
          title: selfPrompt.title,
        })
        : null)
    : null;

  return { buySong, purchaseModal };
}
