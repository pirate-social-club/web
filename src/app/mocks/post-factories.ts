import { toast } from "@/components/primitives/sonner";
import type {
  ProfileCommentItem,
  ProfileScrobbleItem,
} from "@/components/compositions/profiles/profile-page/profile-page.types";
import type { PostCardProps } from "@/components/compositions/posts/post-card/post-card.types";

import type { RoutePost } from "./types";

function createPostFrame({
  authorLabel,
  authorUserId,
  avatarSeed,
  comments,
  communityId,
  communityLabel,
  postId,
  score,
  timestampLabel,
  title,
  viewContext,
}: {
  authorLabel: string;
  authorUserId: string;
  avatarSeed: number;
  comments: number;
  communityId: string;
  communityLabel: string;
  postId: string;
  score: number;
  timestampLabel: string;
  title?: string;
  viewContext: PostCardProps["viewContext"];
}) {
  return {
    byline: {
      community: {
        kind: "community" as const,
        label: communityLabel,
        href: `/c/${communityId}`,
      },
      author: {
        kind: "user" as const,
        label: authorLabel,
        href: `/u/${authorUserId}`,
        avatarSrc: `https://i.pravatar.cc/100?img=${avatarSeed}`,
      },
      timestampLabel,
    },
    engagement: { score, commentCount: comments },
    menuItems: [
      { key: "save", label: "Save post" },
      { key: "hide", label: "Hide post" },
      { key: "report", label: "Report", destructive: true },
    ],
    postHref: `/p/${postId}`,
    postId,
    ...(title ? {
      title,
      titleHref: `/p/${postId}`,
    } : {}),
    viewContext,
  };
}

export function createTextPost({
  body,
  ...frame
}: {
  authorLabel: string;
  authorUserId: string;
  avatarSeed: number;
  body: string;
  comments: number;
  communityId: string;
  communityLabel: string;
  postId: string;
  score: number;
  timestampLabel: string;
  title: string;
  viewContext: PostCardProps["viewContext"];
}): RoutePost {
  return {
    ...createPostFrame(frame),
    content: { type: "text", body },
  };
}

export function createImagePost({
  alt,
  imageSeed,
  ...frame
}: {
  alt: string;
  authorLabel: string;
  authorUserId: string;
  avatarSeed: number;
  comments: number;
  communityId: string;
  communityLabel: string;
  imageSeed: string;
  postId: string;
  score: number;
  timestampLabel: string;
  title: string;
  viewContext: PostCardProps["viewContext"];
}): RoutePost {
  return {
    ...createPostFrame(frame),
    content: {
      type: "image",
      src: `https://picsum.photos/seed/${imageSeed}/960/640`,
      alt,
      caption: "Mock asset preview",
    },
  };
}

export function createVideoPost(frame: {
  authorLabel: string;
  authorUserId: string;
  avatarSeed: number;
  comments: number;
  communityId: string;
  communityLabel: string;
  postId: string;
  score: number;
  timestampLabel: string;
  title: string;
  viewContext: PostCardProps["viewContext"];
}): RoutePost {
  return {
    ...createPostFrame(frame),
    content: {
      type: "video",
      src: "https://www.w3schools.com/html/mov_bbb.mp4",
      posterSrc: "https://picsum.photos/seed/pirate-video/960/640",
      durationLabel: "4:32",
      accessMode: "public",
    },
  };
}

export function createSongPost(frame: {
  authorLabel: string;
  authorUserId: string;
  avatarSeed: number;
  comments: number;
  communityId: string;
  communityLabel: string;
  postId: string;
  score: number;
  timestampLabel: string;
  title: string;
  viewContext: PostCardProps["viewContext"];
}): RoutePost {
  return {
    ...createPostFrame(frame),
    content: {
      type: "song",
      title: "Midnight in Tokyo",
      artist: frame.authorLabel.replace(/^u\//, ""),
      artworkSrc: "https://picsum.photos/seed/pirate-song/640/640",
      durationLabel: "2:18",
      accessMode: "locked",
      listingMode: "listed",
      listingStatus: "active",
      priceLabel: "$4.99",
      onBuy: () => {
        toast.info("Purchase flow is not wired in the scaffold yet.");
      },
    },
  };
}

export function createLinkPost(frame: {
  authorLabel: string;
  authorUserId: string;
  avatarSeed: number;
  comments: number;
  communityId: string;
  communityLabel: string;
  postId: string;
  score: number;
  timestampLabel: string;
  viewContext: PostCardProps["viewContext"];
}): RoutePost {
  return {
    ...createPostFrame(frame),
    content: {
      type: "link",
      href: "https://blog.pirate.sc/feed-ranking",
      linkLabel: "blog.pirate.sc/feed-ranking",
      previewImageSrc: "https://picsum.photos/seed/pirate-link/240/240",
    },
  };
}

export function createProfileComment(comment: ProfileCommentItem): ProfileCommentItem {
  return comment;
}

export function createProfileScrobble(scrobble: ProfileScrobbleItem): ProfileScrobbleItem {
  return scrobble;
}
