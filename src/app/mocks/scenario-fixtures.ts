import type { CreateCommunitySample, RoutePost } from "./types";

export const CREATE_COMMUNITY_SAMPLE: CreateCommunitySample = {
  displayName: "American Voices",
  description: "A national-interest community where verified context matters, but moderation still needs a safe anonymous layer.",
  membershipMode: "request",
  defaultAgeGatePolicy: "none",
  allowAnonymousIdentity: true,
  creatorVerificationState: {
    ageOver18Verified: true,
  },
};

export function buildPostsById(posts: RoutePost[]): Record<string, RoutePost> {
  return Object.fromEntries(posts.map((post) => [post.postId, post] as const));
}
