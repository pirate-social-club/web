import type { PostCardProps } from "@/components/compositions/posts/post-card/post-card.types";
import type { WalletHubChainId, WalletHubChainSection } from "@/components/compositions/wallet/wallet-hub/wallet-hub.types";

export type ProfilePageTab = "overview" | "posts" | "comments" | "wallet";

export interface ProfileHeaderMetaItem {
  label: string;
  value: string;
}

export interface ProfileSidebarStat {
  label: string;
  value: string | number;
  note?: string;
}

export interface ProfileVerificationItem {
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
  meta?: ProfileHeaderMetaItem[];
  viewerContext: "self" | "public";
  /** Label for the self-only booking CTA (e.g. "Set up bookings" / "Manage bookings"); omit to hide. */
  bookingCtaLabel?: string;
  viewerFollows?: boolean;
  canMessage?: boolean;
  followBusy?: boolean;
  followDisabled?: boolean;
  followLoading?: boolean;
  onToggleFollow?: () => void;
}

export interface ProfilePageProps {
  profile: ProfileData;
  rightRail: {
    description?: string;
    stats: ProfileSidebarStat[];
    walletAddress?: string;
    walletAssets?: ProfileWalletAsset[];
    walletChainSections?: WalletHubChainSection[];
    verificationItems?: ProfileVerificationItem[];
  };
  overviewItems?: ProfileActivityItem[];
  posts?: ProfilePostItem[];
  comments?: ProfileCommentItem[];
  defaultTab?: ProfilePageTab;
  className?: string;
  onEditProfile?: () => void;
  onMessageProfile?: () => void;
  /** Invoked by the self-only booking CTA (navigates to /settings/bookings). */
  onBookingCta?: () => void;
}
