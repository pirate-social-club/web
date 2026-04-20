"use client";

import * as React from "react";
import type { CommunityPreview, JoinEligibility } from "@pirate/api-contracts";

import { navigate } from "@/app/router";
import {
  CommunityInteractionGateModal,
  type CommunityInteractionGateAction,
} from "@/components/compositions/community-interaction-gate-modal/community-interaction-gate-modal";
import { toast } from "@/components/primitives/sonner";
import { useApi } from "@/lib/api";
import { useSession } from "@/lib/api/session-store";
import { usePiratePrivyRuntime } from "@/lib/auth/privy-provider";
import { buildCommunityPath } from "@/lib/community-routing";
import {
  getJoinCtaLabel,
} from "@/lib/identity-gates";
import { getLocaleMessages } from "@/locales";
import { interpolateMessage } from "./route-core";

type RouteKind = "community" | "home" | "post" | "public-community";
type InteractionAction = "vote_post" | "vote_comment" | "reply_post" | "reply_comment";
type InteractionResult = "allowed" | "blocked";

type CommunityGateData = {
  eligibility: JoinEligibility;
  preview: Pick<CommunityPreview, "community_id" | "display_name" | "membership_gate_summaries">;
};

type CommunityGateCacheEntry = {
  expiresAt: number;
  value: CommunityGateData;
};

type InteractionGateCopy = ReturnType<typeof getLocaleMessages<"routes">>["interactionGate"] & {
  locale: string;
  taskVerify: string;
};

type ModalState = {
  description: string;
  primaryAction?: CommunityInteractionGateAction | null;
  requirements: CommunityGateData["preview"]["membership_gate_summaries"];
  secondaryAction?: CommunityInteractionGateAction | null;
  title: string;
};

type BuildBlockedModalStateArgs = {
  action: InteractionAction;
  closeModal: () => void;
  gate: CommunityGateData;
  invalidateCommunityGate: (communityId: string) => void;
  interactionCopy: InteractionGateCopy;
  openCommunity: () => void;
};

type RunGatedCommunityActionParams = {
  action: InteractionAction;
  buildBlockedModalState?: (args: BuildBlockedModalStateArgs) => ModalState | null;
  communityId: string;
  gateData?: CommunityGateData;
  onAllowed: () => Promise<void> | void;
  postId?: string;
  resolveGateData?: () => Promise<CommunityGateData>;
};

const COMMUNITY_GATE_CACHE_TTL_MS = 60_000;
const communityGateCache = new Map<string, CommunityGateCacheEntry>();
const communityGateRequests = new Map<string, Promise<CommunityGateData>>();

function createDefaultBlockedModalState({
  action,
  closeModal,
  gate,
  interactionCopy,
  openCommunity,
}: BuildBlockedModalStateArgs): ModalState {
  const isVoteAction = action === "vote_post" || action === "vote_comment";

  switch (gate.eligibility.status) {
    case "verification_required":
      return {
        description: isVoteAction
          ? interactionCopy.verifyToVoteDescription
          : interactionCopy.verifyToReplyDescription,
        primaryAction: {
          label: interactionCopy.taskVerify,
          onClick: () => {
            closeModal();
            openCommunity();
          },
        },
        requirements: gate.preview.membership_gate_summaries,
        secondaryAction: {
          label: interactionCopy.close,
          onClick: closeModal,
        },
        title: isVoteAction
          ? interactionCopy.verifyToVoteTitle
          : interactionCopy.verifyToReplyTitle,
      };
    case "joinable":
    case "requestable": {
      const ctaLabel = getJoinCtaLabel(gate.eligibility, { locale: interactionCopy.locale });
      return {
        description: interpolateMessage(
          isVoteAction
            ? interactionCopy.joinToVoteDescription
            : interactionCopy.joinToReplyDescription,
          {
            communityName: gate.preview.display_name,
            joinLabel: ctaLabel,
          },
        ),
        primaryAction: {
          label: interpolateMessage(interactionCopy.joinInCommunity, {
            communityName: gate.preview.display_name,
            joinLabel: ctaLabel,
          }),
          onClick: () => {
            closeModal();
            openCommunity();
          },
        },
        requirements: gate.preview.membership_gate_summaries,
        secondaryAction: {
          label: interactionCopy.close,
          onClick: closeModal,
        },
        title: interpolateMessage(
          isVoteAction
            ? interactionCopy.joinToVoteTitle
            : interactionCopy.joinToReplyTitle,
          { joinLabel: ctaLabel },
        ),
      };
    }
    case "gate_failed":
    case "banned":
      return {
        description: gate.eligibility.status === "banned"
          ? interactionCopy.bannedDescription
          : isVoteAction
            ? interactionCopy.blockedVoteDescription
            : interactionCopy.blockedReplyDescription,
        primaryAction: {
          label: interpolateMessage(interactionCopy.openCommunity, {
            communityName: gate.preview.display_name,
          }),
          onClick: () => {
            closeModal();
            openCommunity();
          },
        },
        requirements: gate.preview.membership_gate_summaries,
        secondaryAction: {
          label: interactionCopy.close,
          onClick: closeModal,
        },
        title: isVoteAction
          ? interactionCopy.cantVoteHereTitle
          : interactionCopy.cantReplyHereTitle,
      };
    case "already_joined":
      return {
        description: interactionCopy.readyDescription,
        requirements: gate.preview.membership_gate_summaries,
        secondaryAction: {
          label: interactionCopy.close,
          onClick: closeModal,
        },
        title: interactionCopy.readyTitle,
      };
  }
}

function getGateCacheKey(sessionKey: string | null, communityId: string): string {
  return `${sessionKey ?? "anon"}:${communityId}`;
}

