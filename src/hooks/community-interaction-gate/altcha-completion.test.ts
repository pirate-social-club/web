import { describe, expect, test } from "bun:test";
import { ApiError } from "@/lib/api/client";

import {
  altchaRequirement,
  createModalSetter,
  createPendingInteraction,
  eligibility,
  gate,
  gatesPanel,
  interactionCopy,
} from "./test-fixtures.test";
import type {
  InteractionAllowedContext,
} from "@/hooks/use-community-interaction-gate.helpers";
import {
  completeAltchaAction,
  completeAltchaJoin,
  type AltchaCommunitiesApi,
} from "./altcha-completion";

describe("completeAltchaJoin", () => {
  test("submits the payload and shows the pending request state", async () => {
    const calls: string[] = [];
    const modal = createModalSetter();
    const communitiesApi: AltchaCommunitiesApi = {
      getJoinEligibility: async () => eligibility("pending_request"),
      join: async (communityId, _body, options) => {
        calls.push(`join:${communityId}:${options?.altchaPayload ?? ""}`);
        return { status: "requested" };
      },
    };

    await completeAltchaJoin({
      clearPendingInteraction: () => {
        calls.push("clear-pending");
      },
      closeModal: () => {
        calls.push("close");
      },
      communitiesApi,
      gatesPanel,
      interactionCopy,
      invalidateCommunityGate: (communityId) => {
        calls.push(`invalidate:${communityId}`);
      },
      payload: "proof",
      pendingInteraction: createPendingInteraction(gate("verification_required", {}, [altchaRequirement])),
      setModalState: modal.setModalState,
      updateCachedGate: () => {
        calls.push("cache");
      },
    });

    expect(calls).toEqual(["join:community-1:proof", "invalidate:community-1"]);
    expect(modal.modalState?.title).toBe(gatesPanel.pendingRequestTitle);
    expect(modal.modalState?.icon).toBe("pending");
  });

  test("builds the ready action after Altcha join succeeds", async () => {
    const calls: string[] = [];
    const modal = createModalSetter();
    const communitiesApi: AltchaCommunitiesApi = {
      getJoinEligibility: async () => eligibility("already_joined"),
      join: async () => ({ status: "joined" }),
    };

    await completeAltchaJoin({
      clearPendingInteraction: () => {
        calls.push("clear-pending");
      },
      closeModal: () => {
        calls.push("close");
      },
      communitiesApi,
      gatesPanel,
      interactionCopy,
      invalidateCommunityGate: (communityId) => {
        calls.push(`invalidate:${communityId}`);
      },
      payload: "proof",
      pendingInteraction: createPendingInteraction(gate("verification_required", {}, [altchaRequirement]), () => {
        calls.push("allowed");
      }),
      setModalState: modal.setModalState,
      updateCachedGate: (communityId, nextGate) => {
        calls.push(`cache:${communityId}:${nextGate.eligibility.status}`);
      },
    });

    expect(modal.modalState?.title).toBe(interactionCopy.readyTitle);
    expect(modal.modalState?.primaryAction?.label).toBe("Reply now");

    await modal.modalState?.primaryAction?.onClick?.();
    expect(calls).toEqual([
      "invalidate:community-1",
      "cache:community-1:already_joined",
      "close",
      "clear-pending",
      "allowed",
    ]);
  });

  test("re-enters the interaction gate after authoritative membership refresh", async () => {
    const calls: string[] = [];
    const modal = createModalSetter();
    const pendingInteraction = createPendingInteraction(
      gate("verification_required", {}, [altchaRequirement]),
    );
    const communitiesApi: AltchaCommunitiesApi = {
      getJoinEligibility: async () => eligibility("already_joined"),
      join: async () => ({ status: "joined" }),
    };

    await completeAltchaJoin({
      clearPendingInteraction: () => calls.push("clear-pending"),
      closeModal: () => calls.push("close"),
      communitiesApi,
      gatesPanel,
      interactionCopy,
      invalidateCommunityGate: (communityId) => calls.push(`invalidate:${communityId}`),
      payload: "join-proof",
      pendingInteraction,
      rerunJoinedInteraction: (interaction, joinedGate) => {
        calls.push(`rerun:${interaction.action}:${joinedGate.eligibility.status}`);
      },
      setModalState: modal.setModalState,
      updateCachedGate: (communityId, nextGate) => {
        calls.push(`cache:${communityId}:${nextGate.eligibility.status}`);
      },
    });

    expect(calls).toEqual([
      "invalidate:community-1",
      "cache:community-1:already_joined",
      "close",
      "clear-pending",
      "rerun:reply_post:already_joined",
    ]);
    expect(modal.modalState).toBeNull();
  });
});

describe("completeAltchaAction", () => {
  test("runs the pending interaction with the Altcha context", async () => {
    const calls: Array<string | InteractionAllowedContext> = [];

    await completeAltchaAction({
      clearPendingInteraction: () => {
        calls.push("clear-pending");
      },
      closeModal: () => {
        calls.push("close");
      },
      context: { altchaPayload: "proof" },
      invalidateCommunityGate: () => undefined,
      pendingInteraction: createPendingInteraction(gate("already_joined", {}, [altchaRequirement]), (context) => {
        calls.push(context ?? {});
      }),
    });

    expect(calls).toEqual([
      { altchaPayload: "proof" },
      "clear-pending",
      "close",
    ]);
  });

  test("invalidates deferred membership disagreement and keeps the action retryable", async () => {
    const calls: string[] = [];
    const rejection = new ApiError(
      "eligibility_failed",
      "Join this community to comment",
      403,
      false,
      { reason: "membership_required" },
    );

    await expect(completeAltchaAction({
      clearPendingInteraction: () => calls.push("clear-pending"),
      closeModal: () => calls.push("close"),
      context: { altchaPayload: "action-proof" },
      invalidateCommunityGate: (communityId) => calls.push(`invalidate:${communityId}`),
      pendingInteraction: createPendingInteraction(
        gate("already_joined", {}, [altchaRequirement]),
        () => {
          throw rejection;
        },
      ),
    })).rejects.toBe(rejection);

    expect(calls).toEqual(["invalidate:community-1"]);
  });

  test("keeps the modal and pending interaction open when the action fails", async () => {
    const calls: string[] = [];
    const error = new Error("submit failed");

    await expect(completeAltchaAction({
      clearPendingInteraction: () => calls.push("clear-pending"),
      closeModal: () => calls.push("close"),
      context: { altchaPayload: "proof" },
      invalidateCommunityGate: () => undefined,
      pendingInteraction: createPendingInteraction(gate("already_joined", {}, [altchaRequirement]), () => {
        throw error;
      }),
    })).rejects.toBe(error);

    expect(calls).toEqual([]);
  });
});
