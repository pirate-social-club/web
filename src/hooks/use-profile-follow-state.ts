"use client";

import * as React from "react";
import { isAddress, type Address } from "viem";

import { toast } from "@/components/primitives/sonner";
import { usePiratePrivyRuntime } from "@/lib/auth/privy-provider";
import { type StoredSession, useSession } from "@/lib/api/session-store";
import {
  fetchProfileFollowSummary,
  fetchViewerFollowState,
  submitFollowAction,
} from "@/lib/follow/efp";
import {
  clearViewerFollowOverride,
  readViewerFollowOverride,
  writeViewerFollowOverride,
} from "@/lib/follow/follow-overrides";

function normalizeAddress(value: string | null | undefined): Address | null {
  if (!value) {
    return null;
  }

  const trimmed = value.trim();
  if (!isAddress(trimmed)) {
    return null;
  }

  return trimmed.toLowerCase() as Address;
}

function resolvePrimarySessionWallet(session: StoredSession | null): Address | null {
  const profileWallet = normalizeAddress(session?.profile.primary_wallet_address);
  if (profileWallet) {
    return profileWallet;
  }

  const primaryAttachment = session?.walletAttachments.find((attachment) => attachment.is_primary);
  const primaryWallet = normalizeAddress(primaryAttachment?.wallet_address);
  if (primaryWallet) {
    return primaryWallet;
  }

  return normalizeAddress(session?.walletAttachments[0]?.wallet_address);
}

export interface ProfileFollowState {
  followerCount: number | null;
  followingCount: number;
  followBusy: boolean;
  followDisabled: boolean;
  followLoading: boolean;
  isFollowing: boolean;
  onToggleFollow: () => void;
}

export function useProfileFollowState(
  targetWalletAddress: string | null | undefined,
  ownProfile: boolean,
): ProfileFollowState {
  const session = useSession();
  const {
    busy: authBusy,
    connect,
    connectedWallets,
    walletsReady,
  } = usePiratePrivyRuntime();
  const targetAddress = React.useMemo(
    () => normalizeAddress(targetWalletAddress),
    [targetWalletAddress],
  );
  const viewerAddress = React.useMemo(
    () => resolvePrimarySessionWallet(session),
    [session],
  );
  const writeWallet = React.useMemo(() => {
    if (!viewerAddress) {
      return null;
    }

    for (const wallet of connectedWallets) {
      const normalized = normalizeAddress(wallet.address);
      if (normalized === viewerAddress) {
        return wallet;
      }
    }

    return null;
  }, [connectedWallets, viewerAddress]);

  const [serverFollowing, setServerFollowing] = React.useState(false);
  const [followReady, setFollowReady] = React.useState(ownProfile);
  const [overrideFollowing, setOverrideFollowing] = React.useState<boolean | null>(null);
  const [followerCount, setFollowerCount] = React.useState<number | null>(0);
  const [followingCount, setFollowingCount] = React.useState(0);
  const [countsReady, setCountsReady] = React.useState(false);
  const [followBusy, setFollowBusy] = React.useState(false);

  React.useEffect(() => {
    if (!viewerAddress || !targetAddress || ownProfile) {
      setOverrideFollowing(null);
      return;
    }

    setOverrideFollowing(readViewerFollowOverride(viewerAddress, targetAddress)?.following ?? null);
  }, [ownProfile, targetAddress, viewerAddress]);

  React.useEffect(() => {
    if (!targetAddress) {
      setFollowerCount(null);
      setFollowingCount(0);
      setCountsReady(true);
      return;
    }

    let cancelled = false;
    setCountsReady(false);

    void fetchProfileFollowSummary(targetAddress)
      .then((summary) => {
        if (cancelled) {
          return;
        }

        setFollowerCount(summary.followerCount);
        setFollowingCount(summary.followingCount);
      })
      .catch(() => {
        if (cancelled) {
          return;
        }

        setFollowerCount(null);
        setFollowingCount(0);
      })
      .finally(() => {
        if (!cancelled) {
          setCountsReady(true);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [targetAddress]);

  React.useEffect(() => {
    if (ownProfile) {
      setServerFollowing(true);
      setFollowReady(true);
      return;
    }

    if (!targetAddress) {
      setServerFollowing(false);
      setFollowReady(true);
      return;
    }

    if (!viewerAddress) {
      setServerFollowing(false);
      setFollowReady(true);
      return;
    }

    let cancelled = false;
    setFollowReady(false);

    void fetchViewerFollowState(viewerAddress, targetAddress)
      .then((value) => {
        if (!cancelled) {
          setServerFollowing(value);
          setOverrideFollowing((currentOverride) => {
            if (currentOverride === null || !viewerAddress || !targetAddress || currentOverride !== value) {
              return currentOverride;
            }

            clearViewerFollowOverride(viewerAddress, targetAddress);
            return null;
          });
        }
      })
      .catch(() => {
        if (!cancelled) {
          setServerFollowing(false);
        }
      })
      .finally(() => {
        if (!cancelled) {
          setFollowReady(true);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [ownProfile, targetAddress, viewerAddress]);

  const isFollowing = ownProfile
    ? true
    : overrideFollowing ?? serverFollowing;
  const followerCountDelta = followerCount !== null
    && countsReady
    && overrideFollowing !== null
    && overrideFollowing !== serverFollowing
    ? (overrideFollowing ? 1 : -1)
    : 0;
  const effectiveFollowerCount = followerCount === null
    ? null
    : Math.max(0, followerCount + followerCountDelta);

  const onToggleFollow = React.useCallback(() => {
    if (ownProfile || !targetAddress) {
      return;
    }

    if (followBusy) {
      return;
    }

    if (!session) {
      connect?.();
      return;
    }

    if (!viewerAddress) {
      toast.error("Connect your wallet to follow people.");
      connect?.();
      return;
    }

    if (!followReady) {
      return;
    }

    if (!writeWallet) {
      connect?.();
      toast.error("Reconnect your primary wallet to follow people.");
      return;
    }

    const nextFollowing = !isFollowing;
    const previousOverride = overrideFollowing;
    setFollowBusy(true);
    setOverrideFollowing(nextFollowing);
    writeViewerFollowOverride(viewerAddress, targetAddress, nextFollowing);

    void submitFollowAction(writeWallet, {
      followed: nextFollowing,
      targetAddress,
    })
      .then(() => {
        setServerFollowing(nextFollowing);
      })
      .catch((error: unknown) => {
        if (previousOverride === null) {
          clearViewerFollowOverride(viewerAddress, targetAddress);
        } else {
          writeViewerFollowOverride(viewerAddress, targetAddress, previousOverride);
        }

        setOverrideFollowing(previousOverride);
        toast.error(error instanceof Error ? error.message : "Follow failed.");
      })
      .finally(() => {
        setFollowBusy(false);
      });
  }, [
    connect,
    followBusy,
    followReady,
    isFollowing,
    overrideFollowing,
    ownProfile,
    session,
    targetAddress,
    viewerAddress,
    writeWallet,
  ]);

  return {
    followerCount: effectiveFollowerCount,
    followingCount,
    followBusy: followBusy || authBusy,
    followDisabled: ownProfile || !targetAddress || (Boolean(viewerAddress) && !followReady),
    followLoading: Boolean(viewerAddress) && (!followReady || (!walletsReady && Boolean(session))),
    isFollowing,
    onToggleFollow,
  };
}
