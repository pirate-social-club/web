import { toast } from "@/components/primitives/sonner";
import type { CommunityMembershipMode } from "@/lib/community-membership";
import type { CreateCommunityComposerProps } from "@/components/compositions/create-community-composer/create-community-composer.types";
import type { OnboardingRedditBootstrapProps } from "@/components/compositions/onboarding-reddit-bootstrap/onboarding-reddit-bootstrap.types";
import type { PostCardProps } from "@/components/compositions/post-card/post-card.types";
import type {
  ProfileCommentItem,
  ProfileScrobbleItem,
} from "@/components/compositions/profile-page/profile-page.types";
import type {
  CommunitySidebarFlairPolicy,
  CommunitySidebarModerator,
  CommunitySidebarReferenceLink,
  CommunitySidebarRule,
} from "@/components/compositions/community-sidebar/community-sidebar.types";

export type RoutePost = PostCardProps & {
  postId: string;
};

export interface CommunitySummary {
  id: string;
  label: string;
  displayName: string;
  description: string;
  createdAt: string;
  memberCount: number;
  membershipMode: CommunityMembershipMode;
  moderator: CommunitySidebarModerator;
  referenceLinks: CommunitySidebarReferenceLink[];
  rules: CommunitySidebarRule[];
  flairPolicy: CommunitySidebarFlairPolicy;
  posts: RoutePost[];
}

export interface ProfileSummary {
  userId: string;
  handle: string;
  displayName: string;
  bio: string;
  avatarSrc?: string;
  joinedLabel: string;
  stats: Array<{ label: string; value: string }>;
  posts: RoutePost[];
  comments: ProfileCommentItem[];
  scrobbles: ProfileScrobbleItem[];
}

export const CURRENT_USER_ID = "usr_01_suspicious_code";

const COMMUNITY_IDS = {
  builders: "gld_01_builders",
  producersOnly: "gld_01_producers_only",
  tameImpala: "gld_01_tame_impala",
} as const;

const USER_IDS = {
  current: CURRENT_USER_ID,
  innerspeaker: "usr_01_innerspeaker",
  kevin: "usr_01_kevin_parker",
  modmatrix: "usr_01_modmatrix",
  roomcontrol: "usr_01_roomcontrol",
  shipit: "usr_01_shipit",
} as const;

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
  title: string;
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
    title,
    titleHref: `/p/${postId}`,
    viewContext,
  };
}

