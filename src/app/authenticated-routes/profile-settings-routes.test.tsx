import { afterEach, beforeEach, describe, expect, mock, test } from "bun:test";
import { cleanup, render, waitFor } from "@testing-library/react";
import type { ProfileActivityResponse } from "@pirate/api-contracts";

import { installDomGlobals } from "@/test/setup-dom";
import type { ProfilePageProps } from "@/components/compositions/profiles/profile-page/profile-page.types";

installDomGlobals();

let fakeApi: {
  profiles: {
    getActivity: ReturnType<typeof mock>;
  };
  publicProfiles: {
    getActivity: ReturnType<typeof mock>;
  };
};

let fakeSession: unknown = null;
let lastProfilePageProps: ProfilePageProps | null = null;

mock.module("@/lib/api", () => ({ useApi: () => fakeApi }));
mock.module("@/lib/logger", () => ({
  logger: {
    error: () => undefined,
    info: () => undefined,
    warn: () => undefined,
  },
}));
mock.module("@/lib/api/session-store", () => ({
  clearSession: () => undefined,
  getAccessToken: () => "token",
  getSessionAccessTokenExpiryMs: () => Date.now() + 60_000,
  getStoredSession: () => fakeSession,
  isSessionAccessTokenExpired: () => false,
  isSessionAccessTokenExpiringSoon: () => false,
  revalidateSession: async () => fakeSession,
  setSession: () => fakeSession,
  setSessionClearCallback: () => undefined,
  updateSessionIdentityWallet: () => undefined,
  updateSessionOnboarding: () => undefined,
  updateSessionProfile: () => undefined,
  updateSessionUser: () => undefined,
  useSession: () => fakeSession,
  useSessionClearInProgress: () => false,
}));
mock.module("@/hooks/use-mobile", () => ({ useIsMobile: () => false }));
mock.module("@/hooks/use-profile-follow-state", () => ({
  useProfileFollowState: () => ({
    followerCount: 0,
    followingCount: 0,
    followBusy: false,
    followDisabled: false,
    followLoading: false,
    isFollowing: false,
    onToggleFollow: () => undefined,
  }),
}));
mock.module("@/hooks/use-global-handle-flow", () => ({
  useGlobalHandleFlow: () => ({ clearDraft: () => undefined }),
}));
mock.module("@/app/authenticated-state/use-own-booking-cta", () => ({
  useOwnBookingCta: () => null,
}));
mock.module("@/hooks/use-host-availability", () => ({
  useHostAvailability: () => ({ loading: false, slots: [] }),
}));
mock.module("@/components/compositions/profiles/profile-page/profile-page", () => ({
  ProfilePage: (props: ProfilePageProps) => {
    lastProfilePageProps = props;
    return (
      <div>
        <div data-testid="posts-count">{props.posts?.length ?? 0}</div>
        <div data-testid="comments-count">{props.comments?.length ?? 0}</div>
        <div data-testid="activity-error">{props.activityError ?? ""}</div>
      </div>
    );
  },
}));

const { CurrentUserProfilePage } = await import("./profile-settings-routes");

function profile() {
  return {
    avatar_ref: null,
    bio: null,
    cover_ref: null,
    created: Date.now(),
    display_name: "Swift Fox",
    global_handle: {
      free_rename_consumed: false,
      id: "ghd_swift",
      issuance_source: "generated_signup",
      issued_at: Date.now(),
      label: "swift-fox-7721.pirate",
      object: "global_handle",
      replaced_at: null,
      status: "active",
      tier: "generated",
    },
    id: "usr_swift",
    linked_handles: null,
    object: "profile",
    preferred_locale: null,
    primary_public_handle: null,
    primary_wallet_address: null,
    updated: Date.now(),
    verification_capabilities: null,
  };
}

