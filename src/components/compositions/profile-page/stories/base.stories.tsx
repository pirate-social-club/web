import type { Meta, StoryObj } from "@storybook/react-vite";
import * as React from "react";

import type { PostCardProps } from "@/components/compositions/post-card/post-card.types";
import { ProfilePage } from "../profile-page";
import type {
  ProfileActivityItem,
  ProfileCommentItem,
  ProfilePageProps,
  ProfilePostItem,
  ProfileScrobbleItem,
} from "../profile-page.types";

const profilePosts: ProfilePostItem[] = [
  {
    postId: "post_1",
    post: {
      viewContext: "profile",
      byline: {
        community: { kind: "community", label: "c/interesting", href: "#" },
        author: { kind: "user", label: "u/Pampa_of_Argentina", href: "#" },
        timestampLabel: "28m",
    },
    title:
      "Buenos Aires holds the world record for bookstores per capita, with approximately 25 bookstores for every 100,000 inhabitants.",
    content: {
      type: "image",
      src: "https://images.unsplash.com/photo-1514565131-fce0801e5785?auto=format&fit=crop&w=900&q=80",
      alt: "A rainy Buenos Aires street with classic architecture.",
    },
    engagement: { score: 1284, commentCount: 86, saved: true },
      menuItems: [
        { key: "save", label: "Save post" },
        { key: "hide", label: "Hide post" },
        { key: "report", label: "Report", destructive: true },
      ],
    },
  },
  {
    postId: "post_2",
    post: {
      viewContext: "profile",
      byline: {
        community: { kind: "community", label: "c/lastfm", href: "#" },
        author: { kind: "user", label: "u/Pampa_of_Argentina", href: "#" },
        timestampLabel: "7h",
    },
    title: "April listening report from the southern cone",
      content: {
        type: "text",
        body:
          "This month has been all Charly, Sumo, and a lot more post-punk than usual. I want a profile view that makes scrobbles feel first-class, not bolted on below posts.",
      },
      engagement: { score: 392, commentCount: 41 },
    },
  },
  {
    postId: "post_3",
    post: {
      viewContext: "profile",
      byline: {
        community: { kind: "community", label: "c/argentina", href: "#" },
        author: { kind: "user", label: "u/Pampa_of_Argentina", href: "#" },
        timestampLabel: "2d",
    },
    title: "Sunday walk through San Telmo",
    content: {
      type: "video",
      src: "https://www.w3schools.com/html/mov_bbb.mp4",
      posterSrc: "https://images.unsplash.com/photo-1524499982521-1ffd58dd89ea?auto=format&fit=crop&w=900&q=80",
      durationLabel: "0:48",
      accessMode: "public",
    },
    engagement: { score: 621, commentCount: 58 },
    },
  },
];

const comments: ProfileCommentItem[] = [
  {
    commentId: "comment_1",
    body:
      "The best version of profile comments probably looks like a compact reply feed. You still need the community and the post title, otherwise the comment feels detached from context.",
    communityLabel: "c/pirate-build",
    communityHref: "#",
    postTitle: "What should the profile page surface first?",
    postHref: "#",
    scoreLabel: "148 score",
    timestampLabel: "12m",
  },
  {
    commentId: "comment_2",
    body:
      "If scrobbles matter to Pirate, they should sit beside posts and comments in the profile IA, not inside a buried integrations tab.",
    communityLabel: "c/lastfm",
    communityHref: "#",
    postTitle: "Should scrobbles have their own tab?",
    postHref: "#",
    scoreLabel: "74 score",
    timestampLabel: "4h",
  },
  {
    commentId: "comment_3",
    body:
      "I would keep follow and message in the right rail on desktop, then move them into the header block on mobile so the first screen still carries the primary action.",
    communityLabel: "c/design",
    communityHref: "#",
    postTitle: "Desktop versus mobile profile actions",
    postHref: "#",
    scoreLabel: "33 score",
    timestampLabel: "1d",
  },
];

