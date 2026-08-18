import type { JSX } from "@solidjs/web";

import type { PostCardProps } from "../../posts/post-card/types";
import type { WalletHubChainId, WalletHubChainSection } from "../../wallet/wallet-hub.types";

export type ProfilePageTab = "overview" | "posts" | "comments" | "wallet" | "book";

export interface ProfileSidebarStat {
  label: string;
  value: string | number;
  note?: string;
}

interface ProfileVerificationItem {
  label: string;
  value: string;
  note?: string;
}

export interface ProfileWalletAsset {
  assetId: string;
  chainId?: WalletHubChainId;
  label: string;
  name?: string;
  symbol?: string;
  value: string;
  note?: string;
  fiatValue?: string;
}

export interface ProfileCommentItem {
  commentId: string;
  authorLabel: string;
  authorHref?: string;
  authorAvatarSeed?: string;
  authorAvatarSrc?: string;
  body: string;
  timestampLabel: string;
  communityLabel?: string;
  communityHref?: string;
  postTitle?: string;
  postHref?: string;
  scoreLabel?: string;
  viewerVote?: "up" | "down" | null;
  onVote?: (direction: "up" | "down") => void;
  bodyDir?: "ltr" | "rtl" | "auto";
  bodyLang?: string;
}

export interface ProfilePostItem {
  postId: string;
  post: PostCardProps;
}

export type ProfileActivityItem =
  | { kind: "post"; id: string; post: ProfilePostItem }
  | { kind: "comment"; id: string; comment: ProfileCommentItem };

export interface ProfileData {
  displayName: string;
  handle: string;
  tagline?: string;
  bio?: string;
  avatarSeed?: string;
  avatarSrc?: string;
  nationalityBadgeCountryCode?: string | null;
  nationalityBadgeLabel?: string;
  bannerSrc?: string;
  meta?: Array<{ label: string; value: string }>;
  viewerContext: "self" | "public";
  bookingCtaLabel?: string;
  isBookable?: boolean;
  viewerFollows?: boolean;
  canMessage?: boolean;
  followBusy?: boolean;
  followDisabled?: boolean;
  followLoading?: boolean;
  followUnavailable?: boolean;
  onToggleFollow?: () => void;
}

export interface ProfilePageRightRail {
  description?: string;
  stats: ProfileSidebarStat[];
  walletAddress?: string;
  walletAssets?: ProfileWalletAsset[];
  walletChainSections?: WalletHubChainSection[];
  verificationItems?: ProfileVerificationItem[];
}

export interface ProfilePageProps {
  profile: ProfileData;
  rightRail: ProfilePageRightRail;
  overviewItems?: ProfileActivityItem[];
  posts?: ProfilePostItem[];
  comments?: ProfileCommentItem[];
  activityError?: string | null;
  activityLoading?: boolean;
  defaultTab?: ProfilePageTab;
  class?: string;
  onActivityTabChange?: (tab: Extract<ProfilePageTab, "overview" | "posts" | "comments">) => void;
  onEditProfile?: () => void;
  onMessageProfile?: () => void;
  onBookingCta?: () => void;
  onCommunitiesCta?: () => void;
  bookPanel?: JSX.Element;
}