export function resolveCommunityInteractionState(input: {
  eligibility: JoinEligibility | null | undefined;
  hasSession: boolean;
}): "allowed" | "auth" | Exclude<JoinEligibility["status"], "already_joined"> {
  if (!input.hasSession) {
    return "auth";
  }

  if (!input.eligibility) {
    return "gate_failed";
  }

  if (input.eligibility.status === "already_joined") {
    return "allowed";
  }

  return input.eligibility.status;
}

export function useCommunityInteractionGate({
  previewLocale,
  routeKind,
  uiLocale,
}: {
  previewLocale: string;
  routeKind: RouteKind;
  uiLocale: string;
}) {
  const api = useApi();
  const session = useSession();
  const { connect } = usePiratePrivyRuntime();
  const [modalState, setModalState] = React.useState<ModalState | null>(null);
  const sessionKey = session?.user.user_id ?? null;
  const interactionCopy = React.useMemo(
    () => {
      const localeMessages = getLocaleMessages(
        uiLocale === "pseudo" ? "pseudo" : uiLocale === "ar" ? "ar" : uiLocale === "zh" ? "zh" : "en",
        "routes",
      );

      return {
        ...localeMessages.interactionGate,
        locale: uiLocale,
        taskVerify: localeMessages.createCommunity.startVerification,
      };
    },
    [uiLocale],
  );

  React.useEffect(() => {
    communityGateCache.clear();
    communityGateRequests.clear();
  }, [sessionKey]);

  const closeModal = React.useCallback(() => {
    setModalState(null);
  }, []);

  const invalidateCommunityGate = React.useCallback((communityId: string) => {
    communityGateCache.delete(getGateCacheKey(sessionKey, communityId));
    communityGateRequests.delete(getGateCacheKey(sessionKey, communityId));
  }, [sessionKey]);

  const loadCommunityGate = React.useCallback(async (communityId: string): Promise<CommunityGateData> => {
    const cacheKey = getGateCacheKey(sessionKey, communityId);
    const cached = communityGateCache.get(cacheKey);
    if (cached && cached.expiresAt > Date.now()) {
      return cached.value;
    }

    const inFlight = communityGateRequests.get(cacheKey);
    if (inFlight) {
      return await inFlight;
    }

    const request = Promise.all([
      api.communities.preview(communityId, { locale: previewLocale }),
      api.communities.getJoinEligibility(communityId),
    ]).then(([preview, eligibility]) => {
      const value: CommunityGateData = {
        eligibility,
        preview: {
          community_id: preview.community_id,
          display_name: preview.display_name,
          membership_gate_summaries: preview.membership_gate_summaries,
        },
      };
      communityGateCache.set(cacheKey, {
        expiresAt: Date.now() + COMMUNITY_GATE_CACHE_TTL_MS,
        value,
      });
      return value;
    }).finally(() => {
      communityGateRequests.delete(cacheKey);
    });

    communityGateRequests.set(cacheKey, request);
    return await request;
  }, [api.communities, previewLocale, sessionKey]);

  const runGatedCommunityAction = React.useCallback(async ({
    action,
    buildBlockedModalState,
    communityId,
    gateData,
    onAllowed,
    postId,
    resolveGateData,
  }: RunGatedCommunityActionParams): Promise<InteractionResult> => {
    const hasSession = Boolean(session?.accessToken);
    const logBase = {
      action,
      communityId,
      hasSession,
      postId,
      routeKind,
    };

    if (!hasSession) {
      console.info("[interaction-gate] blocked", { ...logBase, reason: "auth" });
      if (connect) {
        connect();
      } else {
        toast.info(interactionCopy.connectToContinue);
      }
      return "blocked";
    }

    let gate: CommunityGateData;
    try {
      gate = gateData ?? await (resolveGateData ? resolveGateData() : loadCommunityGate(communityId));
    } catch (error) {
      console.warn("[interaction-gate] eligibility lookup failed", {
        ...logBase,
        message: error instanceof Error ? error.message : String(error),
      });
      toast.error(interactionCopy.couldNotCheckRequirements);
      return "blocked";
    }

    const state = resolveCommunityInteractionState({
      eligibility: gate.eligibility,
      hasSession,
    });

    if (state === "allowed") {
      console.info("[interaction-gate] allowed", {
        ...logBase,
        eligibilityStatus: gate.eligibility.status,
      });
      await onAllowed();
      return "allowed";
    }

    const openCommunity = () => navigate(buildCommunityPath(gate.preview.community_id));
    const nextModalState = buildBlockedModalState?.({
      action,
      closeModal,
      gate,
      invalidateCommunityGate,
      interactionCopy,
      openCommunity,
    }) ?? createDefaultBlockedModalState({
      action,
      closeModal,
      gate,
      invalidateCommunityGate,
      interactionCopy,
      openCommunity,
    });
    console.info("[interaction-gate] blocked", {
      ...logBase,
      eligibilityStatus: gate.eligibility.status,
      missingCapabilities: gate.eligibility.missing_capabilities,
      requirements: gate.preview.membership_gate_summaries.length,
    });
    setModalState(nextModalState);
    return "blocked";
  }, [closeModal, connect, interactionCopy, loadCommunityGate, routeKind, session?.accessToken, invalidateCommunityGate]);

  const gateModal = modalState ? (
    <CommunityInteractionGateModal
      description={modalState.description}
      onOpenChange={(open) => {
        if (!open) closeModal();
      }}
      open
      primaryAction={modalState.primaryAction}
      requirements={modalState.requirements}
      secondaryAction={modalState.secondaryAction}
      title={modalState.title}
    />
  ) : null;

  return {
    closeInteractionGate: closeModal,
    gateModal,
    invalidateCommunityGate,
    runGatedCommunityAction,
  };
}