const scrobbles: ProfileScrobbleItem[] = [
  {
    scrobbleId: "scrobble_1",
    title: "Cancion Animal",
    artistName: "Soda Stereo",
    artworkSrc: "https://images.unsplash.com/photo-1511379938547-c1f69419868d?auto=format&fit=crop&w=400&q=80",
    metaItems: [
      { label: "Scrobbled 6m ago" },
      { label: "c/argentina", href: "#" },
      { label: "418 plays" },
    ],
  },
  {
    scrobbleId: "scrobble_2",
    title: "Viernes 3 AM",
    artistName: "Seru Giran",
    artworkSrc: "https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?auto=format&fit=crop&w=400&q=80",
    metaItems: [
      { label: "Scrobbled 2h ago" },
      { label: "c/classicrock", href: "#" },
      { label: "302 plays" },
    ],
  },
  {
    scrobbleId: "scrobble_3",
    title: "Post-Crucifixion",
    artistName: "Pescado Rabioso",
    artworkSrc: "https://images.unsplash.com/photo-1501612780327-45045538702b?auto=format&fit=crop&w=400&q=80",
    metaItems: [
      { label: "Scrobbled yesterday" },
      { label: "c/lastfm", href: "#" },
      { label: "221 plays" },
    ],
  },
];

const overviewItems: ProfileActivityItem[] = [
  { kind: "post", id: "overview_post_1", post: profilePosts[0] },
  { kind: "comment", id: "overview_comment_1", comment: comments[0] },
  { kind: "scrobble", id: "overview_scrobble_1", scrobble: scrobbles[0] },
  { kind: "post", id: "overview_post_2", post: profilePosts[1] },
];

const baseArgs: ProfilePageProps = {
  profile: {
    displayName: "Pampa_of_Argentina",
    handle: "pampa_of_argentina.pirate",
    tagline: "u/Pampa_of_Argentina",
    bio:
      "Buenos Aires, bookstores, football, and a listening history that should probably count as public infrastructure.",
    avatarSrc: "https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=300&q=80",
    bannerSrc: "https://images.unsplash.com/photo-1514565131-fce0801e5785?auto=format&fit=crop&w=1600&q=80",
    meta: [
      { label: "Posts", value: "126" },
      { label: "Comments", value: "894" },
      { label: "Scrobbles", value: "14.8K" },
    ],
    viewerContext: "public",
    viewerFollows: false,
    canMessage: true,
  },
  rightRail: {
    stats: [
      { label: "Karma", value: 20028 },
      { label: "Contributions", value: 1352 },
      { label: "Wallet age", value: "6 months" },
      { label: "Followers", value: 842 },
    ],
    walletAddress: "0x42a5f77f2d06c9a7e304817b3c177b91e0c2f3a8",
    verificationItems: [
      { label: "Palm Scan", value: "Verified" },
      { label: "Wallet Score", value: "19.8" },
      { label: "Nationality", value: "Argentina" },
      { label: "Age", value: "18+" },
    ],
  },
  overviewItems,
  posts: profilePosts,
  comments,
  scrobbles,
};

const meta = {
  title: "Compositions/ProfilePage",
  component: ProfilePage,
  args: baseArgs,
  parameters: {
    layout: "fullscreen",
  },
  decorators: [
    (Story: () => React.ReactNode) => (
      <div style={{ minHeight: "100vh", width: "100%" }}>
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof ProfilePage>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Overview: Story = {};

export const Posts: Story = {
  args: {
    defaultTab: "posts",
  },
};

export const Comments: Story = {
  args: {
    defaultTab: "comments",
  },
};

export const Scrobbles: Story = {
  args: {
    defaultTab: "scrobbles",
  },
};

export const PublicV0Lean: Story = {
  args: {
    rightRail: {
      stats: [
        { label: "Karma", value: 20028 },
        { label: "Contributions", value: 1352 },
        { label: "Followers", value: 842 },
        { label: "Following", value: 118 },
      ],
    },
  },
};

export const OwnProfile: Story = {
  args: {
    profile: {
      ...baseArgs.profile,
      viewerContext: "self",
      canMessage: false,
    },
  },
};

export const MobileOverview: Story = {
  args: {
    defaultTab: "overview",
  },
  parameters: {
    viewport: { defaultViewport: "mobile1" },
  },
};

export const OwnProfileMobile: Story = {
  args: {
    profile: {
      ...baseArgs.profile,
      viewerContext: "self",
      canMessage: false,
    },
  },
  parameters: {
    viewport: { defaultViewport: "mobile1" },
  },
};
