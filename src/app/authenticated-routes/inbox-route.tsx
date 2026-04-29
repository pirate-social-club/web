"use client";

import * as React from "react";
import type { RoyaltyActivityItem } from "@pirate/api-contracts";
import type { RoyaltyActivityResponse } from "@pirate/api-contracts";
import type { NotificationFeedResponse as ApiNotificationFeedResponse } from "@pirate/api-contracts";
import type { NotificationTasksResponse as ApiNotificationTasksResponse } from "@pirate/api-contracts";
import type { NotificationFeedItem, UserTask } from "@pirate/api-contracts";

import { navigate } from "@/app/router";
import { useApi } from "@/lib/api";
import { trackAnalyticsEvent } from "@/lib/analytics";
import { logger } from "@/lib/logger";
import { decrementUnreadNotificationActivityCount, decrementOpenNotificationTaskCount } from "@/lib/notifications/use-notification-summary";
import { useSession } from "@/lib/api/session-store";
import {
  NotificationInboxPage,
  resolveNotificationActivityHref,
  resolveNotificationTaskHref,
} from "@/components/compositions/notifications/inbox-page/notification-inbox-page";
import { buildPublicProfilePath } from "@/lib/profile-routing";

import { AuthRequiredRouteState } from "@/app/authenticated-helpers/route-shell";
import { useRouteMessages } from "@/hooks/use-route-messages";
import { EmptyInboxState } from "@/components/states/empty-inbox-state";

const EMPTY_ROYALTY_ACTIVITY: RoyaltyActivityResponse = {
  items: [],
  next_cursor: null,
};

type ProfileLink = {
  href: string;
  label: string;
};

type NotificationTaskPersistence = "synthetic" | "persisted";

type EnrichedRoyaltyActivityItem = RoyaltyActivityItem & {
  buyerProfile?: ProfileLink | null;
};

function unreadFeedEventIds(feed: ApiNotificationFeedResponse): string[] {
  return feed.items
    .filter((item) => item.event.type !== "xmtp_message" && !item.receipt.read_at)
    .map((item) => item.event.event_id);
}

function markFeedItemsRead(feed: ApiNotificationFeedResponse, eventIds: string[], readAt: string): ApiNotificationFeedResponse {
  if (eventIds.length === 0) return feed;
  const eventIdSet = new Set(eventIds);
  return {
    ...feed,
    items: feed.items.map((item) => {
      if (!eventIdSet.has(item.event.event_id)) return item;
      return {
        ...item,
        receipt: {
          ...item.receipt,
          read_at: item.receipt.read_at ?? readAt,
          seen_at: item.receipt.seen_at ?? readAt,
        },
      };
    }),
  };
}

function markRoyaltyActivityItemsRead(activity: RoyaltyActivityResponse, eventIds: string[], readAt: string): RoyaltyActivityResponse {
  if (eventIds.length === 0) return activity;
  const eventIdSet = new Set(eventIds);
  return {
    ...activity,
    items: activity.items.map((item) => (
      eventIdSet.has(item.event_id)
        ? { ...item, read_at: item.read_at ?? readAt }
        : item
    )),
  };
}

function isSyntheticTask(task: UserTask): boolean {
  return task.task_id.startsWith("synth:");
}

function taskPersistence(task: UserTask): NotificationTaskPersistence {
  return isSyntheticTask(task) ? "synthetic" : "persisted";
}

function canAutoClearTaskOnOpen(task: UserTask): boolean {
  if (isSyntheticTask(task)) return false;
  return task.type !== "unique_human_verification_required";
}

function appendCurrentRouteReturnTo(href: string): string {
  if (typeof window === "undefined") return href;

  const url = new URL(href, window.location.origin);
  if (url.origin !== window.location.origin) return href;

  const currentPath = `${window.location.pathname}${window.location.search}${window.location.hash}`;
  url.searchParams.set("return_to", currentPath);
  return `${url.pathname}${url.search}${url.hash}`;
}

