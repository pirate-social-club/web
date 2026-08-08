import { describe, expect, test } from "bun:test";
import { act, renderHook } from "@testing-library/react";
import * as React from "react";
import type {
  JoinEligibility,
  RefreshPassportWalletScoreResponse,
  RequestedVerificationCapability,
  VerificationRequirement,
} from "@pirate/api-contracts";

import { installDomGlobals } from "@/test/setup-dom";
import {
  SELF_VERIFICATION_UNAVAILABLE_MESSAGE,
  createPendingInteraction,
  eligibility,
  gate,
  gatesPanel,
  interactionCopy,
  refreshResponse,
  uniqueHumanRequirement,
} from "./test-fixtures.test";
import type {
  ModalState,
  PendingInteraction,
} from "@/hooks/use-community-interaction-gate.helpers";

import { useDefaultVerificationActions } from "./use-default-verification-actions";

installDomGlobals();

type SelfVerificationStartInput = {
  requestedCapabilities: RequestedVerificationCapability[];
  unavailableMessage: string;
  verificationRequirements?: VerificationRequirement[] | null;
  skipModal?: boolean;
};

type ZkPassportVerificationStartInput = {
  requestedCapabilities: RequestedVerificationCapability[];
  unavailableMessage: string;
  verificationRequirements?: VerificationRequirement[] | null;
};

function renderDefaultVerificationActions({
  getJoinEligibility,
  joinCommunity,
  pendingInteraction = createPendingInteraction(),
  refreshPassportWalletScore,
  startSelfVerificationFlow,
  startVeryVerification,
  startZkPassportVerificationFlow,
}: {
  getJoinEligibility?: (communityId: string) => Promise<JoinEligibility>;
  joinCommunity?: (communityId: string) => Promise<{ status: string }>;
  pendingInteraction?: PendingInteraction | null;
  refreshPassportWalletScore?: (input: { community?: string | null }) => Promise<RefreshPassportWalletScoreResponse>;
  startSelfVerificationFlow?: (input: SelfVerificationStartInput) => Promise<{
    error?: string;
    href?: string | null;
    openedModal?: boolean;
    started: boolean;
  }>;
  startVeryVerification?: () => Promise<{ started: boolean }>;
  startZkPassportVerificationFlow?: (input: ZkPassportVerificationStartInput) => Promise<{
    error?: string;
    href?: string | null;
    started: boolean;
  }>;
} = {}) {
  const calls: string[] = [];
  const errors: string[] = [];
  const selfCalls: SelfVerificationStartInput[] = [];
  const zkPassportCalls: ZkPassportVerificationStartInput[] = [];
  let currentPendingInteraction = pendingInteraction;
  const getJoinEligibilityFn = getJoinEligibility ?? (async (communityId) => {
    calls.push(`eligibility:${communityId}`);
    return eligibility("already_joined");
  });
  const joinCommunityFn = joinCommunity ?? (async (communityId) => {
    calls.push(`join:${communityId}`);
    return { status: "joined" };
  });
  const refreshPassportWalletScoreFn = refreshPassportWalletScore ?? (async (input) => {
    calls.push(`refresh:${input.community ?? ""}`);
    return refreshResponse(eligibility("already_joined"));
  });
  const startSelfVerificationFlowFn = startSelfVerificationFlow ?? (async (input) => {
    selfCalls.push(input);
    return { started: false };
  });
  const startVeryVerificationFn = startVeryVerification ?? (async () => {
    calls.push("very");
    return { started: false };
  });
  const startZkPassportVerificationFlowFn = startZkPassportVerificationFlow ?? (async (input) => {
    zkPassportCalls.push(input);
    return { started: false };
  });

  const hook = renderHook(() => {
    const [modalState, setModalState] = React.useState<ModalState | null>(null);
    const actions = useDefaultVerificationActions({
      clearPendingInteraction: () => {
        calls.push("clear-pending");
        currentPendingInteraction = null;
      },
      closeModal: () => {
        calls.push("close");
      },
      gatesPanel,
      getJoinEligibility: getJoinEligibilityFn,
      getPendingInteraction: () => currentPendingInteraction,
      interactionCopy,
      invalidateCommunityGate: (communityId) => {
        calls.push(`invalidate:${communityId}`);
      },
      joinCommunity: joinCommunityFn,
      openCommunity: (communityId) => {
        calls.push(`open:${communityId}`);
      },
      openHref: (href) => {
        calls.push(`href:${href}`);
      },
      refreshPassportWalletScore: refreshPassportWalletScoreFn,
      setModalState,
      showError: (message) => {
        errors.push(message);
      },
      startSelfVerificationFlow: startSelfVerificationFlowFn,
      startVeryVerification: startVeryVerificationFn,
      startZkPassportVerificationFlow: startZkPassportVerificationFlowFn,
      updateCachedGate: (communityId, nextGate) => {
        calls.push(`cache:${communityId}:${nextGate.eligibility.status}`);
      },
    });
    return { ...actions, modalState };
  });

  return {
    calls,
    errors,
    hook,
    get pendingInteraction() {
      return currentPendingInteraction;
    },
    selfCalls,
    zkPassportCalls,
  };
}

