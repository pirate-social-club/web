import { afterEach, describe, expect, test } from "bun:test";
import { act, renderHook } from "@testing-library/react";
import type { InteractionAllowedContext } from "@/hooks/use-community-interaction-gate.helpers";

import { installDomGlobals } from "@/test/setup-dom";

import { useInteractionAltcha } from "./use-interaction-altcha";

installDomGlobals();

const originalDateNow = Date.now;

afterEach(() => {
  Date.now = originalDateNow;
});

function createDeferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason?: unknown) => void;
  const promise = new Promise<T>((nextResolve, nextReject) => {
    resolve = nextResolve;
    reject = nextReject;
  });
  return { promise, reject, resolve };
}

function renderAltchaHook(onMissingPayload = () => undefined) {
  return renderHook(() =>
    useInteractionAltcha({
      locale: "en",
      onMissingPayload,
    })
  );
}

describe("useInteractionAltcha", () => {
  test("passes the current payload to join completion", async () => {
    const payloads: string[] = [];
    const { result } = renderAltchaHook();

    act(() => {
      result.current.setAltchaPayload("payload_join");
    });
    await act(async () => {
      await result.current.completeAltchaJoin(
        async (payload) => {
          payloads.push(payload);
        },
        () => undefined,
      );
    });

    expect(payloads).toEqual(["payload_join"]);
    expect(result.current.altchaLoading).toBe(false);
  });

  test("calls missing payload handler without starting completion", async () => {
    let missingPayloadCalls = 0;
    let completionCalls = 0;
    const { result } = renderAltchaHook(() => {
      missingPayloadCalls += 1;
    });

    await act(async () => {
      await result.current.completeAltchaJoin(
        async () => {
          completionCalls += 1;
        },
        () => undefined,
      );
    });

    expect(missingPayloadCalls).toBe(1);
    expect(completionCalls).toBe(0);
    expect(result.current.altchaLoading).toBe(false);
  });

  test("uses Date.now as the reset key when join completion fails", async () => {
    Date.now = () => 12_345;
    const errors: Array<{ error: unknown; resetKey: number }> = [];
    const { result } = renderAltchaHook();
    const error = new Error("join failed");

    act(() => {
      result.current.setAltchaPayload("payload_join");
    });
    await act(async () => {
      await result.current.completeAltchaJoin(
        async () => {
          throw error;
        },
        (nextError, resetKey) => {
          errors.push({ error: nextError, resetKey });
        },
      );
    });

    expect(errors).toEqual([{ error, resetKey: 12_345 }]);
    expect(result.current.altchaResetKey).toBe(12_345);
    expect(result.current.altchaLoading).toBe(false);
  });

  test("passes the current payload to action completion", async () => {
    const contexts: InteractionAllowedContext[] = [];
    const { result } = renderAltchaHook();

    act(() => {
      result.current.setAltchaPayload("payload_action");
    });
    await act(async () => {
      await result.current.completeAltchaAction(
        async (context) => {
          contexts.push(context);
        },
        () => undefined,
      );
    });

    expect(contexts).toEqual([{ altchaPayload: "payload_action" }]);
    expect(result.current.altchaLoading).toBe(false);
  });

  test("increments the reset key when action completion fails", async () => {
    Date.now = () => 54_321;
    const errors: unknown[] = [];
    const { result } = renderAltchaHook();
    const error = new Error("action failed");

    act(() => {
      result.current.setAltchaPayload("payload_action");
    });
    await act(async () => {
      await result.current.completeAltchaAction(
        async () => {
          throw error;
        },
        (nextError) => {
          errors.push(nextError);
        },
      );
    });

    expect(errors).toEqual([error]);
    expect(result.current.altchaResetKey).toBe(54_321);
    expect(result.current.altchaLoading).toBe(false);
  });

  test("guards concurrent completion attempts", async () => {
    const deferred = createDeferred<void>();
    let actionCalls = 0;
    const { result } = renderAltchaHook();

    act(() => {
      result.current.setAltchaPayload("payload_action");
    });

    let first!: Promise<void>;
    let second!: Promise<void>;
    await act(async () => {
      first = result.current.completeAltchaAction(
        async () => {
          actionCalls += 1;
          await deferred.promise;
        },
        () => undefined,
      );
      second = result.current.completeAltchaAction(
        async () => {
          actionCalls += 1;
        },
        () => undefined,
      );
    });

    expect(actionCalls).toBe(1);
    expect(result.current.altchaLoading).toBe(true);

    await act(async () => {
      deferred.resolve();
      await first;
      await second;
    });

    expect(result.current.altchaLoading).toBe(false);
  });
});
