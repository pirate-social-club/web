import { describe, expect, spyOn, test } from "bun:test";
import { act, renderHook } from "@testing-library/react";
import type { CommunityFollowResponse } from "@pirate/api-contracts";

import { installDomGlobals } from "@/test/setup-dom";

import { useCommunityFollow } from "./use-community-follow";

installDomGlobals();

const originalFetch = globalThis.fetch;

function createDeferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason?: unknown) => void;
  const promise = new Promise<T>((nextResolve, nextReject) => {
    resolve = nextResolve;
    reject = nextReject;
  });
  return { promise, reject, resolve };
}

function captureAnalyticsRequests() {
  const requests: Request[] = [];
  Object.defineProperty(globalThis, "fetch", {
    configurable: true,
    value: async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
      requests.push(input instanceof Request ? input : new Request(input, init));
      return Response.json({ accepted: true }, { status: 202 });
    },
  });

  return {
    requests,
    restore: () => {
      Object.defineProperty(globalThis, "fetch", { configurable: true, value: originalFetch });
    },
  };
}

function createFollowResponse(
  overrides: Partial<CommunityFollowResponse> = {},
): CommunityFollowResponse {
  return {
    community: "com_test",
    follower_count: 12,
    following: true,
    ...overrides,
  };
}

describe("useCommunityFollow", () => {
  test("syncs state from the current community", () => {
    const { result, rerender } = renderHook(
      (props: { communityId: string; followerCount: number; following: boolean }) =>
        useCommunityFollow({
          communityId: props.communityId,
          follow: async () => createFollowResponse(),
          initialFollowerCount: props.followerCount,
          initialViewerFollowing: props.following,
          unfollow: async () => createFollowResponse({ following: false }),
        }),
      {
        initialProps: {
          communityId: "com_a",
          followerCount: 4,
          following: false,
        },
      },
    );

    expect(result.current.followerCount).toBe(4);
    expect(result.current.viewerFollowing).toBe(false);

    rerender({
      communityId: "com_b",
      followerCount: 9,
      following: true,
    });

    expect(result.current.followerCount).toBe(9);
    expect(result.current.viewerFollowing).toBe(true);
  });

  test("optimistically follows and then uses the saved server state", async () => {
    const deferred = createDeferred<CommunityFollowResponse>();
    const followedCommunities: string[] = [];
    const { result } = renderHook(() =>
      useCommunityFollow({
        communityId: "com_test",
        follow: (communityId) => {
          followedCommunities.push(communityId);
          return deferred.promise;
        },
        initialFollowerCount: 10,
        initialViewerFollowing: false,
        unfollow: async () => createFollowResponse({ following: false }),
      })
    );

    let togglePromise!: Promise<void>;
    await act(async () => {
      togglePromise = result.current.handleToggleFollow();
    });

    expect(followedCommunities).toEqual(["com_test"]);
    expect(result.current.followLoading).toBe(true);
    expect(result.current.viewerFollowing).toBe(true);
    expect(result.current.followerCount).toBe(11);

    await act(async () => {
      deferred.resolve(createFollowResponse({ follower_count: 14 }));
      await togglePromise;
    });

    expect(result.current.followLoading).toBe(false);
    expect(result.current.viewerFollowing).toBe(true);
    expect(result.current.followerCount).toBe(14);
  });

  test("accepts a raw community id in the follow response without rolling back", async () => {
    const { result } = renderHook(() =>
      useCommunityFollow({
        communityId: "com_cmt_test",
        follow: async () => createFollowResponse({
          community: "cmt_test",
          follower_count: 11,
        }),
        initialFollowerCount: 10,
        initialViewerFollowing: false,
        unfollow: async () => createFollowResponse({ following: false }),
      })
    );

    await act(async () => {
      await result.current.handleToggleFollow();
    });

    expect(result.current.followLoading).toBe(false);
    expect(result.current.viewerFollowing).toBe(true);
    expect(result.current.followerCount).toBe(11);
  });

  test("keeps saved follow state and warns when the response omits community", async () => {
    const warnSpy = spyOn(console, "warn").mockImplementation(() => undefined);
    const analytics = captureAnalyticsRequests();
    try {
      const legacyResponse = {
        community_id: "cmt_test",
        follower_count: 11,
        following: true,
      } as unknown as CommunityFollowResponse;
      const { result } = renderHook(() =>
        useCommunityFollow({
          communityId: "com_cmt_test",
          follow: async () => legacyResponse,
          initialFollowerCount: 10,
          initialViewerFollowing: false,
          unfollow: async () => createFollowResponse({ following: false }),
        })
      );

      await act(async () => {
        await result.current.handleToggleFollow();
      });

      expect(result.current.followLoading).toBe(false);
      expect(result.current.viewerFollowing).toBe(true);
      expect(result.current.followerCount).toBe(11);
      expect(warnSpy).toHaveBeenCalledWith(
        "[community-follow] mutation response missing community id",
        expect.objectContaining({
          action: "follow",
          communityId: "com_cmt_test",
        }),
      );
      expect(analytics.requests).toHaveLength(1);
      const analyticsBody = await analytics.requests[0]?.json() as {
        community_id?: string
        event_name?: string
        properties?: Record<string, unknown>
      };
      expect(analyticsBody.event_name).toBe("community_follow_contract_drift");
      expect(analyticsBody.community_id).toBe("com_cmt_test");
      const analyticsProperties = analyticsBody.properties ?? {};
      expect(analyticsProperties).toEqual(expect.objectContaining({
        action: "follow",
        drift_kind: "missing_community",
        expected_community_id: "com_cmt_test",
      }));
      expect("response_community_id" in analyticsProperties).toBe(false);
    } finally {
      warnSpy.mockRestore();
      analytics.restore();
    }
  });

  test("keeps saved follow state and warns when the response community mismatches", async () => {
    const warnSpy = spyOn(console, "warn").mockImplementation(() => undefined);
    const analytics = captureAnalyticsRequests();
    try {
      const { result } = renderHook(() =>
        useCommunityFollow({
          communityId: "com_cmt_test",
          follow: async () => createFollowResponse({
            community: "com_cmt_other",
            follower_count: 11,
          }),
          initialFollowerCount: 10,
          initialViewerFollowing: false,
          unfollow: async () => createFollowResponse({ following: false }),
        })
      );

      await act(async () => {
        await result.current.handleToggleFollow();
      });

      expect(result.current.followLoading).toBe(false);
      expect(result.current.viewerFollowing).toBe(true);
      expect(result.current.followerCount).toBe(11);
      expect(warnSpy).toHaveBeenCalledWith(
        "[community-follow] mutation response community mismatch",
        expect.objectContaining({
          action: "follow",
          expectedCommunityId: "com_cmt_test",
          responseCommunityId: "com_cmt_other",
        }),
      );
      expect(analytics.requests).toHaveLength(1);
      const analyticsBody = await analytics.requests[0]?.json() as {
        community_id?: string
        event_name?: string
        properties?: Record<string, unknown>
      };
      expect(analyticsBody.event_name).toBe("community_follow_contract_drift");
      expect(analyticsBody.community_id).toBe("com_cmt_test");
      expect(analyticsBody.properties).toEqual(expect.objectContaining({
        action: "follow",
        drift_kind: "community_mismatch",
        expected_community_id: "com_cmt_test",
        response_community_id: "com_cmt_other",
      }));
    } finally {
      warnSpy.mockRestore();
      analytics.restore();
    }
  });

  test("rolls back an optimistic unfollow when the mutation fails", async () => {
    const warnSpy = spyOn(console, "warn").mockImplementation(() => undefined);
    const deferred = createDeferred<CommunityFollowResponse>();
    const errors: unknown[] = [];
    try {
      const { result } = renderHook(() =>
        useCommunityFollow({
          communityId: "com_test",
          follow: async () => createFollowResponse(),
          initialFollowerCount: 3,
          initialViewerFollowing: true,
          onError: (error) => errors.push(error),
          unfollow: () => deferred.promise,
        })
      );

      let togglePromise!: Promise<void>;
      await act(async () => {
        togglePromise = result.current.handleToggleFollow();
      });

      expect(result.current.followLoading).toBe(true);
      expect(result.current.viewerFollowing).toBe(false);
      expect(result.current.followerCount).toBe(2);

      const error = new Error("failed");
      await act(async () => {
        deferred.reject(error);
        await togglePromise;
      });

      expect(errors).toEqual([error]);
      expect(result.current.followLoading).toBe(false);
      expect(result.current.viewerFollowing).toBe(true);
      expect(result.current.followerCount).toBe(3);
    } finally {
      warnSpy.mockRestore();
    }
  });

  test("delegates unauthenticated follow attempts without mutating state", async () => {
    let authRequests = 0;
    let followCalls = 0;
    const { result } = renderHook(() =>
      useCommunityFollow({
        communityId: "com_test",
        follow: async () => {
          followCalls += 1;
          return createFollowResponse();
        },
        hasSession: false,
        initialFollowerCount: 8,
        initialViewerFollowing: false,
        onAuthRequired: () => {
          authRequests += 1;
        },
        unfollow: async () => createFollowResponse({ following: false }),
      })
    );

    await act(async () => {
      await result.current.handleToggleFollow();
    });

    expect(authRequests).toBe(1);
    expect(followCalls).toBe(0);
    expect(result.current.viewerFollowing).toBe(false);
    expect(result.current.followerCount).toBe(8);
  });

  test("markViewerJoined follows once and increments follower count once", () => {
    const { result } = renderHook(() =>
      useCommunityFollow({
        communityId: "com_test",
        follow: async () => createFollowResponse(),
        initialFollowerCount: 6,
        initialViewerFollowing: false,
        unfollow: async () => createFollowResponse({ following: false }),
      })
    );

    act(() => {
      result.current.markViewerJoined();
    });

    expect(result.current.viewerFollowing).toBe(true);
    expect(result.current.followerCount).toBe(7);

    act(() => {
      result.current.markViewerJoined();
    });

    expect(result.current.viewerFollowing).toBe(true);
    expect(result.current.followerCount).toBe(7);
  });
});
