"use client";

import * as React from "react";
import type { NotificationFeedResponse as ApiNotificationFeedResponse } from "@pirate/api-contracts";
import type { NotificationTasksResponse as ApiNotificationTasksResponse } from "@pirate/api-contracts";

import { navigate } from "@/app/router";
import { useApi } from "@/lib/api";
import { logger } from "@/lib/logger";
import { clearUnreadNotificationActivityCount, decrementOpenNotificationTaskCount } from "@/lib/notifications/use-notification-summary";
import { useSession } from "@/lib/api/session-store";
import { NotificationInboxPage, resolveNotificationActivityHref } from "@/components/compositions/notification-inbox-page/notification-inbox-page";

import { getRouteAuthDescription } from "./route-status-copy";
import { AuthRequiredRouteState } from "./route-shell";
import { useRouteMessages } from "./route-core";

export function InboxPlaceholderPage() {
  const api = useApi();
  const session = useSession();
  const { copy } = useRouteMessages();
  const [tasks, setTasks] = React.useState<ApiNotificationTasksResponse>({ items: [] });
  const [feed, setFeed] = React.useState<ApiNotificationFeedResponse>({ items: [], next_cursor: null });
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    let cancelled = false;

    if (!session) {
      setTasks({ items: [] });
      setFeed({ items: [], next_cursor: null });
      setLoading(false);
      return () => { cancelled = true; };
    }

    setLoading(true);

    async function load() {
      let readAt: string | null = null;

      try {
        try {
          readAt = new Date().toISOString();
          await api.notifications.markRead();
          clearUnreadNotificationActivityCount();
        } catch (error) {
          logger.warn("[inbox] failed to mark notifications read", error);
          readAt = null;
        }

        const [tasksResult, feedResult] = await Promise.all([
          api.notifications.getTasks(),
          api.notifications.getFeed(),
        ]);

        if (!cancelled) {
          setTasks(tasksResult);
          setFeed({
            ...feedResult,
            items: feedResult.items.map((item) => ({
              ...item,
              receipt: {
                ...item.receipt,
                read_at: item.receipt.read_at ?? readAt,
                seen_at: item.receipt.seen_at ?? readAt,
              },
            })),
          });
        }
      } catch (error) {
        logger.warn("[inbox] failed to load notification inbox", error);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void load();
    return () => { cancelled = true; };
  }, [api, session]);

  if (!session) {
    return <AuthRequiredRouteState description={getRouteAuthDescription("inbox")} hideTitleOnMobile title={copy.inbox.title} />;
  }

  return (
    <NotificationInboxPage
      activityItems={feed.items}
      loading={loading}
      onDismissTask={(task) => {
        api.notifications.dismissTask({ task_id: task.task_id }).then(() => {
          setTasks((prev) => ({ items: prev.items.filter((t) => t.task_id !== task.task_id) }));
          decrementOpenNotificationTaskCount();
        }).catch((error) => {
          logger.warn("[inbox] failed to dismiss notification task", {
            error,
            taskId: task.task_id,
          });
        });
      }}
      onOpenActivityItem={(item) => {
        const href = resolveNotificationActivityHref(item);
        if (href) navigate(href);
      }}
      onVerifyTask={(task) => navigate(task.type === "membership_review"
        ? `/c/${task.subject_id}/mod/requests`
        : `/c/${task.subject_id}/mod/namespace`)}
      tasks={tasks.items}
    />
  );
}
