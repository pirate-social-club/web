import type {
  Asset as ApiAsset,
  CommunityListing as ApiCommunityListing,
  CommunityPurchase as ApiCommunityPurchase,
} from "@pirate/api-contracts";

import type {
  LiveRoomContentSpec,
  LiveRoomParticipant,
  PostCardProps,
} from "@/components/compositions/posts/post-card/post-card.types";
import type { ApiLiveRoomAccessResponse, ApiLiveRoomViewerAttachResponse } from "@/lib/api/client-api-types";
import type { SongPlaybackController } from "@/app/authenticated-helpers/song-commerce";
import type { PirateStoryNetwork } from "@/lib/network-config";

export type SongPresentationOptions = {
  asset?: ApiAsset | null;
  currentUserId?: string | null;
  listing?: ApiCommunityListing;
  localeTag?: string;
  purchase?: ApiCommunityPurchase;
  playback?: SongPlaybackController;
  storyLicenseNotice?: Extract<PostCardProps["content"], { type: "song" }>["storyLicenseNotice"];
  storyNetwork?: PirateStoryNetwork | null;
  onBuy?: () => void;
  onKaraoke?: () => void;
  onStudy?: () => void;
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
  participants?: LiveRoomParticipant[];
  viewerAttachResponse?: ApiLiveRoomViewerAttachResponse | null;
  onAcceptGuestInvite?: () => void;
  onBuy?: () => void;
  onReviewReplay?: () => void;
  onWatch?: () => void;
  onViewerRenew?: (uid: number) => Promise<ApiLiveRoomViewerAttachResponse | null>;
};

export type PostPresentationOptions = {
  commentCountOverride?: number;
  liveRoom?: LiveRoomPresentationOptions;
  onVerifyAge?: () => void;
  onVote?: PostCardProps["onVote"];
  onComment?: PostCardProps["onComment"];
  onDelete?: () => void;
  onRemove?: () => void;
  onCancelEvent?: () => void;
  postHref?: string;
  canModeratePost?: boolean;
  preferOriginalText?: boolean;
  showOriginalLabel?: string;
  showTranslationLabel?: string;
  viewerContentLocale?: string;
};