function activityResponse(tab: "overview" | "posts" | "comments"): ProfileActivityResponse {
  return {
    comments: tab === "comments" ? [{
      comment: {
        comment: {
          anonymous_label: null,
          anonymous_scope: null,
          author_public_handle: "swift-fox-7721.pirate",
          author_user: "usr_swift",
          authorship_mode: "human_direct",
          body: "Profile route comment",
          community: "cmt_test",
          content_hash: null,
          created: 1_782_000_100,
          depth: 0,
          descendant_count: 0,
          direct_reply_count: 0,
          downvote_count: 0,
          id: "cmt_route",
          identity_mode: "public",
          idempotency_key: null,
          last_reply_at: null,
          object: "comment",
          parent_comment: null,
          score: 1,
          status: "published",
          swarm_body_ref: null,
          thread_root_post: "pst_route",
          upvote_count: 1,
        },
        id: "cli_route",
        machine_translated: false,
        object: "comment_list_item",
        resolved_locale: "en",
        source_hash: "comment-hash",
        translation_state: "same_language",
        viewer_vote: null,
      },
      community: {
        display_name: "Test Builders",
        id: "cmt_test",
        object: "community_preview",
        route_slug: "test-builders",
      },
      created: 1_782_000_100,
      kind: "comment",
      thread_root_post: postResponse(),
    }] : [],
    next_cursor: null,
    overview_items: [],
    posts: tab === "posts" ? [{
      community: {
        display_name: "Test Builders",
        id: "cmt_test",
        object: "community_preview",
        route_slug: "test-builders",
      },
      created: 1_782_000_000,
      kind: "post",
      post: postResponse(),
    }] : [],
    tab,
  } as ProfileActivityResponse;
}

function postResponse() {
  return {
    comment_count: 0,
    downvote_count: 0,
    like_count: 0,
    machine_translated: false,
    post: {
      age_gate_policy: "none",
      analysis_state: "allow",
      author_public_handle: "swift-fox-7721.pirate",
      author_user: "usr_swift",
      authorship_mode: "human_direct",
      community: "cmt_test",
      content_safety_state: "safe",
      created: 1_782_000_000,
      id: "pst_route",
      identity_mode: "public",
      object: "post",
      post_type: "text",
      status: "published",
      title: "Profile route post",
      visibility: "public",
    },
    resolved_locale: "en",
    source_hash: "post-hash",
    thread_snapshot: null,
    translation_state: "same_language",
    upvote_count: 1,
    viewer_is_author: true,
    viewer_reaction_kinds: [],
    viewer_vote: null,
  };
}

beforeEach(() => {
  Object.defineProperty(window, "location", {
    configurable: true,
    value: { hash: "#posts" },
  });
  lastProfilePageProps = null;
  fakeSession = {
    accessToken: "token",
    onboarding: {},
    profile: profile(),
    user: {},
    walletAttachments: [],
  };
  fakeApi = {
    profiles: {
      getActivity: mock(async ({ tab }: { tab: "overview" | "posts" | "comments" }) => activityResponse(tab)),
    },
    publicProfiles: {
      getActivity: mock(async (_handle: string, { tab }: { tab: "overview" | "posts" | "comments" }) => activityResponse(tab)),
    },
  };
});

afterEach(() => {
  cleanup();
});

describe("CurrentUserProfilePage", () => {
  test("passes fetched posts activity into ProfilePage for /me#posts", async () => {
    const view = render(<CurrentUserProfilePage />);

    await waitFor(() => expect(view.getByTestId("posts-count").textContent).toBe("1"));
    expect(lastProfilePageProps?.defaultTab).toBe("posts");
    expect(lastProfilePageProps?.posts?.[0]?.post.title).toBe("Profile route post");
    expect(fakeApi.profiles.getActivity).not.toHaveBeenCalled();
    expect(fakeApi.publicProfiles.getActivity).toHaveBeenCalledTimes(1);
    expect(fakeApi.publicProfiles.getActivity).toHaveBeenCalledWith(
      "swift-fox-7721.pirate",
      expect.objectContaining({ tab: "posts" }),
    );
  });

  test("passes an activity error into ProfilePage when loading fails", async () => {
    fakeApi.publicProfiles.getActivity = mock(async () => {
      throw new Error("activity unavailable");
    });

    const view = render(<CurrentUserProfilePage />);

    await waitFor(() => expect(view.getByTestId("activity-error").textContent).toBe("Could not load profile activity."));
  });
});
