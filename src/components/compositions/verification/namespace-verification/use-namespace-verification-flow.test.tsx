import { describe, expect, test } from "bun:test";
import { installDomGlobals } from "@/test/setup-dom";
import { renderHook, act } from "@testing-library/react";

import { useNamespaceVerificationFlow } from "./use-namespace-verification-flow";
import type {
  NamespaceVerificationCallbacks,
  NamespaceVerificationStartResult,
  NamespaceVerificationCompleteResult,
} from "@/components/compositions/verification/verify-namespace-modal/verify-namespace-modal.types";

installDomGlobals();

function mockStartResult(
  overrides: Partial<NamespaceVerificationStartResult> = {},
): NamespaceVerificationStartResult {
  return {
    namespaceVerificationSessionId: "session-123",
    family: "hns",
    rootLabel: "test",
    challengeHost: "_pirate.test",
    challengeTxtValue: "challenge-abc",
    challengePayload: null,
    challengeExpiresAt: null,
    status: "challenge_required",
    operationClass: null,
    pirateDnsAuthorityVerified: null,
    setupNameservers: null,
    ...overrides,
  };
}

function mockCompleteResult(
  overrides: Partial<NamespaceVerificationCompleteResult> = {},
): NamespaceVerificationCompleteResult {
  return {
    status: "verified",
    namespaceVerificationId: "verification-456",
    failureReason: null,
    ...overrides,
  };
}

function createMockCallbacks(
  overrides: Partial<NamespaceVerificationCallbacks> = {},
): NamespaceVerificationCallbacks {
  return {
    onStartSession: () => Promise.resolve(mockStartResult()),
    onCompleteSession: () => Promise.resolve(mockCompleteResult()),
    onGetSession: () => Promise.resolve(mockStartResult()),
    ...overrides,
  };
}

