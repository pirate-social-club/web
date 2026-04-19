import type { CreateCommunitySample, OnboardingSample, RoutePost } from "./types";
import { COMMUNITY_IDS } from "./types";

export const ONBOARDING_SAMPLE: OnboardingSample = {
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

export const CREATE_COMMUNITY_SAMPLE: CreateCommunitySample = {
  displayName: "American Voices",
  description: "A national-interest community where verified context matters, but moderation still needs a safe anonymous layer.",
  membershipMode: "open",
  defaultAgeGatePolicy: "none",
  allowAnonymousIdentity: true,
  creatorVerificationState: {
    uniqueHumanVerified: true,
    ageOver18Verified: true,
  },
};

export function buildPostsById(posts: RoutePost[]): Record<string, RoutePost> {
  return Object.fromEntries(posts.map((post) => [post.postId, post] as const));
}
