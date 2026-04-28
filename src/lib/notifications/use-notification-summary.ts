"use client";

import * as React from "react";
import type { NotificationSummary } from "@pirate/api-contracts";
import { useApi } from "@/lib/api";
import { useSession } from "@/lib/api/session-store";
import { logger } from "@/lib/logger";

const DEFAULT_SUMMARY: NotificationSummary = {
  open_task_count: 0,
  unread_activity_count: 0,
  has_unread: false,
};

const POLL_INTERVAL_MS = 30_000;

const summaryListeners = new Set<(summary: NotificationSummary) => void>();
let cachedSummary: NotificationSummary = DEFAULT_SUMMARY;

function emitSummary(nextSummary: NotificationSummary) {
  cachedSummary = nextSummary;
  for (const listener of summaryListeners) {
    listener(nextSummary);
  }
}

function updateSummary(updater: (current: NotificationSummary) => NotificationSummary) {
  emitSummary(updater(cachedSummary));
}

export function clearUnreadNotificationActivityCount() {
  updateSummary((current) => ({
    ...current,
    unread_activity_count: 0,
    has_unread: current.open_task_count > 0,
  }));
}

export function decrementUnreadNotificationActivityCount(count = 1) {
  updateSummary((current) => {
    const unreadActivityCount = Math.max(0, current.unread_activity_count - count);
    return {
      ...current,
      unread_activity_count: unreadActivityCount,
      has_unread: current.open_task_count > 0 || unreadActivityCount > 0,
    };
  });
}

export function decrementOpenNotificationTaskCount(count = 1) {
  updateSummary((current) => {
    const openTaskCount = Math.max(0, current.open_task_count - count);
    return {
      ...current,
      open_task_count: openTaskCount,
      has_unread: openTaskCount > 0 || current.unread_activity_count > 0,
    };
  });
}

export function useNotificationSummary(): NotificationSummary {
  const api = useApi();
  const session = useSession();
  const [summary, setSummary] = React.useState<NotificationSummary>(cachedSummary);

  React.useEffect(() => {
    if (!session) {
      emitSummary(DEFAULT_SUMMARY);
      setSummary(DEFAULT_SUMMARY);
      return;
    }

    let cancelled = false;

    summaryListeners.add(setSummary);

    async function fetchSummary() {
      try {
        const result = await api.notifications.getSummary();
        if (!cancelled) {
          emitSummary(result);
        }
      } catch (error) {
        logger.debug("[notifications] failed to load summary", error);
      }
    }

    fetchSummary();

    const interval = setInterval(fetchSummary, POLL_INTERVAL_MS);

    return () => {
      cancelled = true;
      clearInterval(interval);
      summaryListeners.delete(setSummary);
    };
  }, [api, session]);

  return summary;
}
