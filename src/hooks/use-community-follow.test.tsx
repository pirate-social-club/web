import { describe, expect, spyOn, test } from "bun:test";
import { act, renderHook } from "@testing-library/react";
import type { CommunityFollowResponse } from "@pirate/api-contracts";

import { installDomGlobals } from "@/test/setup-dom";

import { useCommunityFollow } from "./use-community-follow";

installDomGlobals();

function createDeferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason?: unknown) => void;
  const promise = new Promise<T>((nextResolve, nextReject) => {
    resolve = nextResolve;
    reject = nextReject;
  });
  return { promise, reject, resolve };
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