function createTextPost({
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

function createImagePost({
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

function createVideoPost(frame: {
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

function createSongPost(frame: {
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
      title: "Preview track",
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

function createLinkPost(frame: {
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
      type: "link",
      href: "https://pirate.sc/blog/feed-ranking",
      linkTitle: "How We Think About Ranking Music Communities",
      linkLabel: "pirate.sc/blog/feed-ranking",
      previewImageSrc: "https://picsum.photos/seed/pirate-link/240/240",
    },
  };
}

function createProfileComment(comment: ProfileCommentItem): ProfileCommentItem {
  return comment;
}

function createProfileScrobble(scrobble: ProfileScrobbleItem): ProfileScrobbleItem {
  return scrobble;
}

export const COMMUNITY_RECORDS: Record<string, CommunitySummary> = {
  [COMMUNITY_IDS.tameImpala]: {
    id: COMMUNITY_IDS.tameImpala,
    label: "c/tameimpala",
    displayName: "Tame Impala",
    description:
      "Everything about Tame Impala: albums, deep cuts, live sessions, and production talk.",
    createdAt: "2024-06-15T00:00:00Z",
    memberCount: 48231,
    membershipMode: "open",
    moderator: {
      avatarSrc: "https://i.pravatar.cc/96?img=12",
      displayName: "Kevin Parker",
      handle: "u/kevinparker.pirate",
    },
    referenceLinks: [
      {
        communityReferenceLinkId: "spotify",
        platform: "spotify",
        url: "https://open.spotify.com/artist/5INjqkS1d8Yy7I3GdE8c5J",
        linkStatus: "active",
        verified: true,
        metadata: { displayName: "Spotify", imageUrl: null },
        position: 0,
      },
      {
        communityReferenceLinkId: "youtube",
        platform: "youtube",
        url: "https://youtube.com/@tameimpala",
        linkStatus: "active",
        verified: true,
        metadata: { displayName: "YouTube", imageUrl: null },
        position: 1,
      },
    ],
    rules: [
      {
        ruleId: "r1",
        title: "No low-effort posts",
        body: "Memes and one-liners belong in the weekly discussion thread.",
        position: 0,
        status: "active",
      },
      {
        ruleId: "r2",
        title: "Flair your posts",
        body: "Use the appropriate flair when posting.",
        position: 1,
        status: "active",
      },
      {
        ruleId: "r3",
        title: "Be respectful",
        body: "Personal attacks and gatekeeping will result in a ban.",
        position: 2,
        status: "active",
      },
    ],
    flairPolicy: {
      flairEnabled: true,
      definitions: [
        {
          flairId: "discussion",
          label: "Discussion",
          colorToken: "#6377f0",
          status: "active",
          position: 0,
        },
        {
          flairId: "media",
          label: "Media",
          colorToken: "#63f0a5",
          status: "active",
          position: 1,
        },
      ],
    },
    posts: [
      createTextPost({
        authorLabel: "u/kevin.tameimpala",
        authorUserId: USER_IDS.kevin,
        avatarSeed: 11,
        body: "The synth texture at 1:42 is unreal. Anyone know what chain he is using here?",
        comments: 43,
        communityId: COMMUNITY_IDS.tameImpala,
        communityLabel: "c/tameimpala",
        postId: "pst_01_live_demo",
        score: 567,
        timestampLabel: "3h",
        title: "Studio demo from last night",
        viewContext: "community",
      }),
      createImagePost({
        alt: "Alternate album art concept",
        authorLabel: "u/innerspeaker",
        authorUserId: USER_IDS.innerspeaker,
        avatarSeed: 17,
        comments: 89,
        communityId: COMMUNITY_IDS.tameImpala,
        communityLabel: "c/tameimpala",
        imageSeed: "currents-cover",
        postId: "pst_01_cover_art",
        score: 1203,
        timestampLabel: "9d",
        title: "Alternate cover draft for Currents",
        viewContext: "community",
      }),
    ],
  },
  [COMMUNITY_IDS.producersOnly]: {
    id: COMMUNITY_IDS.producersOnly,
    label: "c/producers-only",
    displayName: "Producers Only",
    description:
      "A gated space for producers to trade stems, workflows, and hard feedback.",
    createdAt: "2025-01-20T00:00:00Z",
    memberCount: 1284,
    membershipMode: "gated",
    moderator: {
      avatarSrc: "https://i.pravatar.cc/96?img=33",
      displayName: "modmatrix",
      handle: "u/modmatrix.pirate",
    },
    referenceLinks: [
      {
        communityReferenceLinkId: "discord",
        platform: "discord",
        url: "https://discord.gg/example",
        label: "Discord",
        linkStatus: "active",
        verified: true,
        metadata: { displayName: null, imageUrl: null },
        position: 0,
      },
    ],
    rules: [
      {
        ruleId: "verify",
        title: "Verified producers only",
        body: "You must complete identity verification before posting.",
        position: 0,
        status: "active",
      },
      {
        ruleId: "stems",
        title: "No leaked stems",
        body: "Share only material you have the right to distribute.",
        position: 1,
        status: "active",
      },
    ],
    flairPolicy: {
      flairEnabled: true,
      definitions: [
        {
          flairId: "feedback",
          label: "Feedback",
          colorToken: "#f0a040",
          status: "active",
          position: 0,
        },
        {
          flairId: "stems",
          label: "Stems",
          colorToken: "#40a0f0",
          status: "active",
          position: 1,
        },
      ],
    },
    posts: [
      createSongPost({
        authorLabel: "u/modmatrix.pirate",
        authorUserId: USER_IDS.modmatrix,
        avatarSeed: 31,
        comments: 18,
        communityId: COMMUNITY_IDS.producersOnly,
        communityLabel: "c/producers-only",
        postId: "pst_01_stems_pack",
        score: 142,
        timestampLabel: "7h",
        title: "Fresh stems pack for critique",
        viewContext: "community",
      }),
    ],
  },
  [COMMUNITY_IDS.builders]: {
    id: COMMUNITY_IDS.builders,
    label: "c/builders",
    displayName: "Builders",
    description:
      "Product, protocol, and infrastructure discussion for people shipping internet-native systems.",
    createdAt: "2025-08-02T00:00:00Z",
    memberCount: 9021,
    membershipMode: "open",
    moderator: {
      avatarSrc: "https://i.pravatar.cc/96?img=21",
      displayName: "shipit",
      handle: "u/shipit.pirate",
    },
    referenceLinks: [],
    rules: [
      {
        ruleId: "receipts",
        title: "Bring receipts",
        body: "If you critique a system, explain the tradeoff and show the failure mode.",
        position: 0,
        status: "active",
      },
    ],
    flairPolicy: {
      flairEnabled: true,
      definitions: [
        {
          flairId: "infra",
          label: "Infra",
          colorToken: "#f06377",
          status: "active",
          position: 0,
        },
      ],
    },
    posts: [
      createLinkPost({
        authorLabel: "u/controlplane",
        authorUserId: USER_IDS.shipit,
        avatarSeed: 5,
        comments: 52,
        communityId: COMMUNITY_IDS.builders,
        communityLabel: "c/builders",
        postId: "pst_01_ranking_breakdown",
        score: 731,
        timestampLabel: "1d",
        title: "This product breakdown on feed ranking is worth reading",
        viewContext: "community",
      }),
    ],
  },
};

export const HOME_POSTS: RoutePost[] = [
  createTextPost({
    authorLabel: "u/kevin.tameimpala",
    authorUserId: USER_IDS.kevin,
    avatarSeed: 10,
    body: "Drop your top tracks below. Looking for new stuff across all genres.",
    comments: 47,
    communityId: COMMUNITY_IDS.tameImpala,
    communityLabel: "c/tameimpala",
    postId: "pst_01_weekly_listening",
    score: 342,
    timestampLabel: "9d",
    title: "What's everyone listening to this week?",
    viewContext: "home",
  }),
  createVideoPost({
    authorLabel: "u/roomcontrol",
    authorUserId: USER_IDS.roomcontrol,
    avatarSeed: 23,
    comments: 24,
    communityId: COMMUNITY_IDS.builders,
    communityLabel: "c/builders",
    postId: "pst_01_live_session",
    score: 567,
    timestampLabel: "2h",
    title: "Live session from the studio last night",
    viewContext: "home",
  }),
  createSongPost({
    authorLabel: "u/modmatrix.pirate",
    authorUserId: USER_IDS.modmatrix,
    avatarSeed: 31,
    comments: 18,
    communityId: COMMUNITY_IDS.producersOnly,
    communityLabel: "c/producers-only",
    postId: "pst_01_unlock_demo",
    score: 142,
    timestampLabel: "7h",
    title: "Preview track locked for members",
    viewContext: "home",
  }),
];

export const YOUR_COMMUNITIES_POSTS: RoutePost[] = [
  COMMUNITY_RECORDS[COMMUNITY_IDS.tameImpala].posts[0],
  COMMUNITY_RECORDS[COMMUNITY_IDS.builders].posts[0],
  createImagePost({
    alt: "Interface audit board",
    authorLabel: "u/shipit.pirate",
    authorUserId: USER_IDS.shipit,
    avatarSeed: 8,
    comments: 65,
    communityId: COMMUNITY_IDS.builders,
    communityLabel: "c/builders",
    imageSeed: "route-shell",
    postId: "pst_01_interface_audit",
    score: 904,
    timestampLabel: "5h",
    title: "Final pass on the onboarding route shell",
    viewContext: "home",
  }),
];

export const PROFILES: Record<string, ProfileSummary> = {
  [USER_IDS.current]: {
    userId: USER_IDS.current,
    handle: "u/suspicious-code-7234.pirate",
    displayName: "Suspicious Code",
    bio: "Building the first route shell for Pirate while keeping the product contract clean.",
    avatarSrc: "https://i.pravatar.cc/128?img=47",
    joinedLabel: "Joined Apr 2026",
    stats: [
      { label: "Posts", value: "14" },
      { label: "Communities", value: "8" },
      { label: "Saved", value: "23" },
    ],
    posts: [
      createTextPost({
        authorLabel: "u/suspicious-code-7234.pirate",
        authorUserId: USER_IDS.current,
        avatarSeed: 47,
        body: "Route trees are cheap to rename until real resolution contracts exist. Slugs and handles can come later.",
        comments: 12,
        communityId: COMMUNITY_IDS.builders,
        communityLabel: "c/builders",
        postId: "pst_01_profile_thought",
        score: 88,
        timestampLabel: "1h",
        title: "Scaffold first, lock vanity routes later",
        viewContext: "profile",
      }),
    ],
    comments: [
      createProfileComment({
        commentId: "cmt_01_profile_route_shell",
        body:
          "The self profile should earn its own layout decisions. Reusing the public follow rail was fast, but it was wrong.",
        communityLabel: "c/builders",
        communityHref: `/c/${COMMUNITY_IDS.builders}`,
        postTitle: "What should /me optimize for first?",
        postHref: "/p/pst_01_profile_thought",
        scoreLabel: "31 score",
        timestampLabel: "34m",
      }),
      createProfileComment({
        commentId: "cmt_01_profile_storybook",
        body:
          "Storybook should carry both the composition and the route shell. Otherwise mobile chrome regressions slip through.",
        communityLabel: "c/producers-only",
        communityHref: `/c/${COMMUNITY_IDS.producersOnly}`,
        postTitle: "Should page routes live in Storybook?",
        postHref: "/p/pst_01_interface_audit",
        scoreLabel: "19 score",
        timestampLabel: "3h",
      }),
    ],
    scrobbles: [
      createProfileScrobble({
        scrobbleId: "scr_01_suspicious_code_1",
        title: "Windowlicker",
        artistName: "Aphex Twin",
        artworkSrc: "https://picsum.photos/seed/scrobble-windowlicker/400/400",
        metaItems: [
          { label: "Scrobbled 12m ago" },
          { label: "c/builders", href: `/c/${COMMUNITY_IDS.builders}` },
          { label: "214 plays" },
        ],
      }),
      createProfileScrobble({
        scrobbleId: "scr_01_suspicious_code_2",
        title: "Midnight in a Perfect World",
        artistName: "DJ Shadow",
        artworkSrc: "https://picsum.photos/seed/scrobble-dj-shadow/400/400",
        metaItems: [
          { label: "Scrobbled yesterday" },
          { label: "c/producers-only", href: `/c/${COMMUNITY_IDS.producersOnly}` },
          { label: "97 plays" },
        ],
      }),
    ],
  },
  [USER_IDS.kevin]: {
    userId: USER_IDS.kevin,
    handle: "u/kevinparker.pirate",
    displayName: "Kevin Parker",
    bio: "Synths, tape, and too many alternate mixes.",
    avatarSrc: "https://i.pravatar.cc/128?img=12",
    joinedLabel: "Joined Jun 2024",
    stats: [
      { label: "Posts", value: "128" },
      { label: "Communities", value: "3" },
      { label: "Followers", value: "41.2K" },
    ],
    posts: COMMUNITY_RECORDS[COMMUNITY_IDS.tameImpala].posts,
    comments: [
      createProfileComment({
        commentId: "cmt_01_kevin_mix",
        body:
          "If the rough mix is doing the emotional work already, the final version should protect that instead of polishing it flat.",
        communityLabel: "c/tameimpala",
        communityHref: `/c/${COMMUNITY_IDS.tameImpala}`,
        postTitle: "When do you stop touching the mix?",
        postHref: "/p/pst_01_kevin_mix",
        scoreLabel: "2.4K score",
        timestampLabel: "5h",
      }),
    ],
    scrobbles: [
      createProfileScrobble({
        scrobbleId: "scr_01_kevin_1",
        title: "Music To Walk Home By",
        artistName: "Tame Impala",
        artworkSrc: "https://picsum.photos/seed/scrobble-tame-1/400/400",
        metaItems: [
          { label: "Scrobbled 48m ago" },
          { label: "c/tameimpala", href: `/c/${COMMUNITY_IDS.tameImpala}` },
          { label: "8.1K plays" },
        ],
      }),
      createProfileScrobble({
        scrobbleId: "scr_01_kevin_2",
        title: "Open Eye Signal",
        artistName: "Jon Hopkins",
        artworkSrc: "https://picsum.photos/seed/scrobble-hopkins/400/400",
        metaItems: [
          { label: "Scrobbled 9h ago" },
          { label: "c/producers-only", href: `/c/${COMMUNITY_IDS.producersOnly}` },
          { label: "1.3K plays" },
        ],
      }),
    ],
  },
  [USER_IDS.shipit]: {
    userId: USER_IDS.shipit,
    handle: "u/shipit.pirate",
    displayName: "Ship It",
    bio: "Control plane, not hand-waving.",
    avatarSrc: "https://i.pravatar.cc/128?img=21",
    joinedLabel: "Joined Aug 2025",
    stats: [
      { label: "Posts", value: "42" },
      { label: "Communities", value: "5" },
      { label: "Followers", value: "2.1K" },
    ],
    posts: COMMUNITY_RECORDS[COMMUNITY_IDS.builders].posts,
    comments: [
      createProfileComment({
        commentId: "cmt_01_shipit_contracts",
        body:
          "If the route contract is still speculative, keep the UI honest and ship the smallest shape that won’t need to be undone.",
        communityLabel: "c/builders",
        communityHref: `/c/${COMMUNITY_IDS.builders}`,
        postTitle: "Where should placeholder routes stop?",
        postHref: "/p/pst_01_route_contracts",
        scoreLabel: "88 score",
        timestampLabel: "1d",
      }),
    ],
    scrobbles: [
      createProfileScrobble({
        scrobbleId: "scr_01_shipit_1",
        title: "The Robots",
        artistName: "Kraftwerk",
        artworkSrc: "https://picsum.photos/seed/scrobble-kraftwerk/400/400",
        metaItems: [
          { label: "Scrobbled 2h ago" },
          { label: "c/builders", href: `/c/${COMMUNITY_IDS.builders}` },
          { label: "640 plays" },
        ],
      }),
    ],
  },
};

export const ONBOARDING_SAMPLE: OnboardingRedditBootstrapProps = {
  generatedHandle: "suspicious-code-7234.pirate",
  canSkip: true,
  phase: "import_karma",
  reddit: {
    usernameValue: "technohippie",
    verifiedUsername: "technohippie",
    verificationState: "verified",
  },
  importJob: {
    status: "succeeded",
    sourceLabel: "Pushpull archival snapshot",
  },
  snapshot: {
    accountAgeDays: 2847,
    globalKarma: 18432,
    topSubreddits: [
      { subreddit: "hiphopheads", karma: 4821, posts: 12, rankSource: "karma" },
      { subreddit: "electronicmusic", karma: 2103, posts: 8, rankSource: "karma" },
      { subreddit: "design", karma: 1547, posts: 23, rankSource: "karma" },
    ],
    moderatorOf: [],
    inferredInterests: ["hip-hop", "left-field electronic", "design"],
    suggestedCommunities: [
      {
        communityId: COMMUNITY_IDS.builders,
        name: "c/builders",
        reason: "You engage with product and interface threads.",
      },
      {
        communityId: COMMUNITY_IDS.tameImpala,
        name: "c/tameimpala",
        reason: "You spend time in music-heavy discussion communities.",
      },
    ],
  },
  handleSuggestion: {
    suggestedLabel: "technohippie",
    source: "verified_reddit_username",
    availability: "available",
  },
  actions: {
    primaryLabel: "Continue",
    secondaryLabel: "Choose another handle",
    tertiaryLabel: "Skip",
  },
};

export const CREATE_COMMUNITY_SAMPLE: CreateCommunityComposerProps = {
  displayName: "American Voices",
  description:
    "A national-interest community where verified context matters, but moderation still needs a safe anonymous layer.",
  membershipMode: "open",
  defaultAgeGatePolicy: "none",
  allowAnonymousIdentity: true,
  namespace: {
    family: "hns",
    externalRoot: "",
    importStatus: "not_imported",
    ownerLabel: "",
    hnsDelegationMode: "owner_managed",
  },
  handlePolicy: {
    policyTemplate: "standard",
    pricingModel: "free",
    membershipRequiredForClaim: true,
  },
  creatorVerificationState: {
    uniqueHumanVerified: true,
    ageOver18Verified: true,
  },
};

const indexedPosts = new Map<string, RoutePost>();

[
  ...HOME_POSTS,
  ...YOUR_COMMUNITIES_POSTS,
  ...Object.values(COMMUNITY_RECORDS).flatMap((community) => community.posts),
  ...Object.values(PROFILES).flatMap((profile) => profile.posts),
].forEach((post) => {
  indexedPosts.set(post.postId, post);
});

export const POSTS_BY_ID = Object.fromEntries(indexedPosts.entries());
