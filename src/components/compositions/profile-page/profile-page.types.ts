import type { PostCardProps } from "@/components/compositions/post-card/post-card.types";
import type { SongItemData } from "@/components/compositions/song-item/song-item.types";

export type ProfilePageTab = "overview" | "posts" | "comments" | "scrobbles";

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

export interface ProfileCommentItem {
  commentId: string;
  body: string;
  timestampLabel: string;
  communityLabel?: string;
  communityHref?: string;
  postTitle?: string;
  postHref?: string;
  scoreLabel?: string;
}

export interface ProfilePostItem {
  postId: string;
  post: PostCardProps;
}

export type ProfileScrobbleItem = SongItemData & {
  scrobbleId: string;
};

export type ProfileActivityItem =
  | { kind: "post"; id: string; post: ProfilePostItem }
  | { kind: "comment"; id: string; comment: ProfileCommentItem }
  | { kind: "scrobble"; id: string; scrobble: ProfileScrobbleItem };

export interface ProfileData {
  displayName: string;
  handle: string;
  tagline?: string;
  bio?: string;
  avatarSrc?: string;
  bannerSrc?: string;
  meta?: ProfileHeaderMetaItem[];
  viewerContext: "self" | "public";
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
    stats: ProfileSidebarStat[];
    walletAddress?: string;
    verificationItems?: ProfileVerificationItem[];
  };
  overviewItems?: ProfileActivityItem[];
  posts?: ProfilePostItem[];
  comments?: ProfileCommentItem[];
  scrobbles?: ProfileScrobbleItem[];
  defaultTab?: ProfilePageTab;
  className?: string;
  onEditProfile?: () => void;
}