function trackFeedMarkedReadEvents(items: NotificationFeedItem[], readMode: "auto_visible_load") {
  const countsByType = new Map<string, number>();

  for (const item of items) {
    if (item.event.type === "xmtp_message") {
      continue;
    }
    countsByType.set(item.event.type, (countsByType.get(item.event.type) ?? 0) + 1);
  }

  for (const [notificationType, count] of countsByType) {
    trackAnalyticsEvent({
      eventName: "notification_marked_read",
      properties: {
        notification_kind: "activity",
        notification_type: notificationType,
        read_mode: readMode,
        open_surface: "inbox",
        count,
      },
    });
  }
}

function trackRoyaltyMarkedReadEvents(count: number, readMode: "auto_visible_load") {
  if (count <= 0) {
    return;
  }

  trackAnalyticsEvent({
    eventName: "notification_marked_read",
    properties: {
      notification_kind: "activity",
      notification_type: "royalty_earned",
      read_mode: readMode,
      open_surface: "inbox",
      count,
    },
  });
}

export function InboxPlaceholderPage() {
  const api = useApi();
  const session = useSession();
  const { copy } = useRouteMessages();
  const [tasks, setTasks] = React.useState<ApiNotificationTasksResponse>({ items: [] });
  const [feed, setFeed] = React.useState<ApiNotificationFeedResponse>({ items: [], next_cursor: null });
  const [loading, setLoading] = React.useState(true);
  const [royaltyActivity, setRoyaltyActivity] = React.useState<RoyaltyActivityResponse>(EMPTY_ROYALTY_ACTIVITY);
  const [royaltiesLoading, setRoyaltiesLoading] = React.useState(false);
  const [royaltyProfilesByWallet, setRoyaltyProfilesByWallet] = React.useState<Record<string, ProfileLink | null>>({});

  const refreshRoyalties = React.useCallback(async () => {
    try {
      setRoyaltiesLoading(true);
      const activityResult = await api.royalties.listActivity({ limit: 50 });
      const unreadEventIds = activityResult.items
        .filter((item) => !item.read_at)
        .map((item) => item.event_id);
      let readAt: string | null = null;
        if (unreadEventIds.length > 0) {
          try {
            readAt = new Date().toISOString();
            await api.notifications.markRead({ event_ids: unreadEventIds });
            decrementUnreadNotificationActivityCount(unreadEventIds.length);
            trackRoyaltyMarkedReadEvents(unreadEventIds.length, "auto_visible_load");
          } catch (error) {
            logger.warn("[inbox] failed to mark royalty activity read", error);
            readAt = null;
        }
      }
      setRoyaltyActivity(readAt ? markRoyaltyActivityItemsRead(activityResult, unreadEventIds, readAt) : activityResult);
    } catch (error) {
      logger.debug("[inbox] failed to load royalties", error);
    } finally {
      setRoyaltiesLoading(false);
    }
  }, [api]);

  React.useEffect(() => {
    if (!session) {
      return;
    }
    void refreshRoyalties();
  }, [refreshRoyalties, session]);

  React.useEffect(() => {
    let cancelled = false;

    if (!session) {
      setTasks({ items: [] });
      setFeed({ items: [], next_cursor: null });
      setLoading(false);
      setRoyaltyActivity(EMPTY_ROYALTY_ACTIVITY);
      return () => { cancelled = true; };
    }

    setLoading(true);

    async function load() {
      try {
        const [tasksResult, feedResult] = await Promise.all([
          api.notifications.getTasks(),
          api.notifications.getFeed(),
        ]);

        const unreadEventIds = unreadFeedEventIds(feedResult);
        let readAt: string | null = null;
        if (unreadEventIds.length > 0) {
          try {
            readAt = new Date().toISOString();
            await api.notifications.markRead({ event_ids: unreadEventIds });
            decrementUnreadNotificationActivityCount(unreadEventIds.length);
            trackFeedMarkedReadEvents(feedResult.items.filter((item) => unreadEventIds.includes(item.event.event_id)), "auto_visible_load");
          } catch (error) {
            logger.warn("[inbox] failed to mark visible notifications read", error);
            readAt = null;
          }
        }

        if (!cancelled) {
          setTasks(tasksResult);
          setFeed(readAt ? markFeedItemsRead(feedResult, unreadEventIds, readAt) : feedResult);
        }
      } catch (error) {
        logger.debug("[inbox] failed to load notification inbox", error);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void load();
    return () => { cancelled = true; };
  }, [api, session]);

  React.useEffect(() => {
    if (!session) {
      return;
    }

    const walletAddresses = royaltyActivity.items
      .map((item) => item.buyer_wallet_address)
      .map((address) => address?.trim().toLowerCase() ?? "")
      .filter(Boolean);
    const uniqueWallets = Array.from(new Set(walletAddresses))
      .filter((address) => !(address in royaltyProfilesByWallet));

    if (uniqueWallets.length === 0) {
      return;
    }

    let cancelled = false;
    void Promise.all(uniqueWallets.map(async (walletAddress) => {
      try {
        const resolution = await api.publicProfiles.getByWalletAddress(walletAddress);
        const label = resolution.profile.global_handle.label;
        return {
          walletAddress,
          profile: {
            href: buildPublicProfilePath(label),
            label,
          },
        };
      } catch {
        return { walletAddress, profile: null };
      }
    })).then((entries) => {
      if (cancelled) return;
      setRoyaltyProfilesByWallet((current) => {
        const next = { ...current };
        for (const entry of entries) {
          next[entry.walletAddress] = entry.profile;
        }
        return next;
      });
    });

    return () => { cancelled = true; };
  }, [api.publicProfiles, royaltyActivity.items, royaltyProfilesByWallet, session]);

  if (!session) {
    return (
      <AuthRequiredRouteState
        ctaLabel="Connect"
        description="Get notified when someone replies, mentions you, or sends a tip."
        headline="Your inbox is waiting"
        hideTitleOnMobile
        illustration={<EmptyInboxState className="py-0" />}
        title={copy.inbox.title}
      />
    );
  }

  const activityItems = feed.items.filter((item) => item.event.type !== "xmtp_message");
  const enrichedRoyaltyActivityItems: EnrichedRoyaltyActivityItem[] = royaltyActivity.items.map((item) => ({
    ...item,
    buyerProfile: item.buyer_wallet_address
      ? royaltyProfilesByWallet[item.buyer_wallet_address.trim().toLowerCase()] ?? null
      : null,
  }));
  const unreadInstallPromoCount = tasks.items.length + activityItems.filter((item) => !item.receipt.read_at).length;

  return (
    <>
      <NotificationInboxPage
        activityItems={activityItems}
        installPromoUnreadCount={unreadInstallPromoCount}
        loading={loading}
        onOpenActivityItem={(item) => {
          const href = resolveNotificationActivityHref(item);
          if (!href) return;
          trackAnalyticsEvent({
            eventName: "notification_opened",
            communityId: typeof item.event.payload?.community_id === "string" ? item.event.payload.community_id : undefined,
            postId: item.event.subject_type === "post" ? item.event.subject_id : undefined,
            commentId: item.event.object_type === "comment" ? item.event.object_id : undefined,
            properties: {
              notification_kind: "activity",
              notification_type: item.event.type,
              open_surface: "inbox",
            },
          });
          navigate(href);
        }}
        onVerifyTask={(task) => {
          const resolvedHref = resolveNotificationTaskHref(task);
          const href = task.type === "unique_human_verification_required" && resolvedHref
            ? appendCurrentRouteReturnTo(resolvedHref)
            : resolvedHref;
          if (!href) return;
          const autoClearTask = canAutoClearTaskOnOpen(task);
          trackAnalyticsEvent({
            eventName: "notification_opened",
            properties: {
              notification_kind: "task",
              task_type: task.type,
              task_persistence: taskPersistence(task),
              open_surface: "inbox",
              task_auto_cleared_on_open: autoClearTask,
            },
          });
          if (autoClearTask) {
            setTasks((current) => ({ ...current, items: current.items.filter((t) => t.task_id !== task.task_id) }));
            decrementOpenNotificationTaskCount();
            void api.notifications.dismissTask({ task_id: task.task_id }).catch((error) => {
              logger.debug("[inbox] failed to dismiss task", error);
            });
          }
          navigate(href);
        }}
        royaltyActivityItems={enrichedRoyaltyActivityItems}
        royaltyActivityLoading={royaltiesLoading}

        tasks={tasks.items}
        title="Notifications"
      />
    </>
  );
}

