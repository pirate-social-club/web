"use client";

import * as React from "react";
import type { CommunityFollowResponse } from "@pirate/api-contracts";

import { logger } from "@/lib/logger";

type CommunityFollowMutation = (communityId: string) => Promise<CommunityFollowResponse>;

interface CommunityFollowState {
  communityId: string | null;
  followerCount: number | null;
  viewerFollowing: boolean;
}

export interface UseCommunityFollowOptions {
  communityId: string | null | undefined;
  follow: CommunityFollowMutation;
  hasSession?: boolean;
  initialFollowerCount?: number | null;
  initialViewerFollowing?: boolean | null;
  onAuthRequired?: () => void;
  onError?: (error: unknown) => void;
  unfollow: CommunityFollowMutation;
}

export interface CommunityFollowController {
  followerCount: number | null;
  followLoading: boolean;
  handleToggleFollow: () => Promise<void>;
  markViewerJoined: () => void;
  viewerFollowing: boolean;
}

function normalizeCommunityId(communityId: string | null | undefined): string | null {
  return communityId?.trim() || null;
}

function normalizeFollowerCount(followerCount: number | null | undefined): number | null {
  return typeof followerCount === "number" ? followerCount : null;
}

function nextFollowerCount(
  current: number | null,
  nextFollowing: boolean,
): number | null {
  if (typeof current !== "number") {
    return current;
  }
  return Math.max(0, current + (nextFollowing ? 1 : -1));
}

export function useCommunityFollow({
  communityId,
  follow,
  hasSession,
  initialFollowerCount,
  initialViewerFollowing,
  onAuthRequired,
  onError,
  unfollow,
}: UseCommunityFollowOptions): CommunityFollowController {
  const resolvedCommunityId = normalizeCommunityId(communityId);
  const [followLoading, setFollowLoading] = React.useState(false);
  const inFlightRef = React.useRef(false);
  const [state, setState] = React.useState<CommunityFollowState>(() => ({
    communityId: resolvedCommunityId,
    followerCount: normalizeFollowerCount(initialFollowerCount),
    viewerFollowing: Boolean(initialViewerFollowing),
  }));

  React.useEffect(() => {
    setState({
      communityId: resolvedCommunityId,
      followerCount: normalizeFollowerCount(initialFollowerCount),
      viewerFollowing: Boolean(initialViewerFollowing),
    });
  }, [
    initialFollowerCount,
    initialViewerFollowing,
    resolvedCommunityId,
  ]);

  const viewerFollowing = state.communityId === resolvedCommunityId
    ? state.viewerFollowing
    : Boolean(initialViewerFollowing);
  const followerCount = state.communityId === resolvedCommunityId
    ? state.followerCount
    : normalizeFollowerCount(initialFollowerCount);

  const markViewerJoined = React.useCallback(() => {
    if (!resolvedCommunityId) {
      return;
    }

    setState((current) => {
      const currentMatchesCommunity = current.communityId === resolvedCommunityId;
      const currentFollowing = currentMatchesCommunity
        ? current.viewerFollowing
        : Boolean(initialViewerFollowing);
      const currentFollowerCount = currentMatchesCommunity
        ? current.followerCount
        : normalizeFollowerCount(initialFollowerCount);

      return {
        communityId: resolvedCommunityId,
        followerCount: currentFollowing
          ? currentFollowerCount
          : nextFollowerCount(currentFollowerCount, true),
        viewerFollowing: true,
      };
    });
  }, [
    initialFollowerCount,
    initialViewerFollowing,
    resolvedCommunityId,
  ]);

  const handleToggleFollow = React.useCallback(async () => {
    if (!resolvedCommunityId || inFlightRef.current) {
      return;
    }

    if (hasSession === false && onAuthRequired) {
      logger.info("[community-follow] blocked follow without session", {
        communityId: resolvedCommunityId,
      });
      onAuthRequired();
      return;
    }

    const previousFollowing = viewerFollowing;
    const previousFollowerCount = followerCount;
    const nextFollowing = !previousFollowing;

    inFlightRef.current = true;
    setFollowLoading(true);
    logger.info("[community-follow] submit", {
      communityId: resolvedCommunityId,
      followerCount: previousFollowerCount,
      nextFollowing,
      previousFollowing,
    });
    setState({
      communityId: resolvedCommunityId,
      followerCount: nextFollowerCount(previousFollowerCount, nextFollowing),
      viewerFollowing: nextFollowing,
    });

    try {
      const result = nextFollowing
        ? await follow(resolvedCommunityId)
        : await unfollow(resolvedCommunityId);
      logger.info("[community-follow] saved", {
        communityId: result.community,
        followerCount: result.follower_count,
        following: result.following,
      });
      setState({
        communityId: result.community,
        followerCount: normalizeFollowerCount(result.follower_count),
        viewerFollowing: result.following,
      });
    } catch (error: unknown) {
      logger.warn("[community-follow] failed", {
        attemptedFollowing: nextFollowing,
        communityId: resolvedCommunityId,
        error,
      });
      setState({
        communityId: resolvedCommunityId,
        followerCount: previousFollowerCount,
        viewerFollowing: previousFollowing,
      });
      onError?.(error);
    } finally {
      inFlightRef.current = false;
      setFollowLoading(false);
    }
  }, [
    follow,
    followerCount,
    hasSession,
    onAuthRequired,
    onError,
    resolvedCommunityId,
    unfollow,
    viewerFollowing,
  ]);

  return React.useMemo(
    () => ({
      followerCount,
      followLoading,
      handleToggleFollow,
      markViewerJoined,
      viewerFollowing,
    }),
    [
      followerCount,
      followLoading,
      handleToggleFollow,
      markViewerJoined,
      viewerFollowing,
    ],
  );
}
