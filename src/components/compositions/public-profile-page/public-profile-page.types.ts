import type { PostCardProps } from "@/components/compositions/post-card/post-card.types";
import type { SongItemData } from "@/components/compositions/song-item/song-item.types";

export type PublicProfileTab = "posts" | "songs" | "scrobbles" | "videos" | "about";

export interface PublicProfileCommunity {
  label: string;
  href?: string;
}

export interface PublicProfilePostItem {
  postId: string;
  post: PostCardProps;
}

export type PublicProfileScrobbleItem = SongItemData & {
  scrobbleId: string;
};

export type PublicProfileVideoItem = {
  videoId: string;
  post: PostCardProps;
};

export interface PublicProfileProps {
  displayName: string;
  handle: string;
  tagline?: string;
  bio?: string;
  avatarSrc?: string;
  bannerSrc?: string;
  meta?: { label: string; value: string }[];
  communities?: PublicProfileCommunity[];
  posts?: PublicProfilePostItem[];
  songs?: PublicProfileScrobbleItem[];
  scrobbles?: PublicProfileScrobbleItem[];
  videos?: PublicProfileVideoItem[];
  defaultTab?: PublicProfileTab;
  openInPirateHref?: string;
  className?: string;
}
