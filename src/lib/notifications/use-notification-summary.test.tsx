import { beforeEach, describe, expect, mock, test } from "bun:test";
import { act, renderHook, waitFor } from "@testing-library/react";
import type { NotificationSummary } from "@pirate/api-contracts";

import { installDomGlobals } from "@/test/setup-dom";

installDomGlobals();

type TestSession = {
  accessToken: string;
  user: { id: string };
};

let currentSession: TestSession | null = null;
const getSummary = mock<() => Promise<NotificationSummary>>();
const fakeApi = {
  notifications: {
    getSummary,
  },
};

mock.module("@/lib/api", () => ({
  useApi: () => fakeApi,
}));

mock.module("@/lib/api/session-store", () => ({
  useSession: () => currentSession,
}));

const {
  __resetNotificationSummaryForTests,
  useNotificationSummary,
} = await import("./use-notification-summary");

function session(id: string, accessToken = `${id}-token`): TestSession {
  return { accessToken, user: { id } };
}

function summary(overrides: Partial<NotificationSummary> = {}): NotificationSummary {
  return {
    has_unread: false,
    open_task_count: 0,
    unread_activity_count: 0,
    ...overrides,
  };
}

type RecordedTimeout = {
  callback: () => void;
  delayMs: number;
};

function installTimeoutRecorder() {
  const originalSetTimeout = globalThis.setTimeout;
  const originalClearTimeout = globalThis.clearTimeout;
  const delays: number[] = [];
  const pending = new Map<number, RecordedTimeout>();
  let nextId = 1;

  globalThis.setTimeout = ((callback: TimerHandler, delay?: number) => {
    const id = nextId++;
    const delayMs = delay ?? 0;
    delays.push(delayMs);
    pending.set(id, {
      callback: callback as () => void,
      delayMs,
    });
    return id;
  }) as typeof setTimeout;
  globalThis.clearTimeout = ((id: number) => {
    pending.delete(id);
  }) as typeof clearTimeout;

  return {
    delays,
    pending,
    restore() {
      globalThis.setTimeout = originalSetTimeout;
      globalThis.clearTimeout = originalClearTimeout;
    },
  };
}

async function flushFetchCycle() {
  await act(async () => {
    await Promise.resolve();
    await Promise.resolve();
  });
}

async function runNextTimeout(pending: Map<number, RecordedTimeout>) {
  const next = pending.entries().next().value as [number, RecordedTimeout] | undefined;
  expect(next).toBeDefined();
  if (!next) return;

  pending.delete(next[0]);
  await act(async () => {
    next[1].callback();
    await Promise.resolve();
    await Promise.resolve();
  });
}

beforeEach(() => {
  __resetNotificationSummaryForTests();
  currentSession = null;
  getSummary.mockReset();
});

describe("useNotificationSummary", () => {
  test("does not show one viewer's cached badge to another viewer", async () => {
    let resolveViewerA: ((value: NotificationSummary) => void) | undefined;
    let resolveViewerB: ((value: NotificationSummary) => void) | undefined;
    getSummary
      .mockImplementationOnce(() => new Promise((resolve) => {
        resolveViewerA = resolve;
      }))
      .mockImplementationOnce(() => new Promise((resolve) => {
        resolveViewerB = resolve;
      }))
      .mockImplementation(() => Promise.resolve(summary({ unread_activity_count: 3, has_unread: true })));

    currentSession = session("viewer_a");
    const view = renderHook(() => useNotificationSummary());
    expect(view.result.current).toEqual(summary());

    await act(async () => {
      resolveViewerA?.(summary({ unread_activity_count: 3, has_unread: true }));
    });
    await waitFor(() => expect(view.result.current.unread_activity_count).toBe(3));

    await act(async () => {
      currentSession = session("viewer_b");
      view.rerender();
    });
    expect(view.result.current).toEqual(summary());

    await act(async () => {
      resolveViewerB?.(summary({ open_task_count: 2, has_unread: true }));
    });
    await waitFor(() => expect(view.result.current.open_task_count).toBe(2));

    await act(async () => {
      currentSession = session("viewer_a", "viewer-a-refreshed-token");
      view.rerender();
    });
    expect(view.result.current.unread_activity_count).toBe(3);
  });

  test("ignores a late response from the previous viewer", async () => {
    let resolveViewerA: ((value: NotificationSummary) => void) | undefined;
    let resolveViewerB: ((value: NotificationSummary) => void) | undefined;
    getSummary
      .mockImplementationOnce(() => new Promise((resolve) => {
        resolveViewerA = resolve;
      }))
      .mockImplementationOnce(() => new Promise((resolve) => {
        resolveViewerB = resolve;
      }));

    currentSession = session("viewer_a");
    const view = renderHook(() => useNotificationSummary());

    await act(async () => {
      currentSession = session("viewer_b");
      view.rerender();
    });

    await act(async () => {
      resolveViewerA?.(summary({ unread_activity_count: 7, has_unread: true }));
    });
    expect(view.result.current).toEqual(summary());

    await act(async () => {
      resolveViewerB?.(summary({ unread_activity_count: 1, has_unread: true }));
    });
    await waitFor(() => expect(view.result.current.unread_activity_count).toBe(1));
  });

  test("starts a fresh failure backoff window after a viewer switch", async () => {
    const timeouts = installTimeoutRecorder();
    getSummary.mockImplementation(() => Promise.reject(new Error("summary unavailable")));
    currentSession = session("viewer_a");
    const view = renderHook(() => useNotificationSummary());

    try {
      await flushFetchCycle();
      expect(timeouts.delays.at(-1)).toBe(60_000);

      await runNextTimeout(timeouts.pending);
      expect(timeouts.delays.at(-1)).toBe(120_000);

      await runNextTimeout(timeouts.pending);
      expect(timeouts.delays.at(-1)).toBe(300_000);

      await act(async () => {
        currentSession = session("viewer_b");
        view.rerender();
        await Promise.resolve();
        await Promise.resolve();
      });

      expect(timeouts.delays.at(-1)).toBe(60_000);
    } finally {
      view.unmount();
      timeouts.restore();
    }
  });

  test("escalates sustained failures within one viewer to the maximum backoff", async () => {
    const timeouts = installTimeoutRecorder();
    getSummary.mockImplementation(() => Promise.reject(new Error("summary unavailable")));
    currentSession = session("viewer_a");
    const view = renderHook(() => useNotificationSummary());

    try {
      await flushFetchCycle();
      expect(timeouts.delays.at(-1)).toBe(60_000);

      await runNextTimeout(timeouts.pending);
      expect(timeouts.delays.at(-1)).toBe(120_000);

      await runNextTimeout(timeouts.pending);
      expect(timeouts.delays.at(-1)).toBe(300_000);
    } finally {
      view.unmount();
      timeouts.restore();
    }
  });
});
