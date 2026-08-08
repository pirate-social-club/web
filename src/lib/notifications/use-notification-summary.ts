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
const FAILURE_BACKOFF_MS = [60_000, 120_000, 300_000];

const summaryListeners = new Set<(summary: NotificationSummary) => void>();
let cachedSummary: NotificationSummary = DEFAULT_SUMMARY;
let summaryRequestInFlight: { key: string; promise: Promise<NotificationSummary> } | null = null;
let consecutiveSummaryFailures = 0;

function emitSummary(nextSummary: NotificationSummary) {
  cachedSummary = nextSummary;
  for (const listener of summaryListeners) {
    listener(nextSummary);
  }
}

function updateSummary(updater: (current: NotificationSummary) => NotificationSummary) {
  emitSummary(updater(cachedSummary));
}

function nextSummaryPollDelayMs(success: boolean): number {
  if (success) {
    consecutiveSummaryFailures = 0;
    return POLL_INTERVAL_MS;
  }

  consecutiveSummaryFailures += 1;
  const index = Math.min(consecutiveSummaryFailures - 1, FAILURE_BACKOFF_MS.length - 1);
  return FAILURE_BACKOFF_MS[index] ?? POLL_INTERVAL_MS;
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
    let timeoutId: ReturnType<typeof setTimeout> | null = null;
    const sessionKey = session.accessToken;

    summaryListeners.add(setSummary);

    function scheduleNextFetch(delayMs: number) {
      if (cancelled) return;
      timeoutId = setTimeout(fetchSummary, delayMs);
    }

    async function fetchSummary() {
      let success = false;
      let request = summaryRequestInFlight;
      try {
        if (!request || request.key !== sessionKey) {
          request = {
            key: sessionKey,
            promise: api.notifications.getSummary(),
          };
          summaryRequestInFlight = request;
        }

        const result = await request.promise;
        success = true;
        if (!cancelled) {
          emitSummary(result);
        }
      } catch (error) {
        logger.debug("[notifications] failed to load summary", error);
      } finally {
        if (summaryRequestInFlight === request) {
          summaryRequestInFlight = null;
        }
      }

      scheduleNextFetch(nextSummaryPollDelayMs(success));
    }

    fetchSummary();

    return () => {
      cancelled = true;
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
      summaryListeners.delete(setSummary);
    };
  }, [api, session]);

  return summary;
}
