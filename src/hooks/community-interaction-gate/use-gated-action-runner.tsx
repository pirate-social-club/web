"use client";

import * as React from "react";

import { navigate } from "@/app/router";
import { toast } from "@/components/primitives/sonner";
import { buildCanonicalAuthUrl, isCanonicalAuthOrigin } from "@/lib/auth-origin";
import { buildCommunityPath } from "@/lib/community-routing";
import type { MembershipGateSummary, User } from "@pirate/api-contracts";

import type { AltchaScope } from "@/lib/api/client-groups-core";
import {
  getMissingCapabilitiesFromGateEvaluation,
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

type VerificationCapabilities = User["verification_capabilities"];

function providerMatches(
  summary: MembershipGateSummary,
  provider: string | null | undefined,
): boolean {
  return !summary.accepted_providers?.length
    || (provider != null && (summary.accepted_providers as readonly string[]).includes(provider));
}

function decimalValue(value: string | number | null | undefined): number | null {
  if (typeof value === "number") {
    return Number.isFinite(value) ? value : null;
  }
  if (typeof value !== "string") {
    return null;
  }
  const parsed = Number.parseFloat(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function satisfiesNonPowGate(
  summary: MembershipGateSummary,
  capabilities: VerificationCapabilities | null | undefined,
): boolean {
  if (!capabilities) {
    return false;
  }

  switch (summary.gate_type) {
    case "unique_human":
      return capabilities.unique_human.state === "verified"
        && providerMatches(summary, capabilities.unique_human.provider);
    case "wallet_score": {
      const walletScore = capabilities.wallet_score;
      if (walletScore.state !== "verified" || walletScore.provider !== "passport") {
        return false;
      }
      if (summary.minimum_score == null) {
        return walletScore.passing_score === true;
      }
      const currentScore = decimalValue(walletScore.score_decimal);
      return currentScore != null
        ? currentScore >= summary.minimum_score
        : walletScore.passing_score === true;
    }
    case "nationality": {
      const nationality = capabilities.nationality;
      if (nationality.state !== "verified" || !providerMatches(summary, nationality.provider)) {
        return false;
      }
      const value = nationality.value ?? null;
      const allowed = summary.required_values ?? (summary.required_value ? [summary.required_value] : []);
      const excluded = summary.excluded_values ?? [];
      return value != null
        && (allowed.length === 0 || allowed.includes(value))
        && !excluded.includes(value);
    }
    case "minimum_age":
    case "age_over_18": {
      if (summary.gate_type === "age_over_18") {
        return capabilities.age_over_18.state === "verified"
          && providerMatches(summary, capabilities.age_over_18.provider);
      }
      const minimumAge = capabilities.minimum_age;
      return minimumAge.state === "verified"
        && providerMatches(summary, minimumAge.provider)
        && typeof minimumAge.value === "number"
        && minimumAge.value >= (summary.required_minimum_age ?? 18);
    }
    case "gender": {
      const gender = capabilities.gender;
      if (gender.state !== "verified" || !providerMatches(summary, gender.provider)) {
        return false;
      }
      const value = gender.value ?? null;
      const allowed = summary.required_values ?? (summary.required_value ? [summary.required_value] : []);
      return value != null && (allowed.length === 0 || allowed.includes(value));
    }
    case "altcha_pow":
    case "erc721_holding":
    case "erc721_inventory_match":
      return false;
  }
}

function requiresActionAltchaProof(
  gate: CommunityGateData,
  sessionUser: Pick<User, "verification_capabilities"> | null | undefined,
): boolean {
  const requirements = gate.preview.membership_gate_summaries;
  const hasPowFallback = requirements.some((summary) => summary.gate_type === "altcha_pow");
  if (!hasPowFallback) {
    return false;
  }

  return !requirements.some((summary) =>
    summary.gate_type !== "altcha_pow" &&
    satisfiesNonPowGate(summary, sessionUser?.verification_capabilities),
  );
}

function isRefreshableNonPowGate(summary: MembershipGateSummary): boolean {
  switch (summary.gate_type) {
    case "unique_human":
    case "wallet_score":
    case "nationality":
    case "minimum_age":
    case "age_over_18":
    case "gender":
      return true;
    case "altcha_pow":
    case "erc721_holding":
    case "erc721_inventory_match":
      return false;
  }
}

function hasRefreshablePowFallback(gate: CommunityGateData): boolean {
  const requirements = gate.preview.membership_gate_summaries;
  return requirements.some((summary) => summary.gate_type === "altcha_pow")
    && requirements.some(isRefreshableNonPowGate);
}

function getAltchaActionConfig(input: {
  action: InteractionAction;
  commentId?: string;
  gate: CommunityGateData;
  postId?: string;
  sessionUser?: Pick<User, "verification_capabilities"> | null;
  voteValue?: -1 | 1;
}): { actionRef: string; scope: AltchaScope } | null {
  if (!requiresActionAltchaProof(input.gate, input.sessionUser)) {
    return null;
  }
  if (input.action === "vote_post" && input.postId && input.voteValue) {
    return { actionRef: `post:${input.postId}:${input.voteValue}`, scope: "vote" };
  }
  if (input.action === "vote_comment" && input.commentId && input.voteValue) {
    return { actionRef: `comment:${input.commentId}:${input.voteValue}`, scope: "vote" };
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
  refreshSessionUser,
  routeKind,
  sessionAccessToken,
  sessionUser,
  setModalState,
  setPendingInteraction,
  showError,
  showInfo,
  startDefaultVerification,
}: {
  altchaLoading: boolean;
  buildAltchaBody: (input: {
    action: string;
    resetKey?: React.Key;
    scope: AltchaScope;
  }) => React.ReactNode;
  closeModal: () => void;
  completeAltchaAction: () => Promise<void>;
  completeAltchaJoin: () => Promise<void>;
  connect?: (() => void) | null;
  defaultVerificationLoadingProvider: "self" | "very" | "passport" | null;
  interactionCopy: GatedActionRunnerCopy;
  invalidateCommunityGate: (communityId: string) => void;
  loadCommunityGate: (communityId: string) => Promise<CommunityGateData>;
  buildAuthUrl?: (path: string) => string;
  isAuthOrigin?: () => boolean;
  openAuthHref?: (href: string) => void;
  openCommunity?: (communityId: string) => void;
  refreshSessionUser?: (() => Promise<Pick<User, "verification_capabilities"> | null>) | null;
  routeKind: RouteKind;
  sessionAccessToken?: string | null;
  sessionUser?: Pick<User, "verification_capabilities"> | null;
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

    let actionAltchaConfig = getAltchaActionConfig({ action, commentId, gate, postId, sessionUser, voteValue });
    if (state === "allowed" && actionAltchaConfig && refreshSessionUser && hasRefreshablePowFallback(gate)) {
      try {
        const refreshedUser = await refreshSessionUser();
        const refreshedAltchaConfig = getAltchaActionConfig({
          action,
          commentId,
          gate,
          postId,
          sessionUser: refreshedUser,
          voteValue,
        });
        if (!refreshedAltchaConfig) {
          logger.info("[interaction-gate] allowed", {
            ...logBase,
            eligibilityStatus: gate.eligibility.status,
            reason: "refreshed_verification_capabilities",
          });
          await onAllowed();
          return "allowed";
        }
        actionAltchaConfig = refreshedAltchaConfig;
      } catch (error) {
        logger.warn("[interaction-gate] session refresh before action proof failed", {
          ...logBase,
          message: error instanceof Error ? error.message : String(error),
        });
      }
    }
    if (state === "allowed" && actionAltchaConfig) {
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
          scope: actionAltchaConfig.scope,
        }),
        description: "This usually takes a few seconds and runs only on this device.",
        icon: "blocked",
        primaryAction: {
          label: "Continue",
          loading: altchaLoading,
          onClick: completeAltchaAction,
        },
        requirements: gate.preview.membership_gate_summaries,
        requirementStatuses: getRequirementStatuses(gate),
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
        ? {
            body: buildAltchaBody({
              action: `community:${communityId}`,
              scope: "community_join",
            }),
            description: "This usually takes a few seconds and runs only on this device.",
            icon: "blocked",
            primaryAction: {
              label: "Continue",
              loading: altchaLoading,
              onClick: completeAltchaJoin,
            },
            requirements: gate.preview.membership_gate_summaries,
            requirementStatuses: getRequirementStatuses(gate),
            secondaryAction: {
              label: "Cancel",
              onClick: closeModal,
            },
            title: "Checking browser",
          }
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
    refreshSessionUser,
    routeKind,
    sessionAccessToken,
    sessionUser,
    setModalState,
    setPendingInteraction,
    showError,
    showInfo,
    startDefaultVerification,
  ]);
}
