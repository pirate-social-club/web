import { describe, expect, test } from "bun:test";
import { act, renderHook, waitFor } from "@testing-library/react";
import type {
  CommunityHandleMeResponse,
  CommunityHandleStatusResponse,
  JoinEligibility as ApiJoinEligibility,
} from "@pirate/api-contracts";

import { installDomGlobals } from "@/test/setup-dom";

import {
  useCommunityMembershipActions,
  type UseCommunityMembershipActionsOptions,
} from "./use-community-membership-actions";

installDomGlobals();

function eligibility(status: ApiJoinEligibility["status"]): ApiJoinEligibility {
  return { status } as ApiJoinEligibility;
}

function availableStatus(overrides: Partial<CommunityHandleStatusResponse> = {}): CommunityHandleStatusResponse {
  return {
    available: true,
    claims_enabled: true,
    namespace: "c",
    reason: null,
    ...overrides,
  };
}

function noHandle(): CommunityHandleMeResponse {
  return { handle: null };
}

function createOptions(
  overrides: Partial<UseCommunityMembershipActionsOptions> = {},
): UseCommunityMembershipActionsOptions {
  return {
    altchaPayload: null,
    altchaRequired: false,
    communityId: "com_test",
    eligibility: null,
    handleClaim: { phase: "intro" },
    handleClaimApi: {
      getHandleStatus: async () => availableStatus(),
      getMyHandle: async () => noHandle(),
    },
    handleClaimCommunityId: "com_test",
    handleClaimDismissal: {
      dismiss: () => undefined,
      isDismissed: () => false,
    },
    handleJoin: async () => "joined",
    sessionUserId: "usr_test",
    ...overrides,
  };
}

