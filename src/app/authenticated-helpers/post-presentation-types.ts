import type {
  CommunityListing as ApiCommunityListing,
  CommunityPurchase as ApiCommunityPurchase,
} from "@pirate/api-contracts";

import type {
  LiveRoomContentSpec,
  PostCardProps,
} from "@/components/compositions/posts/post-card/post-card.types";
import type { ApiLiveRoomAccessResponse } from "@/lib/api/client-api-types";
import type { SongPlaybackController } from "@/app/authenticated-helpers/song-commerce";

export type SongPresentationOptions = {
  currentUserId?: string | null;
  listing?: ApiCommunityListing;
  localeTag?: string;
  purchase?: ApiCommunityPurchase;
  playback?: SongPlaybackController;
  onBuy?: () => void;
};

export type LiveRoomPresentationOptions = {
  access?: ApiLiveRoomAccessResponse | null;
  currentUserId?: string | null;
  listing?: ApiCommunityListing;
  localeTag?: string;
  purchase?: ApiCommunityPurchase;
  producerRole?: LiveRoomContentSpec["producerRole"];
  freedomHref?: string;
  freedomDetected?: boolean;
  guestInviteStatus?: "pending" | "accepted" | "revoked" | null;
  onBuy?: () => void;
  onWatch?: () => void;
};

export type PostPresentationOptions = {
  commentCountOverride?: number;
  liveRoom?: LiveRoomPresentationOptions;
  onVerifyAge?: () => void;
  onVote?: PostCardProps["onVote"];
  onComment?: PostCardProps["onComment"];
  onDelete?: () => void;
  onRemove?: () => void;
  canModeratePost?: boolean;
  preferOriginalText?: boolean;
  showOriginalLabel?: string;
  showTranslationLabel?: string;
  viewerContentLocale?: string;
};
