import type { CreateCommunitySample, OnboardingSample, RoutePost } from "./types";

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
  handleSuggestion: {
    suggestedLabel: "technohippie",
    source: "verified_reddit_username",
    availability: "available",
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
