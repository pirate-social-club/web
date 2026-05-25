"use client";

import * as React from "react";

import { navigate } from "@/app/router";
import { toast } from "@/components/primitives/sonner";
import { buildCanonicalAuthUrl, isCanonicalAuthOrigin } from "@/lib/auth-origin";
import { buildCommunityPath } from "@/lib/community-routing";
import type { AltchaScope } from "@/lib/api/client-groups-core";
import {
  getMissingCapabilitiesFromGateEvaluation,
  getProofOfWorkGateRequirements,
  hasAltchaProofAction,
} from "@/lib/identity-gates";
import { logger } from "@/lib/logger";
import {
  createDefaultBlockedModalState,
  getRequirementStatuses,
  resolveCommunityInteractionState,
  type BuildBlockedModalStateArgs,
  type CommunityGateData,
  type InteractionAction,
  type InteractionGateCopy,
  type InteractionResult,
  type ModalState,
  type PendingInteraction,
  type RouteKind,
  type RunGatedCommunityActionParams,
} from "@/hooks/use-community-interaction-gate.helpers";

type ToastInfoOptions = {
  action?: {
    label: string;
    onClick: () => void;
  };
};

type GatedActionRunnerCopy = InteractionGateCopy & {
  openInPirate: string;
};

function requiresActionAltchaProof(gate: CommunityGateData): boolean {
  const requirements = gate.preview.membership_gate_summaries;
  // Joined-member eligibility does not carry action-level requirements, so only
  // preflight the action challenge when the published policy is unambiguously PoW.
  return requirements.length > 0 && requirements.every((summary) => summary.gate_type === "altcha_pow");
}

function getAltchaActionConfig(input: {
  action: InteractionAction;
  commentId?: string;
  gate: CommunityGateData;
  postId?: string;
  voteValue?: -1 | 1;
}): { actionRef: string; scope: AltchaScope } | null {
  if (!requiresActionAltchaProof(input.gate)) {
    return null;
  }
  if (input.action === "vote_post" && input.postId && input.voteValue) {
    return { actionRef: `post:${input.postId}:vote:${input.voteValue}`, scope: "vote" };
  }
  if (input.action === "vote_comment" && input.commentId && input.voteValue) {
    return { actionRef: `comment:${input.commentId}:vote:${input.voteValue}`, scope: "vote" };
  }
  if (input.action === "reply_post" && input.postId) {
    return { actionRef: `post:${input.postId}`, scope: "comment_create" };
  }
  if (input.action === "reply_comment" && input.commentId) {
    return { actionRef: `comment:${input.commentId}`, scope: "comment_create" };
  }
  return null;
}

