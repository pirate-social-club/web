import type {
  CommunityPreview,
  HomeFeedItem,
  LocalizedPostResponse,
  Profile,
} from "@pirate/api-contracts";
import type { QueryClient } from "@tanstack/react-query";

import { postKeys } from "./keys";
import type { ThreadCommentNode } from "@/app/authenticated-state/thread-state";

export type PublicThreadQueryData = {
  post: LocalizedPostResponse;
  community: CommunityPreview | null;
  comments: ThreadCommentNode[];
  authorProfiles: Record<string, Profile | null>;
  partial: boolean;
  source: "feed_seed" | "thread_api";
};

function communityPreviewFromHomeFeedItem(item: HomeFeedItem): CommunityPreview {
  return {
    id: item.community.id,
    object: "community_preview",
    route_slug: item.community.route_slug ?? null,
    display_name: item.community.display_name,
    description: null,
    localized_text: null,
    avatar_ref: item.community.avatar_ref ?? null,
    banner_ref: null,
    membership_mode: "request",
    allow_anonymous_identity: true,
    anonymous_identity_scope: null,
    allowed_disclosed_qualifiers: null,
    allow_qualifiers_on_anonymous_posts: null,
    human_verification_lane: "self",
    member_count: item.community.member_count ?? null,
    follower_count: item.community.follower_count ?? null,
    donation_policy_mode: "none",
    donation_partner: null,
    owner: null,
    moderators: [],
    reference_links: null,
    membership_gate_summaries: [],
    rules: [],
    viewer_membership_status: null,
    viewer_following: null,
    created: item.post.post.created,
  };
}

export function seedPublicThreadQueriesFromFeed(input: {
  items: HomeFeedItem[];
  locale: string | null;
  queryClient: QueryClient;
  sort?: string | null;
}): void {
  const sort = input.sort ?? "best";
  for (const item of input.items) {
    input.queryClient.setQueryData<PublicThreadQueryData>(
      postKeys.publicThread({ postId: item.post.post.id, locale: input.locale, sort }),
      (current) => {
        if (current && !current.partial) {
          return current;
        }
        return {
          post: item.post,
          community: communityPreviewFromHomeFeedItem(item),
          comments: [],
          authorProfiles: {},
          partial: true,
          source: "feed_seed",
        };
      },
    );
  }
}
