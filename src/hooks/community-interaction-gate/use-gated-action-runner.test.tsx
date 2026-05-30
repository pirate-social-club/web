import { describe, expect, test } from "bun:test";
import { act, renderHook } from "@testing-library/react";
import * as React from "react";
import type { MembershipGateSummary } from "@pirate/api-contracts";

import { installDomGlobals } from "@/test/setup-dom";
import {
  altchaGateEvaluation,
  altchaRequirement,
  gate,
  interactionCopy,
  uniqueHumanRequirement,
} from "./test-fixtures";
import type {
  CommunityGateData,
  ModalState,
  PendingInteraction,
} from "@/hooks/use-community-interaction-gate.helpers";

import { useGatedActionRunner } from "./use-gated-action-runner";

installDomGlobals();

function renderRunner({
  connect,
  gateData = gate("already_joined"),
  isAuthOrigin = () => true,
  loadCommunityGate,
  sessionAccessToken = "token",
}: {
  connect?: (() => void) | null;
  gateData?: CommunityGateData;
  isAuthOrigin?: () => boolean;
  loadCommunityGate?: (communityId: string) => Promise<CommunityGateData>;
  sessionAccessToken?: string | null;
} = {}) {
  const calls: string[] = [];
  const errors: string[] = [];
  const infos: Array<{
    message: string;
    options?: { action?: { label: string; onClick: () => void } };
  }> = [];
  let pendingInteraction: PendingInteraction | null = null;
  const loadCommunityGateFn = loadCommunityGate ?? (async (communityId) => {
    calls.push(`load:${communityId}`);
    return gateData;
  });

  const hook = renderHook(() => {
    const [modalState, setModalState] = React.useState<ModalState | null>(null);
    const run = useGatedActionRunner({
      altchaLoading: false,
      buildAltchaBody: ({ action, scope }) => `altcha:${action}:${scope}`,
      buildAuthUrl: (path) => `auth:${path}`,
      closeModal: () => {
        calls.push("close");
      },
      completeAltchaJoin: async () => {
        calls.push("complete-join");
      },
      connect,
      defaultVerificationLoadingProvider: null,
      interactionCopy,
      invalidateCommunityGate: (communityId) => {
        calls.push(`invalidate:${communityId}`);
      },
      isAuthOrigin,
      loadCommunityGate: loadCommunityGateFn,
      openAuthHref: (href) => {
        calls.push(`href:${href}`);
      },
      openCommunity: (communityId) => {
        calls.push(`open:${communityId}`);
      },
      routeKind: "post",
      sessionAccessToken,
      setModalState,
      setPendingInteraction: (nextPendingInteraction) => {
        pendingInteraction = nextPendingInteraction;
      },
      showError: (message) => {
        errors.push(message);
      },
      showInfo: (message, options) => {
        infos.push({ message, options });
      },
      startDefaultVerification: async ({ provider }) => {
        calls.push(`verify:${provider}`);
        return { started: true };
      },
    });
    return { modalState, run };
  });

  return {
    calls,
    errors,
    hook,
    infos,
    get pendingInteraction() {
      return pendingInteraction;
    },
  };
}

