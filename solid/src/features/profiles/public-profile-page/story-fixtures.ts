import { basePostFixture, fixtureImage, noop, shareActionsFixture } from "../../posts/post-card/fixtures";
import type { PostCardProps } from "../../posts/post-card/types";
import type {
  PublicProfilePostItem,
  PublicProfileProps,
  PublicProfileSongItem,
  PublicProfileVideoItem,
} from "./public-profile-page";

type PublicProfileCommunity = NonNullable<PublicProfileProps["communities"]>[number];

const flagUrlForCountryCode = (countryCode: string) => fixtureImage(`flag-${countryCode}`, 64, 64);

const post = (postId: string, title: string, body: string): PublicProfilePostItem => ({
  postId,
  post: {
    ...basePostFixture,
    byline: {
      ...basePostFixture.byline,
      author: { href: "#", kind: "user", label: "u/pampa_of_argentina", avatarSrc: fixtureImage(`author-${postId}`, 100, 100) },
      community: { href: "#", kind: "community", label: "c/argentina", avatarSrc: fixtureImage(`community-${postId}`, 100, 100) },
      timestampLabel: postId === "post-1" ? "28m" : "7h",
    },
    content: { body, type: "text" },
    engagement: { commentCount: postId === "post-1" ? 86 : 41, score: postId === "post-1" ? 1284 : 392 },
    menuItems: [],
    onMenuAction: noop,
    postId,
    shareActions: shareActionsFixture,
    title,
    viewContext: "profile",
  },
});

const videoPost: PostCardProps = {
  ...basePostFixture,
  byline: {
    ...basePostFixture.byline,
    author: { href: "#", kind: "user", label: "u/pampa_of_argentina", avatarSrc: fixtureImage("video-author", 100, 100) },
    community: { href: "#", kind: "community", label: "c/argentina", avatarSrc: fixtureImage("video-community", 100, 100) },
    timestampLabel: "2d",
  },
  content: {
    accessMode: "public",
    durationLabel: "0:48",
    posterSrc: fixtureImage("profile-video-poster", 640, 360),
    src: "data:video/mp4;base64,AAAA",
    type: "video",
  },
  engagement: { commentCount: 58, score: 621 },
  menuItems: [],
  postId: "video-1",
  shareActions: shareActionsFixture,
  title: "Sunday walk through San Telmo",
  viewContext: "profile",
};

const referenceImagePost: PublicProfilePostItem = {
  postId: "post_1",
  post: {
    ...basePostFixture,
    byline: {
      ...basePostFixture.byline,
      author: { href: "#", kind: "user", label: "u/Pampa_of_Argentina", avatarSrc: fixtureImage("author-post-1", 100, 100) },
      community: { href: "#", kind: "community", label: "c/interesting", avatarSrc: fixtureImage("community-post-1", 100, 100) },
      timestampLabel: "28m",
    },
    content: {
      alt: "A rainy Buenos Aires street with classic architecture.",
      src: fixtureImage("buenos-aires-bookstores", 900, 600),
      type: "image",
    },
    engagement: { commentCount: 86, saved: true, score: 1284 },
    menuItems: [
      { key: "save", label: "Save post" },
      { key: "hide", label: "Hide post" },
      { key: "report", label: "Report", destructive: true },
    ],
    onMenuAction: noop,
    postId: "post_1",
    shareActions: shareActionsFixture,
    title: "Buenos Aires holds the world record for bookstores per capita, with approximately 25 bookstores for every 100,000 inhabitants.",
    viewContext: "profile",
  },
};

const publicProfilePosts: PublicProfilePostItem[] = [
  referenceImagePost,
  post("post-2", "April listening report from the southern cone", "This month has been all Charly, Sumo, and a lot more post-punk than usual."),
];

const publicProfileSongs: PublicProfileSongItem[] = [
  {
    artistName: "Soda Stereo",
    artworkSrc: fixtureImage("cancion-animal", 240, 240),
    metaItems: [{ href: "#", label: "c/argentina" }, { label: "418 plays" }],
    songId: "song-1",
    title: "Cancion Animal",
  },
  {
    artistName: "Seru Giran",
    artworkSrc: fixtureImage("viernes-3-am", 240, 240),
    metaItems: [{ href: "#", label: "c/classicrock" }, { label: "302 plays" }],
    songId: "song-2",
    title: "Viernes 3 AM",
  },
];

const publicProfileVideos: PublicProfileVideoItem[] = [{ post: videoPost, videoId: "video-1" }];

const publicProfileCommunities: PublicProfileCommunity[] = [
  { href: "#", label: "c/argentina" },
  { href: "#", label: "c/lastfm" },
  { href: "#", label: "c/interesting" },
  { href: "#", label: "c/pirate-build" },
];

export const publicProfileStoryProps: PublicProfileProps = {
  avatarSrc: fixtureImage("pampa-avatar", 160, 160),
  bannerSrc: fixtureImage("pampa-banner", 1200, 400),
  bio: "Buenos Aires, bookstores, football, and a listening history that should probably count as public infrastructure.",
  communities: publicProfileCommunities,
  displayName: "Pampa_of_Argentina",
  flagUrlForCountryCode,
  handle: "u/pampa_of_argentina.pirate",
  meta: [
    { label: "Posts", value: "126" },
    { label: "Comments", value: "894" },
    { label: "Songs", value: "14.8K" },
  ],
  nationalityBadgeCountryCode: "AR",
  nationalityBadgeLabel: "Verified Argentina nationality",
  openInPirateHref: "#",
  posts: publicProfilePosts,
  songs: publicProfileSongs,
  videos: publicProfileVideos,
};
