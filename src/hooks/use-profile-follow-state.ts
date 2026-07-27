"use client";

import * as React from "react";
import { isAddress, type Address } from "viem";

import { toast } from "@/components/primitives/sonner";
import {
  usePiratePrivyRuntime,
  usePiratePrivyWallets,
} from "@/components/auth/privy-provider";
import { type StoredSession, useSession } from "@/lib/api/session-store";
import { logger } from "@/lib/logger";
import { useUiLocale } from "@/lib/ui-locale";
import { getLocaleMessages } from "@/locales";
import {
  fetchViewerFollowState,
  submitFollowAction,
} from "@/lib/follow/efp";
import {
  clearViewerFollowOverride,
  readViewerFollowOverride,
  writeViewerFollowOverride,
} from "@/lib/follow/follow-overrides";
import { getWalletTransactionErrorMessage } from "@/lib/wallet-error-utils";
import { useApi } from "@/lib/api";

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

const loggedFollowDiagnostics = new Set<string>();

function warnFollowOnce(key: string, message: string, context?: Record<string, unknown>): void {
  if (loggedFollowDiagnostics.has(key)) {
    return;
  }
  loggedFollowDiagnostics.add(key);
  logger.warn(message, context);
}

export interface ProfileFollowState {
  followerCount: number | null;
  followingCount: number | null;
  followBusy: boolean;
  followDisabled: boolean;
  followLoading: boolean;
  followUnavailable: boolean;
  followUnavailableLabel: string;
  isFollowing: boolean;
  onToggleFollow: () => void;
}

export function useProfileFollowState(
  targetWalletAddress: string | null | undefined,
  ownProfile: boolean,
  targetUserId?: string | null,
): ProfileFollowState {
  const { locale } = useUiLocale();
  const copy = React.useMemo(() => getLocaleMessages(locale, "routes").profile, [locale]);
  const session = useSession();
  const api = useApi();
  const {
    busy: authBusy,
    connect,
    sendSponsoredIntent,
  } = usePiratePrivyRuntime();
  const shouldSyncWallets = !ownProfile && Boolean(session);
  const {
    connectedWallets,
    walletsReady,
  } = usePiratePrivyWallets({ enabled: shouldSyncWallets });
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
  const [followerCount, setFollowerCount] = React.useState<number | null>(null);
  const [followingCount, setFollowingCount] = React.useState<number | null>(null);
  const [countsReady, setCountsReady] = React.useState(false);
  const [followBusy, setFollowBusy] = React.useState(false);
  const [followUnavailable, setFollowUnavailable] = React.useState(false);

  React.useEffect(() => {
    if (!viewerAddress || !targetAddress || ownProfile) {
      setOverrideFollowing(null);
      return;
    }

    setOverrideFollowing(readViewerFollowOverride(viewerAddress, targetAddress)?.following ?? null);
  }, [ownProfile, targetAddress, targetWalletAddress, viewerAddress]);

  React.useEffect(() => {
    if (!targetUserId) {
      setFollowerCount(null);
      setFollowingCount(null);
      setCountsReady(true);
      return;
    }

    let cancelled = false;
    setCountsReady(false);

    void api.profiles.getFollowState(targetUserId)
      .then((state) => {
        if (cancelled) {
          return;
        }

        setFollowerCount(state.counts.status === "current" ? state.counts.follower_count : null);
        setFollowingCount(state.counts.status === "current" ? state.counts.following_count : null);
      })
      .catch(() => {
        if (cancelled) {
          return;
        }

        warnFollowOnce(`summary:${targetUserId}`, "[profile-follow] Failed to load follow summary.", {
          targetUserId,
        });
        setFollowerCount(null);
        setFollowingCount(null);
      })
      .finally(() => {
        if (!cancelled) {
          setCountsReady(true);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [api, targetUserId]);

  React.useEffect(() => {
    if (ownProfile) {
      setServerFollowing(true);
      setFollowReady(true);
      setFollowUnavailable(false);
      return;
    }

    if (!targetAddress) {
      if (!ownProfile && targetWalletAddress) {
        warnFollowOnce(`invalid-target:${targetWalletAddress}`, "[profile-follow] Follow target wallet is not a valid EVM address.", {
          targetWalletAddress,
        });
      } else if (!ownProfile) {
        warnFollowOnce("missing-target-wallet", "[profile-follow] Follow disabled because target profile has no primary wallet address.");
      }
      setServerFollowing(false);
      setFollowReady(true);
      setFollowUnavailable(false);
      return;
    }

    if (!viewerAddress) {
      setServerFollowing(false);
      setFollowReady(true);
      setFollowUnavailable(false);
      return;
    }

    let cancelled = false;
    setFollowReady(false);
    setFollowUnavailable(false);

    void fetchViewerFollowState(viewerAddress, targetAddress)
      .then((value) => {
        if (!cancelled) {
          if (value === null) {
            setFollowUnavailable(true);
            return;
          }
          setServerFollowing(value);
          setFollowUnavailable(false);
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
          warnFollowOnce(`viewer:${viewerAddress}:${targetAddress}`, "[profile-follow] Failed to load viewer follow state.", {
            targetAddress,
            viewerAddress,
          });
          setServerFollowing(false);
          setFollowUnavailable(true);
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
    if (ownProfile || !targetAddress || followUnavailable) {
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
      toast.error(copy.connectWalletToFollow);
      connect?.();
      return;
    }

    if (!followReady) {
      return;
    }

    if (!writeWallet) {
      connect?.();
      toast.error(copy.reconnectPrimaryWalletToFollow);
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
    }, {
      sendSponsoredIntent,
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
        toast.error(getWalletTransactionErrorMessage(error, copy.followFailed));
      })
      .finally(() => {
        setFollowBusy(false);
      });
  }, [
    connect,
    followBusy,
    followReady,
    followUnavailable,
    isFollowing,
    overrideFollowing,
    ownProfile,
    session,
    sendSponsoredIntent,
    targetAddress,
    viewerAddress,
    writeWallet,
    copy.connectWalletToFollow,
    copy.followFailed,
    copy.reconnectPrimaryWalletToFollow,
  ]);

  return {
    followerCount: effectiveFollowerCount,
    followingCount,
    followBusy: followBusy || authBusy,
    followDisabled: ownProfile
      || !targetAddress
      || followUnavailable
      || (Boolean(viewerAddress) && !followReady),
    followLoading: !ownProfile
      && Boolean(viewerAddress)
      && !followUnavailable
      && (!followReady || (shouldSyncWallets && !walletsReady)),
    followUnavailable,
    followUnavailableLabel: copy.followUnavailable,
    isFollowing,
    onToggleFollow,
  };
}
