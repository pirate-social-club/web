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
type ViewerSummaryState = {
  consecutiveFailures: number;
  summary: NotificationSummary;
};

const viewerSummaryStates = new Map<string, ViewerSummaryState>();
let activeViewerKey: string | null = null;
let activeViewerState: ViewerSummaryState = {
  consecutiveFailures: 0,
  summary: DEFAULT_SUMMARY,
};
let summaryRequestInFlight: { key: string; promise: Promise<NotificationSummary> } | null = null;

function getSummaryForViewer(viewerKey: string | null): NotificationSummary {
  return viewerKey ? viewerSummaryStates.get(viewerKey)?.summary ?? DEFAULT_SUMMARY : DEFAULT_SUMMARY;
}

function activateViewer(viewerKey: string | null) {
  if (activeViewerKey === viewerKey) return;

  activeViewerKey = viewerKey;
  if (!viewerKey) {
    activeViewerState = {
      consecutiveFailures: 0,
      summary: DEFAULT_SUMMARY,
    };
    return;
  }

  activeViewerState = {
    // A viewer switch starts a fresh backoff window. A cached badge summary is
    // safe to restore, but failures from another session must not delay it.
    consecutiveFailures: 0,
    summary: getSummaryForViewer(viewerKey),
  };
  viewerSummaryStates.set(viewerKey, activeViewerState);
}

function persistActiveViewerState() {
  if (activeViewerKey) {
    viewerSummaryStates.set(activeViewerKey, activeViewerState);
  }
}

function emitSummary(nextSummary: NotificationSummary) {
  activeViewerState = {
    ...activeViewerState,
    summary: nextSummary,
  };
  persistActiveViewerState();
  for (const listener of summaryListeners) {
    listener(nextSummary);
  }
}

function updateSummary(updater: (current: NotificationSummary) => NotificationSummary) {
  if (!activeViewerKey) return;
  emitSummary(updater(activeViewerState.summary));
}

function nextSummaryPollDelayMs(success: boolean, viewerKey: string): number {
  if (activeViewerKey !== viewerKey) return POLL_INTERVAL_MS;

  if (success) {
    activeViewerState = {
      ...activeViewerState,
      consecutiveFailures: 0,
    };
    persistActiveViewerState();
    return POLL_INTERVAL_MS;
  }

  activeViewerState = {
    ...activeViewerState,
    consecutiveFailures: activeViewerState.consecutiveFailures + 1,
  };
  persistActiveViewerState();
  const index = Math.min(activeViewerState.consecutiveFailures - 1, FAILURE_BACKOFF_MS.length - 1);
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
  const viewerKey = session?.user.id ?? null;
  const [summary, setSummary] = React.useState<NotificationSummary>(() => getSummaryForViewer(viewerKey));
  const renderedSummary = activeViewerKey === viewerKey ? summary : getSummaryForViewer(viewerKey);

  React.useEffect(() => {
    activateViewer(viewerKey);
    setSummary(getSummaryForViewer(viewerKey));

    if (!session) {
      emitSummary(DEFAULT_SUMMARY);
      setSummary(DEFAULT_SUMMARY);
      return;
    }

    let cancelled = false;
    let timeoutId: ReturnType<typeof setTimeout> | null = null;
    const sessionKey = session.accessToken;
    const sessionViewerKey = session.user.id;

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

      if (!cancelled) {
        scheduleNextFetch(nextSummaryPollDelayMs(success, sessionViewerKey));
      }
    }

    fetchSummary();

    return () => {
      cancelled = true;
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
      summaryListeners.delete(setSummary);
    };
  }, [api, session, viewerKey]);

  return renderedSummary;
}

export function __resetNotificationSummaryForTests() {
  summaryListeners.clear();
  viewerSummaryStates.clear();
  activeViewerKey = null;
  activeViewerState = {
    consecutiveFailures: 0,
    summary: DEFAULT_SUMMARY,
  };
  summaryRequestInFlight = null;
}
