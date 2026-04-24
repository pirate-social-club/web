"use client";

import * as React from "react";
import type {
  CommunityListing as ApiCommunityListing,
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
import { formatUsdLabel } from "@/lib/formatting/currency";

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

export function useSongPurchaseFlow({
  commerceEnabled,
  refreshSongCommerce,
  selfVerificationHref,
  selfVerificationSavingsPercent = null,
  onSelfVerificationClick,
}: {
  commerceEnabled: boolean;
  refreshSongCommerce: () => Promise<void> | void;
  selfVerificationHref?: string | null;
  selfVerificationSavingsPercent?: number | null;
  onSelfVerificationClick?: () => void;
}) {
  const api = useApi();
  const session = useSession();
  const { connectedWallets } = usePiratePrivyWallets({ enabled: commerceEnabled });
  const [pendingPurchase, setPendingPurchase] = React.useState<PendingSongPurchase | null>(null);
  const [purchaseError, setPurchaseError] = React.useState<string | null>(null);
  const [purchaseProcessing, setPurchaseProcessing] = React.useState(false);

  const closePurchaseModal = React.useCallback((open: boolean) => {
    if (open) return;
    if (purchaseProcessing) return;
    setPendingPurchase(null);
    setPurchaseError(null);
  }, [purchaseProcessing]);

  const buySong = React.useCallback((params: PendingSongPurchase) => {
    setPurchaseError(null);
    setPendingPurchase(params);
  }, []);

  const confirmPurchase = React.useCallback(async () => {
    if (!pendingPurchase || purchaseProcessing) return;

    setPurchaseProcessing(true);
    setPurchaseError(null);
    await executeSongPurchase({
      communities: api.communities,
      communityId: pendingPurchase.communityId,
      connectedWallets,
      listing: pendingPurchase.listing,
      onError: (message) => {
        setPurchaseError(message);
        toast.error(message);
      },
      onSuccess: (message) => {
        toast.success(message);
        setPendingPurchase(null);
      },
      primaryWalletAddress: session?.profile.primary_wallet_address,
      refreshSongCommerce,
      settlementWalletAttachmentId: session?.user.primary_wallet_attachment_id,
      successMessage: pendingPurchase.successMessage,
      titleText: pendingPurchase.titleText,
    });
    setPurchaseProcessing(false);
  }, [
    api.communities,
    connectedWallets,
    pendingPurchase,
    purchaseProcessing,
    refreshSongCommerce,
    session?.profile.primary_wallet_address,
    session?.user.primary_wallet_attachment_id,
  ]);

  const purchaseModal = pendingPurchase
    ? React.createElement(SongPurchaseModal, {
      error: purchaseError,
      fundingAssetLabel: DEFAULT_STORY_CHECKOUT_ROUTE.funding_asset?.display_name ?? "USDC",
      onConfirm: confirmPurchase,
      onOpenChange: closePurchaseModal,
      onSelfVerificationClick,
      open: true,
      priceLabel: formatUsdLabel(pendingPurchase.listing.price_usd) ?? "$0.00",
      processing: purchaseProcessing,
      selfVerificationHref,
      selfVerificationSavingsPercent,
      songTitle: pendingPurchase.titleText,
    })
    : null;

  return { buySong, purchaseModal };
}