describe("useCommunityMembershipActions", () => {
  test("opens the join request modal for requestable communities", async () => {
    let joinCalls = 0;
    const { result } = renderHook(() =>
      useCommunityMembershipActions(createOptions({
        eligibility: eligibility("requestable"),
        handleJoin: async () => {
          joinCalls += 1;
          return "requested";
        },
      }))
    );

    await act(async () => {
      await result.current.handlePrimaryJoinAction();
    });

    expect(result.current.joinRequestModalOpen).toBe(true);
    expect(result.current.joinRequestError).toBe(null);
    expect(joinCalls).toBe(0);
  });

  test("opens proof-of-work modal when Altcha is required without a payload", async () => {
    const { result } = renderHook(() =>
      useCommunityMembershipActions(createOptions({
        altchaPayload: null,
        altchaRequired: true,
        eligibility: eligibility("joinable"),
      }))
    );

    await act(async () => {
      await result.current.handlePrimaryJoinAction();
    });

    expect(result.current.proofOfWorkModalOpen).toBe(true);
  });

  test("submits a newly verified proof immediately and closes the modal after joining", async () => {
    const submittedPayloads: Array<string | null | undefined> = [];
    const { result } = renderHook(() =>
      useCommunityMembershipActions(createOptions({
        altchaRequired: true,
        eligibility: eligibility("verification_required"),
        handleJoin: async (options) => {
          submittedPayloads.push(options?.altchaPayload);
          return "joined";
        },
      }))
    );

    act(() => {
      result.current.setProofOfWorkModalOpen(true);
    });
    await act(async () => {
      await result.current.handleProofOfWorkVerified("fresh-proof");
    });

    expect(submittedPayloads).toEqual(["fresh-proof"]);
    expect(result.current.proofOfWorkModalOpen).toBe(false);
    expect(result.current.proofOfWorkRetryKey).toBe(0);
  });

  test("closes the proof-of-work modal after submitting an approval request", async () => {
    const { result } = renderHook(() =>
      useCommunityMembershipActions(createOptions({
        altchaRequired: true,
        eligibility: eligibility("verification_required"),
        handleJoin: async () => "requested",
      }))
    );

    act(() => {
      result.current.setProofOfWorkModalOpen(true);
    });
    await act(async () => {
      await result.current.handleProofOfWorkVerified("fresh-proof");
    });

    expect(result.current.proofOfWorkModalOpen).toBe(false);
  });

  test("keeps the proof-of-work modal open and requests one fresh challenge after failure", async () => {
    const { result } = renderHook(() =>
      useCommunityMembershipActions(createOptions({
        altchaRequired: true,
        eligibility: eligibility("verification_required"),
        handleJoin: async () => "failed",
      }))
    );

    act(() => {
      result.current.setProofOfWorkModalOpen(true);
    });
    await act(async () => {
      await result.current.handleProofOfWorkVerified("consumed-proof");
    });

    expect(result.current.proofOfWorkModalOpen).toBe(true);
    expect(result.current.proofOfWorkRetryKey).toBe(1);
  });

  test("calls handleJoin and opens handle claim when joining succeeds", async () => {
    const statusChecks: string[] = [];
    const myHandleChecks: string[] = [];
    const { result } = renderHook(() =>
      useCommunityMembershipActions(createOptions({
        handleClaimApi: {
          getHandleStatus: async (communityId) => {
            statusChecks.push(communityId);
            return availableStatus();
          },
          getMyHandle: async (communityId) => {
            myHandleChecks.push(communityId);
            return noHandle();
          },
        },
        handleJoin: async () => "joined",
      }))
    );

    await act(async () => {
      await result.current.handlePrimaryJoinAction();
    });

    expect(statusChecks).toEqual(["com_test"]);
    expect(myHandleChecks).toEqual(["com_test"]);
    expect(result.current.handleClaimModalOpen).toBe(true);
  });

  test("delegates primary join action when auth is required", async () => {
    let authRequests = 0;
    let joinCalls = 0;
    const { result } = renderHook(() =>
      useCommunityMembershipActions(createOptions({
        handleJoin: async () => {
          joinCalls += 1;
          return "joined";
        },
        onAuthRequired: () => {
          authRequests += 1;
        },
        sessionUserId: null,
      }))
    );

    await act(async () => {
      await result.current.handlePrimaryJoinAction();
    });

    expect(authRequests).toBe(1);
    expect(joinCalls).toBe(0);
  });

  test("submits join request notes, invalidates gate, and closes the modal on success", async () => {
    const notes: Array<string | null | undefined> = [];
    const invalidated: string[] = [];
    const { result } = renderHook(() =>
      useCommunityMembershipActions(createOptions({
        handleJoin: async (options) => {
          notes.push(options?.note);
          return "requested";
        },
        invalidateCommunityGate: (communityId) => {
          invalidated.push(communityId);
        },
      }))
    );

    act(() => {
      result.current.handleJoinRequestModalOpenChange(true);
    });
    expect(result.current.joinRequestModalOpen).toBe(true);

    await act(async () => {
      await result.current.handleJoinRequestSubmit("Let me in");
    });

    expect(notes).toEqual(["Let me in"]);
    expect(invalidated).toEqual(["com_test"]);
    expect(result.current.joinRequestModalOpen).toBe(false);
    expect(result.current.joinRequestSubmitting).toBe(false);
  });

  test("sets join request error when submission fails", async () => {
    const { result } = renderHook(() =>
      useCommunityMembershipActions(createOptions({
        handleJoin: async () => "failed",
      }))
    );

    await act(async () => {
      await result.current.handleJoinRequestSubmit("Please");
    });

    expect(result.current.joinRequestError).toBe("Could not submit your request. Try again.");
    expect(result.current.joinRequestSubmitting).toBe(false);
  });

  test("dismisses handle claim when the modal closes before success", () => {
    let dismissals = 0;
    const { result } = renderHook(() =>
      useCommunityMembershipActions(createOptions({
        handleClaim: { phase: "confirm" },
        handleClaimDismissal: {
          dismiss: () => {
            dismissals += 1;
          },
          isDismissed: () => false,
        },
      }))
    );

    act(() => {
      result.current.handleClaimModalOpenChange(true);
      result.current.handleClaimModalOpenChange(false);
    });

    expect(dismissals).toBe(1);
  });

  test("does not dismiss handle claim when the modal closes after success", () => {
    let dismissals = 0;
    const { result } = renderHook(() =>
      useCommunityMembershipActions(createOptions({
        handleClaim: { phase: "success" },
        handleClaimDismissal: {
          dismiss: () => {
            dismissals += 1;
          },
          isDismissed: () => false,
        },
      }))
    );

    act(() => {
      result.current.handleClaimModalOpenChange(false);
    });

    expect(dismissals).toBe(0);
  });

  test("not-now dismisses and closes handle claim", async () => {
    let dismissals = 0;
    const { result } = renderHook(() =>
      useCommunityMembershipActions(createOptions({
        handleClaimDismissal: {
          dismiss: () => {
            dismissals += 1;
          },
          isDismissed: () => false,
        },
        handleJoin: async () => "joined",
      }))
    );

    await act(async () => {
      await result.current.handlePrimaryJoinAction();
    });
    expect(result.current.handleClaimModalOpen).toBe(true);

    act(() => {
      result.current.handleClaimNotNow();
    });

    expect(dismissals).toBe(1);
    expect(result.current.handleClaimModalOpen).toBe(false);
  });

  test("eligibility transition to joined opens handle claim", async () => {
    const { result, rerender } = renderHook(
      (nextEligibility: ApiJoinEligibility) =>
        useCommunityMembershipActions(createOptions({
          eligibility: nextEligibility,
        })),
      { initialProps: eligibility("joinable") },
    );

    rerender(eligibility("already_joined"));

    await waitFor(() => {
      expect(result.current.handleClaimModalOpen).toBe(true);
    });
  });

  test("skips handle claim lookup when dismissal is already stored", async () => {
    let statusChecks = 0;
    const { result } = renderHook(() =>
      useCommunityMembershipActions(createOptions({
        handleClaimApi: {
          getHandleStatus: async () => {
            statusChecks += 1;
            return availableStatus();
          },
          getMyHandle: async () => noHandle(),
        },
        handleClaimDismissal: {
          dismiss: () => undefined,
          isDismissed: () => true,
        },
        handleJoin: async () => "joined",
      }))
    );

    await act(async () => {
      await result.current.handlePrimaryJoinAction();
    });

    expect(statusChecks).toBe(0);
    expect(result.current.handleClaimModalOpen).toBe(false);
  });

  test("does not open handle claim when handles are unavailable", async () => {
    const myHandleChecks: string[] = [];
    const { result } = renderHook(() =>
      useCommunityMembershipActions(createOptions({
        handleClaimApi: {
          getHandleStatus: async () => availableStatus({ available: false }),
          getMyHandle: async (communityId) => {
            myHandleChecks.push(communityId);
            return noHandle();
          },
        },
        handleJoin: async () => "joined",
      }))
    );

    await act(async () => {
      await result.current.handlePrimaryJoinAction();
    });

    expect(myHandleChecks).toEqual([]);
    expect(result.current.handleClaimModalOpen).toBe(false);
  });
});