export function useGatedActionRunner({
  altchaLoading,
  buildAltchaBody,
  closeModal,
  completeAltchaAction,
  completeAltchaJoin,
  connect,
  defaultVerificationLoadingProvider,
  interactionCopy,
  invalidateCommunityGate,
  loadCommunityGate,
  buildAuthUrl = buildCanonicalAuthUrl,
  isAuthOrigin = isCanonicalAuthOrigin,
  openAuthHref,
  openCommunity,
  routeKind,
  sessionAccessToken,
  setModalState,
  setPendingInteraction,
  showError,
  showInfo,
  startDefaultVerification,
}: {
  altchaLoading: boolean;
  buildAltchaBody: (input: {
    action: string;
    onVerified?: (payload: string) => void | Promise<void>;
    resetKey?: React.Key;
    scope: AltchaScope;
    verifiedSubtitle?: string;
  }) => React.ReactNode;
  closeModal: () => void;
  completeAltchaAction: (payloadOverride?: string | null) => Promise<void>;
  completeAltchaJoin: (payloadOverride?: string | null) => Promise<void>;
  connect?: (() => void) | null;
  defaultVerificationLoadingProvider: "self" | "very" | "passport" | null;
  interactionCopy: GatedActionRunnerCopy;
  invalidateCommunityGate: (communityId: string) => void;
  loadCommunityGate: (communityId: string) => Promise<CommunityGateData>;
  buildAuthUrl?: (path: string) => string;
  isAuthOrigin?: () => boolean;
  openAuthHref?: (href: string) => void;
  openCommunity?: (communityId: string) => void;
  routeKind: RouteKind;
  sessionAccessToken?: string | null;
  setModalState: React.Dispatch<React.SetStateAction<ModalState | null>>;
  setPendingInteraction: (pendingInteraction: PendingInteraction | null) => void;
  showError?: (message: string) => void;
  showInfo?: (message: string, options?: ToastInfoOptions) => void;
  startDefaultVerification: NonNullable<BuildBlockedModalStateArgs["startDefaultVerification"]>;
}) {
  return React.useCallback(async ({
    action,
    buildBlockedModalState,
    communityId,
    gateData,
    onAllowed,
    postId,
    commentId,
    resolveGateData,
    voteValue,
  }: RunGatedCommunityActionParams): Promise<InteractionResult> => {
    const hasSession = Boolean(sessionAccessToken);
    const logBase = {
      action,
      communityId,
      hasSession,
      postId,
      routeKind,
    };

    if (!hasSession) {
      logger.info("[interaction-gate] blocked", { ...logBase, reason: "auth" });
      if (!isAuthOrigin()) {
        const canonicalUrl = buildAuthUrl(
          action === "vote_post" && postId ? `/p/${postId}` : buildCommunityPath(communityId),
        );
        const notifyInfo = showInfo ?? toast.info;
        notifyInfo(interactionCopy.connectToContinue, {
          action: {
            label: interactionCopy.openInPirate,
            onClick: () => {
              if (openAuthHref) {
                openAuthHref(canonicalUrl);
                return;
              }
              window.location.href = canonicalUrl;
            },
          },
        });
        return "blocked";
      }
      if (connect) {
        connect();
      } else {
        const notifyInfo = showInfo ?? toast.info;
        notifyInfo(interactionCopy.connectToContinue);
      }
      return "blocked";
    }

    let gate: CommunityGateData;
    try {
      gate = gateData ?? await (resolveGateData ? resolveGateData() : loadCommunityGate(communityId));
    } catch (error) {
      logger.warn("[interaction-gate] eligibility lookup failed", {
        ...logBase,
        message: error instanceof Error ? error.message : String(error),
      });
      const notifyError = showError ?? toast.error;
      notifyError(interactionCopy.couldNotCheckRequirements);
      return "blocked";
    }

    const state = resolveCommunityInteractionState({
      eligibility: gate.eligibility,
      hasSession,
    });

    const actionAltchaConfig = getAltchaActionConfig({ action, commentId, gate, postId, voteValue });
    if (state === "allowed" && actionAltchaConfig) {
      const requirements = getProofOfWorkGateRequirements(gate.preview.membership_gate_summaries);
      setPendingInteraction({
        action,
        commentId,
        communityId,
        gate,
        onAllowed,
        postId,
        voteValue,
      });
      setModalState({
        body: buildAltchaBody({
          action: actionAltchaConfig.actionRef,
          onVerified: completeAltchaAction,
          scope: actionAltchaConfig.scope,
          verifiedSubtitle: "Finishing this action automatically.",
        }),
        description: "This usually takes a few seconds and runs only on this device.",
        icon: "blocked",
        primaryAction: null,
        requirements,
        requirementStatuses: getRequirementStatuses(gate, requirements),
        secondaryAction: {
          label: "Cancel",
          onClick: closeModal,
        },
        title: "Checking browser",
      });
      return "blocked";
    }

    if (state === "allowed") {
      logger.info("[interaction-gate] allowed", {
        ...logBase,
        eligibilityStatus: gate.eligibility.status,
      });
      await onAllowed();
      return "allowed";
    }

    setPendingInteraction({
      action,
      commentId,
      communityId,
      gate,
      onAllowed,
      postId,
      voteValue,
    });

    const openCommunityAction = () => {
      if (openCommunity) {
        openCommunity(gate.preview.id);
        return;
      }
      navigate(buildCommunityPath(gate.preview.id));
    };
    const customModalState = buildBlockedModalState?.({
      action,
      closeModal,
      gate,
      invalidateCommunityGate,
      interactionCopy,
      openCommunity: openCommunityAction,
    });
    const altchaModalState: ModalState | undefined =
      customModalState === undefined &&
      gate.eligibility.status === "verification_required" &&
      hasAltchaProofAction(gate.eligibility)
        ? (() => {
            const requirements = getProofOfWorkGateRequirements(gate.preview.membership_gate_summaries);
            return {
              body: buildAltchaBody({
                action: `community:${communityId}`,
                onVerified: completeAltchaJoin,
                scope: "community_join",
                verifiedSubtitle: "Finishing this action automatically.",
              }),
              description: "This usually takes a few seconds and runs only on this device.",
              icon: "blocked",
              primaryAction: null,
              requirements,
              requirementStatuses: getRequirementStatuses(gate, requirements),
              secondaryAction: {
                label: "Cancel",
                onClick: closeModal,
              },
              title: "Checking browser",
            };
          })()
        : undefined;
    const builtModalState = customModalState === undefined
      ? (altchaModalState ?? createDefaultBlockedModalState({
          action,
          closeModal,
          gate,
          invalidateCommunityGate,
          interactionCopy,
          openCommunity: openCommunityAction,
          defaultVerificationLoadingProvider,
          startDefaultVerification,
        }))
      : customModalState;
    logger.info("[interaction-gate] blocked", {
      ...logBase,
      eligibilityStatus: gate.eligibility.status,
      missingCapabilities: getMissingCapabilitiesFromGateEvaluation(gate.eligibility),
      requirements: gate.preview.membership_gate_summaries.length,
    });
    if (builtModalState) {
      setModalState(builtModalState);
    }
    return "blocked";
  }, [
    altchaLoading,
    buildAuthUrl,
    buildAltchaBody,
    closeModal,
    completeAltchaAction,
    completeAltchaJoin,
    connect,
    defaultVerificationLoadingProvider,
    isAuthOrigin,
    interactionCopy,
    invalidateCommunityGate,
    loadCommunityGate,
    openAuthHref,
    openCommunity,
    routeKind,
    sessionAccessToken,
    setModalState,
    setPendingInteraction,
    showError,
    showInfo,
    startDefaultVerification,
  ]);
}
