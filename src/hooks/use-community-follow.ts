"use client";

import * as React from "react";
import type { CommunityFollowResponse } from "@pirate/api-contracts";

import { trackAnalyticsEvent } from "@/lib/analytics";
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

function canonicalCommunityIdForComparison(communityId: string | null | undefined): string | null {
  const normalized = normalizeCommunityId(communityId);
  return normalized?.startsWith("cmt_") ? `com_${normalized}` : normalized;
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

function resolveMutationCommunityId(input: {
  action: "follow" | "unfollow";
  resolvedCommunityId: string;
  responseCommunityId: string | null | undefined;
}): string {
  const responseCommunityId = normalizeCommunityId(input.responseCommunityId);
  if (!responseCommunityId) {
    logger.warn("[community-follow] mutation response missing community id", {
      action: input.action,
      communityId: input.resolvedCommunityId,
    });
    trackAnalyticsEvent({
      communityId: input.resolvedCommunityId,
      eventName: "community_follow_contract_drift",
      properties: {
        action: input.action,
        drift_kind: "missing_community",
        expected_community_id: input.resolvedCommunityId,
      },
    });
    return input.resolvedCommunityId;
  }

  const expected = canonicalCommunityIdForComparison(input.resolvedCommunityId);
  const actual = canonicalCommunityIdForComparison(responseCommunityId);
  if (actual !== expected) {
    logger.warn("[community-follow] mutation response community mismatch", {
      action: input.action,
      expectedCommunityId: input.resolvedCommunityId,
      responseCommunityId,
    });
    trackAnalyticsEvent({
      communityId: input.resolvedCommunityId,
      eventName: "community_follow_contract_drift",
      properties: {
        action: input.action,
        drift_kind: "community_mismatch",
        expected_community_id: input.resolvedCommunityId,
        response_community_id: responseCommunityId,
      },
    });
  }
  return input.resolvedCommunityId;
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
      const action = nextFollowing ? "follow" : "unfollow";
      const result = nextFollowing
        ? await follow(resolvedCommunityId)
        : await unfollow(resolvedCommunityId);
      const resultCommunityId = resolveMutationCommunityId({
        action,
        resolvedCommunityId,
        responseCommunityId: result.community,
      });
      logger.info("[community-follow] saved", {
        communityId: resultCommunityId,
        followerCount: result.follower_count,
        following: result.following,
        responseCommunityId: result.community,
      });
      setState({
        communityId: resultCommunityId,
        followerCount: normalizeFollowerCount(result.follower_count),
        viewerFollowing: nextFollowing,
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