describe("useGatedActionRunner", () => {
  test("blocks unauthenticated actions with an Open in Pirate auth link off canonical origin", async () => {
    const runner = renderRunner({
      isAuthOrigin: () => false,
      sessionAccessToken: null,
    });

    await act(async () => {
      const result = await runner.hook.result.current.run({
        action: "vote_post",
        communityId: "community-1",
        onAllowed: () => undefined,
        postId: "post-1",
      });
      expect(result).toBe("blocked");
    });

    expect(runner.infos[0]?.message).toBe(interactionCopy.connectToContinue);
    expect(runner.infos[0]?.options?.action?.label).toBe(interactionCopy.openInPirate);

    runner.infos[0]?.options?.action?.onClick();
    expect(runner.calls).toEqual(["href:auth:/p/post-1"]);
  });

  test("uses Privy connect for unauthenticated actions on canonical origin", async () => {
    const runner = renderRunner({
      connect: () => {
        runner.calls.push("connect");
      },
      isAuthOrigin: () => true,
      sessionAccessToken: null,
    });

    await act(async () => {
      const result = await runner.hook.result.current.run({
        action: "reply_post",
        communityId: "community-1",
        onAllowed: () => undefined,
        postId: "post-1",
      });
      expect(result).toBe("blocked");
    });

    expect(runner.calls).toEqual(["connect"]);
    expect(runner.infos).toEqual([]);
  });

  test("runs allowed actions immediately when no Altcha action gate applies", async () => {
    const runner = renderRunner();
    const allowedCalls: string[] = [];

    await act(async () => {
      const result = await runner.hook.result.current.run({
        action: "vote_post",
        communityId: "community-1",
        onAllowed: () => {
          allowedCalls.push("allowed");
        },
      });
      expect(result).toBe("allowed");
    });

    expect(allowedCalls).toEqual(["allowed"]);
    expect(runner.pendingInteraction).toBe(null);
    expect(runner.hook.result.current.modalState).toBe(null);
  });

  test("runs allowed actions immediately after PoW-gated membership is already joined", async () => {
    const runner = renderRunner({
      gateData: gate("already_joined", {}, [altchaRequirement]),
    });
    const allowedCalls: string[] = [];

    await act(async () => {
      const result = await runner.hook.result.current.run({
        action: "vote_post",
        communityId: "community-1",
        onAllowed: () => {
          allowedCalls.push("allowed");
        },
        postId: "post-1",
        voteValue: 1,
      });
      expect(result).toBe("allowed");
    });

    expect(allowedCalls).toEqual(["allowed"]);
    expect(runner.pendingInteraction).toBe(null);
    expect(runner.hook.result.current.modalState).toBe(null);
  });

  test("does not build an invalid vote Altcha challenge when vote value is missing", async () => {
    const runner = renderRunner({
      gateData: gate("already_joined", {}, [altchaRequirement]),
    });
    const allowedCalls: string[] = [];

    await act(async () => {
      const result = await runner.hook.result.current.run({
        action: "vote_post",
        communityId: "community-1",
        onAllowed: () => {
          allowedCalls.push("allowed");
        },
        postId: "post-1",
      });
      expect(result).toBe("allowed");
    });

    expect(allowedCalls).toEqual(["allowed"]);
    expect(runner.pendingInteraction).toBe(null);
    expect(runner.hook.result.current.modalState).toBe(null);
  });

  test("does not run action Altcha for mixed Very-or-PoW gates when already joined", async () => {
    const veryRequirement: MembershipGateSummary = {
      gate_type: "unique_human",
      accepted_providers: ["very"],
    };
    const runner = renderRunner({
      gateData: gate("already_joined", {}, [veryRequirement, altchaRequirement]),
    });
    const allowedCalls: string[] = [];

    await act(async () => {
      const result = await runner.hook.result.current.run({
        action: "reply_post",
        communityId: "community-1",
        onAllowed: () => {
          allowedCalls.push("allowed");
        },
        postId: "post-1",
      });
      expect(result).toBe("allowed");
    });

    expect(allowedCalls).toEqual(["allowed"]);
    expect(runner.pendingInteraction).toBe(null);
    expect(runner.hook.result.current.modalState).toBe(null);
  });

  test("builds the join Altcha modal for verification-required Altcha gates", async () => {
    const veryRequirement: MembershipGateSummary = {
      gate_type: "unique_human",
      accepted_providers: ["very"],
    };
    const runner = renderRunner({
      gateData: gate("verification_required", {
        gate_evaluation: altchaGateEvaluation(),
        missing_capabilities: ["altcha_pow"],
      }, [veryRequirement, altchaRequirement]),
    });

    await act(async () => {
      const result = await runner.hook.result.current.run({
        action: "reply_post",
        communityId: "community-1",
        onAllowed: () => undefined,
        postId: "post-1",
      });
      expect(result).toBe("blocked");
    });

    expect(runner.pendingInteraction?.action).toBe("reply_post");
    expect(runner.hook.result.current.modalState?.title).toBe("Checking browser");
    expect(runner.hook.result.current.modalState?.body).toBe("altcha:community:community-1:community_join");
    expect(runner.hook.result.current.modalState?.requirements).toEqual([altchaRequirement]);
    expect(runner.hook.result.current.modalState?.requirementStatuses).toEqual(["unmet"]);
    expect(runner.hook.result.current.modalState?.primaryAction).toBeNull();
  });

  test("routes verification-required non-Altcha gates through the default modal", async () => {
    const runner = renderRunner({
      gateData: gate("verification_required", {
        missing_capabilities: ["unique_human"],
        suggested_verification_provider: "self",
      }, [uniqueHumanRequirement]),
    });

    await act(async () => {
      const result = await runner.hook.result.current.run({
        action: "reply_post",
        communityId: "community-1",
        onAllowed: () => undefined,
        postId: "post-1",
      });
      expect(result).toBe("blocked");
    });

    expect(runner.pendingInteraction?.action).toBe("reply_post");
    expect(runner.hook.result.current.modalState?.icon).toBe("self");
    expect(runner.hook.result.current.modalState?.primaryAction?.label).toBe("Verify with ID");

    await act(async () => {
      await runner.hook.result.current.modalState?.primaryAction?.onClick?.();
    });
    expect(runner.calls).toEqual(["load:community-1", "verify:self"]);
  });

  test("routes joinable gates through the default join modal", async () => {
    const runner = renderRunner({
      gateData: gate("joinable"),
    });

    await act(async () => {
      const result = await runner.hook.result.current.run({
        action: "reply_post",
        communityId: "community-1",
        onAllowed: () => undefined,
        postId: "post-1",
      });
      expect(result).toBe("blocked");
    });

    expect(runner.pendingInteraction?.action).toBe("reply_post");
    expect(runner.hook.result.current.modalState?.icon).toBe("join");
    expect(runner.hook.result.current.modalState?.primaryAction?.label).toBe("Join");
  });

  test("routes pending request gates through the default pending modal", async () => {
    const runner = renderRunner({
      gateData: gate("pending_request"),
    });

    await act(async () => {
      const result = await runner.hook.result.current.run({
        action: "reply_post",
        communityId: "community-1",
        onAllowed: () => undefined,
        postId: "post-1",
      });
      expect(result).toBe("blocked");
    });

    expect(runner.pendingInteraction?.action).toBe("reply_post");
    expect(runner.hook.result.current.modalState?.icon).toBe("pending");
  });

  test("routes gate failed gates through the default blocked modal", async () => {
    const runner = renderRunner({
      gateData: gate("gate_failed", {
        failure_reason: "minimum_age_mismatch",
      }, [uniqueHumanRequirement]),
    });

    await act(async () => {
      const result = await runner.hook.result.current.run({
        action: "reply_post",
        communityId: "community-1",
        onAllowed: () => undefined,
        postId: "post-1",
      });
      expect(result).toBe("blocked");
    });

    expect(runner.pendingInteraction?.action).toBe("reply_post");
    expect(runner.hook.result.current.modalState?.icon).toBe("blocked");
  });

  test("routes banned gates through the default blocked modal", async () => {
    const runner = renderRunner({
      gateData: gate("banned"),
    });

    await act(async () => {
      const result = await runner.hook.result.current.run({
        action: "reply_post",
        communityId: "community-1",
        onAllowed: () => undefined,
        postId: "post-1",
      });
      expect(result).toBe("blocked");
    });

    expect(runner.pendingInteraction?.action).toBe("reply_post");
    expect(runner.hook.result.current.modalState?.icon).toBe("blocked");
  });

  test("reports gate loading failures as blocked actions", async () => {
    const runner = renderRunner({
      loadCommunityGate: async () => {
        throw new Error("lookup failed");
      },
    });

    await act(async () => {
      const result = await runner.hook.result.current.run({
        action: "reply_post",
        communityId: "community-1",
        onAllowed: () => undefined,
        postId: "post-1",
      });
      expect(result).toBe("blocked");
    });

    expect(runner.errors).toEqual([interactionCopy.couldNotCheckRequirements]);
    expect(runner.hook.result.current.modalState).toBe(null);
  });
});
