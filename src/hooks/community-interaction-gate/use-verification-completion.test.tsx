import { describe, expect, test } from "bun:test";
import { renderHook } from "@testing-library/react";
import type { JoinEligibility } from "@pirate/api-contracts";

import { installDomGlobals } from "@/test/setup-dom";
import {
  createModalSetter,
  createPendingInteraction,
  eligibility,
  gate,
  gatesPanel,
  interactionCopy,
  uniqueHumanRequirement,
} from "./test-fixtures.test";
import type {
  PendingInteraction,
} from "@/hooks/use-community-interaction-gate.helpers";

import { useVerificationCompletion } from "./use-verification-completion";

installDomGlobals();

function renderVerificationCompletion({
  getJoinEligibility = async () => eligibility("already_joined"),
  joinCommunity = async () => ({ status: "joined" }),
  pendingInteraction = createPendingInteraction(),
}: {
  getJoinEligibility?: (communityId: string) => Promise<JoinEligibility>;
  joinCommunity?: (communityId: string) => Promise<{ status: string }>;
  pendingInteraction?: PendingInteraction | null;
} = {}) {
  const modal = createModalSetter();
  const calls: string[] = [];
  const errors: string[] = [];
  const successes: string[] = [];
  let currentPendingInteraction = pendingInteraction;
  const hook = renderHook(() =>
    useVerificationCompletion({
      clearPendingInteraction: () => {
        calls.push("clear-pending");
        currentPendingInteraction = null;
      },
      closeModal: () => {
        calls.push("close");
      },
      gatesPanel,
      getJoinEligibility,
      interactionCopy,
      invalidateCommunityGate: (communityId) => {
        calls.push(`invalidate:${communityId}`);
      },
      joinCommunity,
      openCommunity: (communityId) => {
        calls.push(`open:${communityId}`);
      },
      setModalState: modal.setModalState,
      showError: (message) => {
        errors.push(message);
      },
      showSuccess: (message) => {
        successes.push(message);
      },
      updateCachedGate: (communityId, nextGate) => {
        calls.push(`cache:${communityId}:${nextGate.eligibility.status}`);
      },
    })
  );

  return {
    calls,
    errors,
    hook,
    modal,
    get pendingInteraction() {
      return currentPendingInteraction;
    },
    successes,
  };
}

describe("useVerificationCompletion", () => {
  test("shows ready success without API calls when no interaction is pending", async () => {
    let eligibilityCalls = 0;
    let joinCalls = 0;
    const { hook, successes } = renderVerificationCompletion({
      getJoinEligibility: async () => {
        eligibilityCalls += 1;
        return eligibility("already_joined");
      },
      joinCommunity: async () => {
        joinCalls += 1;
        return { status: "joined" };
      },
      pendingInteraction: null,
    });

    await hook.result.current.completeVerificationJoin(null);

    expect(successes).toEqual([interactionCopy.readyDescription]);
    expect(eligibilityCalls).toBe(0);
    expect(joinCalls).toBe(0);
  });

  test("joins after verification and shows ready replay action", async () => {
    const eligibilityQueue = [eligibility("joinable"), eligibility("already_joined")];
    const allowedCalls: string[] = [];
    const verification = renderVerificationCompletion({
      getJoinEligibility: async () => eligibilityQueue.shift() ?? eligibility("already_joined"),
      joinCommunity: async () => ({ status: "joined" }),
      pendingInteraction: createPendingInteraction(gate(), () => {
        allowedCalls.push("allowed");
      }),
    });

    await verification.hook.result.current.completeVerificationJoin(verification.pendingInteraction);

    expect(verification.modal.modalState?.title).toBe(interactionCopy.readyTitle);
    expect(verification.modal.modalState?.primaryAction?.label).toBe("Reply now");

    await verification.modal.modalState?.primaryAction?.onClick?.();

    expect(verification.calls).toEqual([
      "cache:community-1:joinable",
      "invalidate:community-1",
      "cache:community-1:already_joined",
      "close",
      "clear-pending",
    ]);
    expect(allowedCalls).toEqual(["allowed"]);
    expect(verification.pendingInteraction).toBe(null);
  });

  test("shows pending request when join returns requested", async () => {
    const verification = renderVerificationCompletion({
      getJoinEligibility: async () => eligibility("joinable"),
      joinCommunity: async () => ({ status: "requested" }),
    });

    await verification.hook.result.current.completeVerificationJoin(verification.pendingInteraction);

    expect(verification.modal.modalState?.title).toBe(gatesPanel.pendingRequestTitle);
    expect(verification.modal.modalState?.icon).toBe("pending");
    expect(verification.calls).toEqual([
      "cache:community-1:joinable",
      "invalidate:community-1",
    ]);
    expect(verification.pendingInteraction).not.toBe(null);
  });

  test("shows ready replay action when eligibility is already joined", async () => {
    const allowedCalls: string[] = [];
    const verification = renderVerificationCompletion({
      getJoinEligibility: async () => eligibility("already_joined"),
      pendingInteraction: createPendingInteraction(gate(), () => {
        allowedCalls.push("allowed");
      }),
    });

    await verification.hook.result.current.completeVerificationJoin(verification.pendingInteraction);
    await verification.modal.modalState?.primaryAction?.onClick?.();

    expect(verification.modal.modalState?.title).toBe(interactionCopy.readyTitle);
    expect(verification.calls).toEqual([
      "cache:community-1:already_joined",
      "close",
      "clear-pending",
    ]);
    expect(allowedCalls).toEqual(["allowed"]);
    expect(verification.pendingInteraction).toBe(null);
  });

  test("shows blocked modal when refreshed eligibility is still blocked", async () => {
    const verification = renderVerificationCompletion({
      getJoinEligibility: async () => eligibility("gate_failed"),
    });

    await verification.hook.result.current.completeVerificationJoin(verification.pendingInteraction);

    expect(verification.modal.modalState?.icon).toBe("blocked");
    expect(verification.modal.modalState?.requirements).toEqual([uniqueHumanRequirement]);
    expect(verification.pendingInteraction).not.toBe(null);
  });

  test("shows error and keeps pending interaction when eligibility refresh fails", async () => {
    const verification = renderVerificationCompletion({
      getJoinEligibility: async () => {
        throw new Error("refresh failed");
      },
    });

    await verification.hook.result.current.completeVerificationJoin(verification.pendingInteraction);

    expect(verification.errors).toEqual(["refresh failed"]);
    expect(verification.pendingInteraction).not.toBe(null);
  });

  test("shows error and keeps pending interaction when join fails", async () => {
    const verification = renderVerificationCompletion({
      getJoinEligibility: async () => eligibility("joinable"),
      joinCommunity: async () => {
        throw new Error("join failed");
      },
    });

    await verification.hook.result.current.completeVerificationJoin(verification.pendingInteraction);

    expect(verification.errors).toEqual(["join failed"]);
    expect(verification.pendingInteraction).not.toBe(null);
  });
});