describe("useNamespaceVerificationFlow", () => {
  test("initializes to idle state with defaults", () => {
    const { result } = renderHook(() =>
      useNamespaceVerificationFlow({
        callbacks: createMockCallbacks(),
        enabled: true,
      }),
    );

    expect(result.current.state).toBe("idle");
    expect(result.current.rootLabel).toBe("");
    expect(result.current.activeFamily).toBe("hns");
    expect(result.current.sessionId).toBeNull();
    expect(result.current.challengeHost).toBeNull();
    expect(result.current.challengeTxtValue).toBeNull();
    expect(result.current.signature).toBe("");
    expect(result.current.isIdle).toBe(true);
    expect(result.current.isStarting).toBe(false);
    expect(result.current.busy).toBe(false);
  });

  test("start success transitions to challenge_ready", async () => {
    const { result } = renderHook(() =>
      useNamespaceVerificationFlow({
        callbacks: createMockCallbacks({
          onStartSession: ({ rootLabel }) =>
            Promise.resolve(
              mockStartResult({
                namespaceVerificationSessionId: "session-789",
                rootLabel,
                status: "challenge_required",
              }),
            ),
        }),
        enabled: true,
      }),
    );

    act(() => {
      result.current.actions.setRootLabel("myroot");
    });

    await act(async () => {
      await result.current.actions.start();
    });

    expect(result.current.state).toBe("challenge_ready");
    expect(result.current.sessionId).toBe("session-789");
    expect(result.current.rootLabel).toBe("myroot");
    expect(result.current.isChallengeReady).toBe(true);
    expect(result.current.busy).toBe(false);
  });

  test("spaces input canonicalizes emoji roots before starting", async () => {
    let submittedRootLabel = "";

    const { result } = renderHook(() =>
      useNamespaceVerificationFlow({
        callbacks: createMockCallbacks({
          onStartSession: ({ rootLabel }) => {
            submittedRootLabel = rootLabel;
            return Promise.resolve(
              mockStartResult({
                family: "spaces",
                rootLabel,
                status: "challenge_required",
              }),
            );
          },
        }),
        enabled: true,
        initialFamily: "spaces",
      }),
    );

    act(() => {
      result.current.actions.setRootLabel("\u{1F1F5}\u{1F1F8}");
    });

    expect(result.current.rootLabel).toBe("xn--t77hga");
    expect(result.current.canonicalNamespaceKey).toBe("@xn--t77hga");
    expect(result.current.routePreviewPath).toBe("/c/@xn--t77hga");

    await act(async () => {
      await result.current.actions.start();
    });

    expect(submittedRootLabel).toBe("xn--t77hga");
  });

  test("hns route preview stays unprefixed", () => {
    const { result } = renderHook(() =>
      useNamespaceVerificationFlow({
        callbacks: createMockCallbacks(),
        enabled: true,
        initialFamily: "hns",
      }),
    );

    act(() => {
      result.current.actions.setRootLabel("MyRoot");
    });

    expect(result.current.rootLabel).toBe("myroot");
    expect(result.current.canonicalNamespaceKey).toBe("myroot");
    expect(result.current.routePreviewPath).toBe("/c/myroot");
  });

  test("start returns dns_setup_required", async () => {
    const { result } = renderHook(() =>
      useNamespaceVerificationFlow({
        callbacks: createMockCallbacks({
          onStartSession: () =>
            Promise.resolve(mockStartResult({ status: "dns_setup_required" })),
        }),
        enabled: true,
      }),
    );

    act(() => {
      result.current.actions.setRootLabel("myroot");
    });

    await act(async () => {
      await result.current.actions.start();
    });

    expect(result.current.state).toBe("dns_setup_required");
    expect(result.current.isDnsSetupRequired).toBe(true);
  });

  test("check setup re-inspects dns setup and reports unchanged result", async () => {
    let completeInput: Parameters<NamespaceVerificationCallbacks["onCompleteSession"]>[0] | null = null;
    const { result } = renderHook(() =>
      useNamespaceVerificationFlow({
        callbacks: createMockCallbacks({
          onStartSession: () =>
            Promise.resolve(mockStartResult({ status: "dns_setup_required" })),
          onCompleteSession: (input) => {
            completeInput = input;
            return Promise.resolve(mockCompleteResult({ status: "dns_setup_required" }));
          },
          onGetSession: () =>
            Promise.resolve(mockStartResult({ status: "dns_setup_required" })),
        }),
        enabled: true,
      }),
    );

    act(() => {
      result.current.actions.setRootLabel("myroot");
    });

    await act(async () => {
      await result.current.actions.start();
    });

    await act(async () => {
      await result.current.actions.restart();
    });

    expect(result.current.state).toBe("dns_setup_required");
    expect(result.current.isDnsSetupRequired).toBe(true);
    expect(result.current.lastCheckStatus).toBe("dns_setup_required");
    expect(completeInput).toEqual({
      namespaceVerificationSessionId: "session-123",
      family: "hns",
      restartChallenge: true,
    });
  });

  test("start returns challenge_pending", async () => {
    const { result } = renderHook(() =>
      useNamespaceVerificationFlow({
        callbacks: createMockCallbacks({
          onStartSession: () =>
            Promise.resolve(mockStartResult({ status: "challenge_pending" })),
        }),
        enabled: true,
      }),
    );

    act(() => {
      result.current.actions.setRootLabel("myroot");
    });

    await act(async () => {
      await result.current.actions.start();
    });

    expect(result.current.state).toBe("challenge_pending");
    expect(result.current.isChallengePending).toBe(true);
  });

  test("verify success transitions to verified and calls onVerified", async () => {
    let verifiedId: string | null = null;

    const { result } = renderHook(() =>
      useNamespaceVerificationFlow({
        callbacks: createMockCallbacks({
          onStartSession: () =>
            Promise.resolve(
              mockStartResult({
                status: "challenge_required",
                namespaceVerificationSessionId: "session-verify",
              }),
            ),
          onCompleteSession: () =>
            Promise.resolve(
              mockCompleteResult({
                status: "verified",
                namespaceVerificationId: "verified-789",
              }),
            ),
        }),
        enabled: true,
        onVerified: (id) => {
          verifiedId = id;
        },
      }),
    );

    act(() => {
      result.current.actions.setRootLabel("myroot");
    });

    await act(async () => {
      await result.current.actions.start();
    });

    expect(result.current.state).toBe("challenge_ready");

    await act(async () => {
      await result.current.actions.verify();
    });

    expect(result.current.state).toBe("verified");
    expect(result.current.namespaceVerificationId).toBe("verified-789");
    expect(result.current.isVerified).toBe(true);
    expect(verifiedId).toBe("verified-789");
  });

  test("verified state survives clearing activeSessionId after parent saves completion", async () => {
    let activeSessionId: string | null = "session-verify";

    const { result, rerender } = renderHook(
      ({ sessionId }: { sessionId: string | null }) =>
        useNamespaceVerificationFlow({
          callbacks: createMockCallbacks({
            onGetSession: () =>
              Promise.resolve(
                mockStartResult({
                  status: "challenge_required",
                  namespaceVerificationSessionId: "session-verify",
                }),
              ),
            onCompleteSession: () =>
              Promise.resolve(
                mockCompleteResult({
                  status: "verified",
                  namespaceVerificationId: "verified-789",
                }),
              ),
          }),
          enabled: true,
          activeSessionId: sessionId,
          onSessionCleared: () => {
            activeSessionId = null;
          },
        }),
      { initialProps: { sessionId: activeSessionId } },
    );

    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 50));
    });

    await act(async () => {
      await result.current.actions.verify();
    });

    rerender({ sessionId: activeSessionId });

    expect(result.current.state).toBe("verified");
    expect(result.current.isVerified).toBe(true);
    expect(result.current.namespaceVerificationId).toBe("verified-789");
  });

  test("verify returns expired", async () => {
    const { result } = renderHook(() =>
      useNamespaceVerificationFlow({
        callbacks: createMockCallbacks({
          onStartSession: () =>
            Promise.resolve(
              mockStartResult({
                status: "challenge_required",
                namespaceVerificationSessionId: "session-exp",
              }),
            ),
          onCompleteSession: () =>
            Promise.resolve(mockCompleteResult({ status: "expired" })),
        }),
        enabled: true,
      }),
    );

    act(() => {
      result.current.actions.setRootLabel("myroot");
    });

    await act(async () => {
      await result.current.actions.start();
    });

    await act(async () => {
      await result.current.actions.verify();
    });

    expect(result.current.state).toBe("expired");
    expect(result.current.isExpired).toBe(true);
  });

  test("verify returns failed with failureReason", async () => {
    const { result } = renderHook(() =>
      useNamespaceVerificationFlow({
        callbacks: createMockCallbacks({
          onStartSession: () =>
            Promise.resolve(
              mockStartResult({
                status: "challenge_required",
                namespaceVerificationSessionId: "session-fail",
              }),
            ),
          onCompleteSession: () =>
            Promise.resolve(
              mockCompleteResult({
                status: "failed",
                failureReason: "dns_lookup_failed",
              }),
            ),
        }),
        enabled: true,
      }),
    );

    act(() => {
      result.current.actions.setRootLabel("myroot");
    });

    await act(async () => {
      await result.current.actions.start();
    });

    await act(async () => {
      await result.current.actions.verify();
    });

    expect(result.current.state).toBe("failed");
    expect(result.current.isFailed).toBe(true);
    expect(result.current.failureReason).toBe("dns_lookup_failed");
  });

  test("restart with sessionId refreshes challenge via onCompleteSession + onGetSession", async () => {
    const { result } = renderHook(() =>
      useNamespaceVerificationFlow({
        callbacks: createMockCallbacks({
          onStartSession: () =>
            Promise.resolve(
              mockStartResult({
                status: "challenge_required",
                namespaceVerificationSessionId: "session-restart",
              }),
            ),
          onCompleteSession: () =>
            Promise.resolve(mockCompleteResult()),
          onGetSession: () =>
            Promise.resolve(
              mockStartResult({
                status: "challenge_required",
                namespaceVerificationSessionId: "session-restart",
                challengeTxtValue: "refreshed-challenge",
              }),
            ),
        }),
        enabled: true,
      }),
    );

    act(() => {
      result.current.actions.setRootLabel("myroot");
    });

    await act(async () => {
      await result.current.actions.start();
    });

    expect(result.current.state).toBe("challenge_ready");
    expect(result.current.challengeTxtValue).toBe("challenge-abc");

    await act(async () => {
      await result.current.actions.restart();
    });

    expect(result.current.state).toBe("challenge_ready");
    expect(result.current.challengeTxtValue).toBe("refreshed-challenge");
  });

  test("restart without sessionId starts a new session", async () => {
    let startCalls = 0;

    const { result } = renderHook(() =>
      useNamespaceVerificationFlow({
        callbacks: createMockCallbacks({
          onStartSession: ({ rootLabel }) => {
            startCalls++;
            return Promise.resolve(
              mockStartResult({
                status: "challenge_required",
                namespaceVerificationSessionId: `session-${startCalls}`,
                rootLabel,
              }),
            );
          },
        }),
        enabled: true,
      }),
    );

    act(() => {
      result.current.actions.setRootLabel("myroot");
    });

    await act(async () => {
      await result.current.actions.start();
    });

    expect(result.current.sessionId).toBe("session-1");

    act(() => {
      result.current.actions.reset();
    });

    expect(result.current.state).toBe("idle");
    expect(result.current.sessionId).toBeNull();

    act(() => {
      result.current.actions.setRootLabel("newroot");
    });

    await act(async () => {
      await result.current.actions.restart();
    });

    expect(result.current.state).toBe("challenge_ready");
    expect(result.current.sessionId).toBe("session-2");
    expect(result.current.rootLabel).toBe("newroot");
  });

  test("reset clears state and calls onSessionCleared", () => {
    let cleared = false;

    const { result } = renderHook(() =>
      useNamespaceVerificationFlow({
        callbacks: createMockCallbacks(),
        enabled: true,
        onSessionCleared: () => {
          cleared = true;
        },
      }),
    );

    act(() => {
      result.current.actions.setRootLabel("myroot");
      result.current.actions.setSignature("sig");
    });

    act(() => {
      result.current.actions.reset();
    });

    expect(result.current.state).toBe("idle");
    expect(result.current.rootLabel).toBe("");
    expect(result.current.signature).toBe("");
    expect(result.current.sessionId).toBeNull();
    expect(cleared).toBe(true);
  });

  test("resumes activeSessionId on mount", async () => {
    const { result } = renderHook(() =>
      useNamespaceVerificationFlow({
        callbacks: createMockCallbacks({
          onGetSession: () =>
            Promise.resolve(
              mockStartResult({
                status: "challenge_pending",
                namespaceVerificationSessionId: "resume-session",
                rootLabel: "resumed",
              }),
            ),
        }),
        enabled: true,
        activeSessionId: "resume-session",
      }),
    );

    expect(result.current.resuming).toBe(true);
    expect(result.current.isStarting).toBe(true);

    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 50));
    });

    expect(result.current.state).toBe("challenge_pending");
    expect(result.current.sessionId).toBe("resume-session");
    expect(result.current.rootLabel).toBe("resumed");
    expect(result.current.resuming).toBe(false);
  });
});