describe("useDefaultVerificationActions", () => {
  test("uses passport refresh eligibility and shows a ready replay action", async () => {
    const allowedCalls: string[] = [];
    const actions = renderDefaultVerificationActions({
      pendingInteraction: createPendingInteraction(gate(), () => {
        allowedCalls.push("allowed");
      }),
    });

    await act(async () => {
      const result = await actions.hook.result.current.startDefaultVerification({
        gate: gate(),
        provider: "passport",
      });
      expect(result).toEqual({ started: true });
    });

    expect(actions.hook.result.current.passportLoading).toBe(false);
    expect(actions.hook.result.current.modalState?.title).toBe(interactionCopy.readyTitle);
    expect(actions.hook.result.current.modalState?.primaryAction?.label).toBe("Reply now");

    await act(async () => {
      await actions.hook.result.current.modalState?.primaryAction?.onClick?.();
    });

    expect(actions.calls).toEqual([
      "refresh:community-1",
      "cache:community-1:already_joined",
      "close",
      "clear-pending",
    ]);
    expect(allowedCalls).toEqual(["allowed"]);
    expect(actions.pendingInteraction).toBe(null);
  });

  test("falls back to eligibility lookup after passport refresh and handles requested joins", async () => {
    const actions = renderDefaultVerificationActions({
      getJoinEligibility: async (communityId) => {
        actions.calls.push(`eligibility:${communityId}`);
        return eligibility("joinable");
      },
      joinCommunity: async (communityId) => {
        actions.calls.push(`join:${communityId}`);
        return { status: "requested" };
      },
      refreshPassportWalletScore: async (input) => {
        actions.calls.push(`refresh:${input.community ?? ""}`);
        return refreshResponse(null);
      },
    });

    await act(async () => {
      const result = await actions.hook.result.current.startDefaultVerification({
        gate: gate(),
        provider: "passport",
      });
      expect(result).toEqual({ started: true });
    });

    expect(actions.hook.result.current.modalState?.title).toBe(gatesPanel.pendingRequestTitle);
    expect(actions.hook.result.current.modalState?.icon).toBe("pending");
    expect(actions.calls).toEqual([
      "refresh:community-1",
      "eligibility:community-1",
      "cache:community-1:joinable",
      "join:community-1",
      "invalidate:community-1",
    ]);
    expect(actions.pendingInteraction).not.toBe(null);
  });

  test("reports passport refresh errors and leaves loading false", async () => {
    const actions = renderDefaultVerificationActions({
      refreshPassportWalletScore: async () => {
        throw new Error("refresh failed");
      },
    });

    await act(async () => {
      const result = await actions.hook.result.current.startDefaultVerification({
        gate: gate(),
        provider: "passport",
      });
      expect(result).toEqual({ started: false });
    });

    expect(actions.errors).toEqual(["refresh failed"]);
    expect(actions.hook.result.current.passportLoading).toBe(false);
    expect(actions.hook.result.current.modalState).toBe(null);
  });

  test("starts Very verification and closes the modal when it starts", async () => {
    const actions = renderDefaultVerificationActions({
      startVeryVerification: async () => {
        actions.calls.push("very");
        return { started: true };
      },
    });

    await act(async () => {
      const result = await actions.hook.result.current.startDefaultVerification({
        gate: gate(),
        provider: "very",
      });
      expect(result).toEqual({ started: true });
    });

    expect(actions.calls).toEqual(["very", "close"]);
  });

  test("reports missing Self verification details without starting a session", async () => {
    const emptyGate = gate("verification_required", {
      membership_gate_summaries: [],
      missing_capabilities: [],
    }, []);
    const actions = renderDefaultVerificationActions();

    await act(async () => {
      const result = await actions.hook.result.current.startDefaultVerification({
        gate: emptyGate,
        provider: "self",
      });
      expect(result).toEqual({ started: false });
    });

    expect(actions.errors).toEqual([SELF_VERIFICATION_UNAVAILABLE_MESSAGE]);
    expect(actions.selfCalls).toEqual([]);
  });

  test("starts Self verification with computed requirements and opens the returned href", async () => {
    const actions = renderDefaultVerificationActions({
      startSelfVerificationFlow: async (input) => {
        actions.selfCalls.push(input);
        return {
          href: "self://verify",
          openedModal: false,
          started: true,
        };
      },
    });
    const selfGate = gate("verification_required", {
      membership_gate_summaries: [uniqueHumanRequirement],
      missing_capabilities: ["unique_human"],
    });

    await act(async () => {
      const result = await actions.hook.result.current.startDefaultVerification({
        gate: selfGate,
        provider: "self",
      });
      expect(result).toEqual({ started: true });
    });

    expect(actions.selfCalls).toEqual([{
      requestedCapabilities: ["unique_human"],
      unavailableMessage: SELF_VERIFICATION_UNAVAILABLE_MESSAGE,
      verificationRequirements: [],
      skipModal: true,
    }]);
    expect(actions.calls).toEqual(["close", "href:self://verify"]);
  });

  test("starts ZKPassport verification instead of a passport score refresh", async () => {
    const actions = renderDefaultVerificationActions({
      startZkPassportVerificationFlow: async (input) => {
        actions.zkPassportCalls.push(input);
        return { href: "https://zkpassport.id/r", started: true };
      },
    });
    const zkPassportGate = gate("verification_required", {
      membership_gate_summaries: [{ gate_type: "nationality", accepted_providers: ["zkpassport"] }],
      missing_capabilities: ["nationality"],
    }, [{ gate_type: "nationality", accepted_providers: ["zkpassport"] }]);

    await act(async () => {
      const result = await actions.hook.result.current.startDefaultVerification({
        gate: zkPassportGate,
        provider: "zkpassport",
      });
      expect(result).toEqual({ started: true });
    });

    expect(actions.zkPassportCalls).toEqual([{
      requestedCapabilities: ["nationality"],
      unavailableMessage: "This community is missing the ZKPassport verification details needed to continue.",
      verificationRequirements: [],
    }]);
    expect(actions.calls).toEqual(["close"]);
    expect(actions.errors).toEqual([]);
  });

  test("starts ZKPassport verification for a ZKPassport-only unique-human gate", async () => {
    const actions = renderDefaultVerificationActions({
      startZkPassportVerificationFlow: async (input) => {
        actions.zkPassportCalls.push(input);
        return { href: "https://zkpassport.id/r", started: true };
      },
    });
    const zkPassportGate = gate("verification_required", {
      membership_gate_summaries: [{
        accepted_providers: ["zkpassport"],
        gate_type: "unique_human",
      }],
      missing_capabilities: ["unique_human"],
    }, [{
      accepted_providers: ["zkpassport"],
      gate_type: "unique_human",
    }]);

    await act(async () => {
      const result = await actions.hook.result.current.startDefaultVerification({
        gate: zkPassportGate,
        provider: "zkpassport",
      });
      expect(result).toEqual({ started: true });
    });

    expect(actions.zkPassportCalls).toEqual([{
      requestedCapabilities: ["unique_human"],
      unavailableMessage: "This community is missing the ZKPassport verification details needed to continue.",
      verificationRequirements: [],
    }]);
    expect(actions.calls).toEqual(["close"]);
    expect(actions.errors).toEqual([]);
  });

  test("reports missing ZKPassport verification details without starting a session", async () => {
    const emptyGate = gate("verification_required", {
      membership_gate_summaries: [],
      missing_capabilities: [],
    }, []);
    const actions = renderDefaultVerificationActions();

    await act(async () => {
      const result = await actions.hook.result.current.startDefaultVerification({
        gate: emptyGate,
        provider: "zkpassport",
      });
      expect(result).toEqual({ started: false });
    });

    expect(actions.errors).toEqual([
      "This community is missing the ZKPassport verification details needed to continue.",
    ]);
    expect(actions.zkPassportCalls).toEqual([]);
  });
});
