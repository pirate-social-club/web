import { describe, expect, test } from "bun:test";

import {
  createModalSetter,
  eligibility,
  gate,
  gatesPanel,
  interactionCopy,
} from "./test-fixtures.test";
import { completeCommunityJoinFromEligibility } from "./join-completion";

describe("completeCommunityJoinFromEligibility", () => {
  test("continues from supplied eligibility without a pending interaction", async () => {
    const calls: string[] = [];
    const modal = createModalSetter();

    await completeCommunityJoinFromEligibility({
      clearPendingInteraction: () => {
        calls.push("clear-pending");
      },
      closeModal: () => {
        calls.push("close");
      },
      gate: gate(),
      gatesPanel,
      getJoinEligibility: async () => eligibility("already_joined"),
      initialEligibility: eligibility("joinable"),
      interactionCopy,
      invalidateCommunityGate: (communityId) => {
        calls.push(`invalidate:${communityId}`);
      },
      joinCommunity: async (communityId) => {
        calls.push(`join:${communityId}`);
        return { status: "joined" };
      },
      openCommunity: (communityId) => {
        calls.push(`open:${communityId}`);
      },
      pendingInteraction: null,
      setModalState: modal.setModalState,
      updateCachedGate: (communityId, nextGate) => {
        calls.push(`cache:${communityId}:${nextGate.eligibility.status}`);
      },
    });

    expect(modal.modalState?.title).toBe(interactionCopy.readyTitle);
    expect(modal.modalState?.primaryAction?.label).toBe(interactionCopy.readyTitle);

    await modal.modalState?.primaryAction?.onClick?.();
    expect(calls).toEqual([
      "cache:community-1:joinable",
      "join:community-1",
      "invalidate:community-1",
      "cache:community-1:already_joined",
      "close",
      "clear-pending",
    ]);
  });

  test("keeps non-passport verification actions available after a passport refresh", async () => {
    const calls: string[] = [];
    const modal = createModalSetter();

    await completeCommunityJoinFromEligibility({
      clearPendingInteraction: () => {
        calls.push("clear-pending");
      },
      closeModal: () => {
        calls.push("close");
      },
      defaultVerificationLoadingProvider: "passport",
      gate: gate(),
      gatesPanel,
      getJoinEligibility: async () => eligibility("already_joined"),
      initialEligibility: eligibility("verification_required", {
        missing_capabilities: ["unique_human"],
        suggested_verification_provider: "self",
      }),
      interactionCopy,
      invalidateCommunityGate: (communityId) => {
        calls.push(`invalidate:${communityId}`);
      },
      openCommunity: (communityId) => {
        calls.push(`open:${communityId}`);
      },
      pendingInteraction: null,
      setModalState: modal.setModalState,
      startDefaultVerification: async ({ provider }) => {
        calls.push(`start:${provider}`);
        return { started: true };
      },
      updateCachedGate: (communityId, nextGate) => {
        calls.push(`cache:${communityId}:${nextGate.eligibility.status}`);
      },
    });

    expect(modal.modalState?.icon).toBe("self");

    await modal.modalState?.primaryAction?.onClick?.();
    expect(calls).toEqual([
      "cache:community-1:verification_required",
      "start:self",
    ]);
  });
});
