"use client";

import * as React from "react";
import type { CommunityPreview, JoinEligibility } from "@pirate/api-contracts";

import { navigate } from "@/app/router";
import {
  CommunityInteractionGateModal,
  type CommunityInteractionGateAction,
  type CommunityInteractionGateModalProps,
  type CommunityInteractionGateRequirementStatus,
} from "@/components/compositions/community-interaction-gate-modal/community-interaction-gate-modal";
import { SelfVerificationModal } from "@/components/compositions/self-verification-modal/self-verification-modal";
import { toast } from "@/components/primitives/sonner";
import { useApi } from "@/lib/api";
import { getApiErrorMessage } from "@/lib/api/client";
import { useSession } from "@/lib/api/session-store";
import { usePiratePrivyRuntime } from "@/lib/auth/privy-provider";
import { buildCommunityPath } from "@/lib/community-routing";
import {
  getJoinCtaLabel,
  getGateFailureMessage,
  getPassportPromptCapabilities,
  getVerificationCapabilitiesForProvider,
  getVerificationPromptCopy,
  getVerificationRequirementsForGates,
  resolveSuggestedVerificationProvider,
} from "@/lib/identity-gates";
import { logger } from "@/lib/logger";
import { interpolateMessage } from "@/lib/route-messages";
import { useSelfVerification } from "@/lib/verification/use-self-verification";
import { useVeryVerification } from "@/lib/verification/use-very-verification";
import { getLocaleMessages } from "@/locales";

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
  hideCloseButtonOnMobile?: boolean;
  hideSecondaryActionOnMobile?: boolean;
  icon?: CommunityInteractionGateModalProps["icon"];
  primaryAction?: CommunityInteractionGateAction | null;
  requirements: CommunityGateData["preview"]["membership_gate_summaries"];
  requirementStatuses?: CommunityInteractionGateRequirementStatus[];
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
  defaultVerificationLoadingProvider?: "self" | "very" | null;
  startDefaultVerification?: (input: {
    gate: CommunityGateData;
    provider: "self" | "very";
  }) => Promise<{ started: boolean }>;
};

type PendingInteraction = {
  action: InteractionAction;
  communityId: string;
  gate: CommunityGateData;
  onAllowed: () => Promise<void> | void;
  postId?: string;
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
const SELF_INTERACTION_GATE_STORAGE_KEY = "pirate_pending_self_interaction_gate_session";
const communityGateCache = new Map<string, CommunityGateCacheEntry>();
const communityGateRequests = new Map<string, Promise<CommunityGateData>>();

function getInteractionTaskLabel(action: InteractionAction, options: { locale: string }): string {
  const normalized = options.locale.toLowerCase();
  if (action === "vote_post" || action === "vote_comment") {
    if (normalized.startsWith("ar")) return "التصويت";
    if (normalized.startsWith("zh")) return "投票";
    return "vote";
  }
  if (normalized.startsWith("ar")) return "الرد";
  if (normalized.startsWith("zh")) return "回复";
  return "reply";
}

function getReadyAfterJoinDescription(gate: CommunityGateData, action: InteractionAction, options: { locale: string }): string {
  const taskLabel = getInteractionTaskLabel(action, options);
  const normalized = options.locale.toLowerCase();
  if (normalized.startsWith("ar")) {
    return `يمكنك الآن ${taskLabel} في ${gate.preview.display_name}.`;
  }
  if (normalized.startsWith("zh")) {
    return `你现在可以在 ${gate.preview.display_name} ${taskLabel}。`;
  }
  return `You can now ${taskLabel} in ${gate.preview.display_name}.`;
}

function getReadyActionLabel(action: InteractionAction, options: { locale: string }): string {
  const normalized = options.locale.toLowerCase();
  if (action === "vote_post" || action === "vote_comment") {
    if (normalized.startsWith("ar")) return "صوّت الآن";
    if (normalized.startsWith("zh")) return "立即投票";
    return "Vote now";
  }
  if (normalized.startsWith("ar")) return "رد الآن";
  if (normalized.startsWith("zh")) return "立即回复";
  return "Reply now";
}

function getJoinActionLabel(eligibility: JoinEligibility, options: { locale: string }): string {
  const normalized = options.locale.toLowerCase();
  const isRequestable = eligibility.status === "requestable";

  if (normalized.startsWith("ar")) return isRequestable ? "اطلب الانضمام" : "انضمام";
  if (normalized.startsWith("zh")) return isRequestable ? "申请加入" : "加入";
  return isRequestable ? "Request to Join" : "Join";
}

function getFailedGateRequirements(gate: CommunityGateData): CommunityGateData["preview"]["membership_gate_summaries"] {
  switch (gate.eligibility.failure_reason) {
    case "nationality_mismatch":
      return gate.preview.membership_gate_summaries.filter((summary) => summary.gate_type === "nationality");
    case "gender_mismatch":
      return gate.preview.membership_gate_summaries.filter((summary) => summary.gate_type === "gender");
    case "minimum_age_mismatch":
      return gate.preview.membership_gate_summaries.filter((summary) => summary.gate_type === "minimum_age" || summary.gate_type === "age_over_18");
    case "wallet_score_too_low":
      return gate.preview.membership_gate_summaries.filter((summary) => summary.gate_type === "wallet_score");
    case "erc721_holding_required":
      return gate.preview.membership_gate_summaries.filter((summary) => summary.gate_type === "erc721_holding");
    case "erc721_inventory_match_required":
      return gate.preview.membership_gate_summaries.filter((summary) => summary.gate_type === "erc721_inventory_match");
    default:
      return gate.preview.membership_gate_summaries;
  }
}

function getPassportPromptDescription(gate: CommunityGateData, fallback: string, options: { locale: string }): string {
  const normalized = options.locale.toLowerCase();
  if (normalized.startsWith("ar") || normalized.startsWith("zh")) return fallback;

  const walletScoreGate = gate.preview.membership_gate_summaries.find((summary) => summary.gate_type === "wallet_score");

  if (typeof walletScoreGate?.minimum_score === "number") {
    return `Your wallet needs a score of ${walletScoreGate.minimum_score}+ to enter this community. Visit app.passport.xyz to improve it.`;
  }

  return fallback;
}

function getJoinGateTitle(action: InteractionAction, options: { locale: string }): string | null {
  const normalized = options.locale.toLowerCase();
  if (normalized.startsWith("ar") || normalized.startsWith("zh")) return null;
  return action === "vote_post" || action === "vote_comment"
    ? "Join to Vote"
    : "Join to Reply";
}

function getRequestableDescription(gate: CommunityGateData, action: InteractionAction, fallback: string, options: { locale: string }): string {
  const normalized = options.locale.toLowerCase();
  if (normalized.startsWith("ar") || normalized.startsWith("zh")) return fallback;

  const taskLabel = getInteractionTaskLabel(action, options);
  return `Request to join ${gate.preview.display_name} before you ${taskLabel}.`;
}

function gateMatchesMissingCapability(gate: CommunityGateData["preview"]["membership_gate_summaries"][number], eligibility: JoinEligibility): boolean {
  const missing = eligibility.missing_capabilities;

  switch (gate.gate_type) {
    case "age_over_18":
    case "minimum_age":
      return missing.includes("age_over_18") || missing.includes("minimum_age");
    case "nationality":
      return missing.includes("nationality");
    case "gender":
      return missing.includes("gender");
    case "sanctions_clear":
      return missing.includes("sanctions_clear");
    case "unique_human":
      return missing.includes("unique_human");
    case "wallet_score":
      return missing.includes("wallet_score");
    default:
      return false;
  }
}

function getRequirementStatuses(gate: CommunityGateData, requirements = gate.preview.membership_gate_summaries): CommunityInteractionGateRequirementStatus[] {
  switch (gate.eligibility.status) {
    case "already_joined":
    case "joinable":
    case "requestable":
      return requirements.map(() => "met");
    case "gate_failed":
      return requirements.map(() => "unmet");
    case "verification_required":
      return requirements.map((requirement) => gateMatchesMissingCapability(requirement, gate.eligibility) ? "unmet" : "met");
    default:
      return requirements.map(() => "unknown");
  }
}

function getJoinableDescription(gate: CommunityGateData, action: InteractionAction, fallback: string, options: { locale: string }): string {
  const normalized = options.locale.toLowerCase();
  if (normalized.startsWith("ar") || normalized.startsWith("zh")) return fallback;

  const taskLabel = getInteractionTaskLabel(action, options);
  if (gate.preview.membership_gate_summaries.length > 0) {
    return `You meet this community's requirements. Join to ${taskLabel}.`;
  }

  return fallback;
}

function createDefaultBlockedModalState({
  action,
  closeModal,
  gate,
  interactionCopy,
  openCommunity,
  defaultVerificationLoadingProvider,
  startDefaultVerification,
}: BuildBlockedModalStateArgs): ModalState {
  const isVoteAction = action === "vote_post" || action === "vote_comment";

  switch (gate.eligibility.status) {
    case "verification_required":
      {
        const provider = resolveSuggestedVerificationProvider(gate.eligibility);
        if (provider === "passport") {
          const passportPrompt = getVerificationPromptCopy("passport", getPassportPromptCapabilities(gate.eligibility), { locale: interactionCopy.locale });
          return {
            description: getPassportPromptDescription(gate, passportPrompt.description, { locale: interactionCopy.locale }),
            icon: "passport",
            primaryAction: {
              label: passportPrompt.actionLabel,
              onClick: () => {
                window.open("https://app.passport.xyz/", "_blank", "noopener,noreferrer");
                closeModal();
              },
            },
            requirements: gate.preview.membership_gate_summaries,
            requirementStatuses: getRequirementStatuses(gate),
            title: passportPrompt.title,
          };
        }
        const verificationPrompt = getVerificationPromptCopy(
          provider,
          getVerificationCapabilitiesForProvider(gate.eligibility, provider),
          { locale: interactionCopy.locale },
        );
        return {
          description: verificationPrompt.description,
          icon: provider,
          primaryAction: {
            label: verificationPrompt.actionLabel || interactionCopy.taskVerify,
            loading: defaultVerificationLoadingProvider === provider,
            onClick: async () => {
              if (startDefaultVerification) {
                await startDefaultVerification({ gate, provider });
                return;
              }
              closeModal();
              openCommunity();
            },
          },
          requirements: gate.preview.membership_gate_summaries,
          requirementStatuses: getRequirementStatuses(gate),
          title: isVoteAction
            ? interactionCopy.verifyToVoteTitle
            : interactionCopy.verifyToReplyTitle,
        };
      }
    case "joinable":
    case "requestable": {
      const ctaLabel = getJoinCtaLabel(gate.eligibility, { locale: interactionCopy.locale });
      const defaultDescription = interpolateMessage(
        isVoteAction
          ? interactionCopy.joinToVoteDescription
          : interactionCopy.joinToReplyDescription,
        {
          communityName: gate.preview.display_name,
          joinLabel: ctaLabel,
        },
      );
      return {
        description: gate.eligibility.status === "joinable"
          ? getJoinableDescription(gate, action, defaultDescription, { locale: interactionCopy.locale })
          : getRequestableDescription(gate, action, defaultDescription, { locale: interactionCopy.locale }),
        icon: "join",
        primaryAction: {
          label: getJoinActionLabel(gate.eligibility, { locale: interactionCopy.locale }),
          onClick: () => {
            closeModal();
            openCommunity();
          },
        },
        requirements: gate.preview.membership_gate_summaries,
        requirementStatuses: getRequirementStatuses(gate),
        title: getJoinGateTitle(action, { locale: interactionCopy.locale }) ?? interpolateMessage(
          isVoteAction
            ? interactionCopy.joinToVoteTitle
            : interactionCopy.joinToReplyTitle,
          { joinLabel: ctaLabel },
        ),
      };
    }
    case "pending_request":
      return {
        description: "The moderators will review your request.",
        icon: "pending",
        requirements: gate.preview.membership_gate_summaries,
        requirementStatuses: getRequirementStatuses(gate),
        title: "Request pending",
      };
    case "gate_failed":
    case "banned":
      return {
        description: gate.eligibility.status === "banned"
          ? interactionCopy.bannedDescription
          : gate.eligibility.failure_reason
            ? getGateFailureMessage(gate.eligibility, { locale: interactionCopy.locale }) ?? (isVoteAction ? interactionCopy.blockedVoteDescription : interactionCopy.blockedReplyDescription)
            : isVoteAction
            ? interactionCopy.blockedVoteDescription
            : interactionCopy.blockedReplyDescription,
        requirements: gate.eligibility.status === "gate_failed"
          ? getFailedGateRequirements(gate)
          : gate.preview.membership_gate_summaries,
        requirementStatuses: getRequirementStatuses(
          gate,
          gate.eligibility.status === "gate_failed"
            ? getFailedGateRequirements(gate)
            : gate.preview.membership_gate_summaries,
        ),
        icon: "blocked",
        title: isVoteAction
          ? interactionCopy.cantVoteHereTitle
          : interactionCopy.cantReplyHereTitle,
      };
    case "already_joined":
      return {
        description: interactionCopy.readyDescription,
        icon: "ready",
        requirements: gate.preview.membership_gate_summaries,
        requirementStatuses: getRequirementStatuses(gate),
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
  const pendingInteractionRef = React.useRef<PendingInteraction | null>(null);
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

  const updateCachedGate = React.useCallback((communityId: string, gate: CommunityGateData) => {
    communityGateCache.set(getGateCacheKey(sessionKey, communityId), {
      expiresAt: Date.now() + COMMUNITY_GATE_CACHE_TTL_MS,
      value: gate,
    });
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

  const completeVerificationJoin = React.useCallback(async () => {
    const pendingInteraction = pendingInteractionRef.current;
    if (!pendingInteraction) {
      toast.success(interactionCopy.readyDescription);
      return;
    }

    const { action, communityId, gate, onAllowed } = pendingInteraction;
    let nextEligibility: JoinEligibility;
    try {
      nextEligibility = await api.communities.getJoinEligibility(communityId);
      updateCachedGate(communityId, { ...gate, eligibility: nextEligibility });

      if (nextEligibility.status === "joinable") {
        const joinResult = await api.communities.join(communityId);
        invalidateCommunityGate(communityId);
        if (joinResult.status === "requested") {
          setModalState({
            description: "The moderators will review your request.",
            icon: "pending",
            requirements: gate.preview.membership_gate_summaries,
            requirementStatuses: getRequirementStatuses({ ...gate, eligibility: nextEligibility }),
            title: "Request pending",
          });
          return;
        }
        nextEligibility = await api.communities.getJoinEligibility(communityId);
        updateCachedGate(communityId, { ...gate, eligibility: nextEligibility });
      }

      if (nextEligibility.status === "already_joined") {
        setModalState({
          description: getReadyAfterJoinDescription(gate, action, { locale: interactionCopy.locale }),
          primaryAction: {
            label: getReadyActionLabel(action, { locale: interactionCopy.locale }),
            onClick: async () => {
              closeModal();
              pendingInteractionRef.current = null;
              await onAllowed();
            },
          },
          requirements: [],
          requirementStatuses: [],
          icon: "ready",
          title: interactionCopy.readyTitle,
        });
        return;
      }

      if (nextEligibility.status === "pending_request") {
        setModalState({
          description: "The moderators will review your request.",
          icon: "pending",
          requirements: gate.preview.membership_gate_summaries,
          requirementStatuses: getRequirementStatuses({ ...gate, eligibility: nextEligibility }),
          title: "Request pending",
        });
        return;
      }

      setModalState(createDefaultBlockedModalState({
        action,
        closeModal,
        gate: { ...gate, eligibility: nextEligibility },
        invalidateCommunityGate,
        interactionCopy,
        openCommunity: () => navigate(buildCommunityPath(gate.preview.community_id)),
      }));
    } catch (error: unknown) {
      toast.error(getApiErrorMessage(error, "Verification completed, but Pirate could not join this community."));
    }
  }, [api.communities, closeModal, interactionCopy, invalidateCommunityGate, updateCachedGate]);

  const {
    startVerification: startVeryVerification,
    verificationError: veryError,
    verificationLoading: veryLoading,
  } = useVeryVerification({
    verified: false,
    verificationIntent: "community_join",
    onVerified: completeVerificationJoin,
  });

  const {
    handleModalOpenChange: handleSelfModalOpenChange,
    selfError,
    selfLoading,
    selfModalOpen,
    selfPrompt,
    startVerification: startSelfVerificationFlow,
  } = useSelfVerification({
    completeErrorMessage: "Verification completion failed",
    locale: interactionCopy.locale,
    onVerified: completeVerificationJoin,
    startErrorMessage: "Could not start self verification",
    storageKey: SELF_INTERACTION_GATE_STORAGE_KEY,
    verificationIntent: "community_join",
  });

  React.useEffect(() => {
    if (veryError) {
      toast.error(veryError);
    }
  }, [veryError]);

  const startDefaultVerification = React.useCallback(async ({
    gate,
    provider,
  }: {
    gate: CommunityGateData;
    provider: "self" | "very";
  }): Promise<{ started: boolean }> => {
    if (provider === "very") {
      const result = await startVeryVerification();
      if (result.started) {
        closeModal();
      }
      return result;
    }

    const requestedCapabilities = getVerificationCapabilitiesForProvider(gate.eligibility, "self");
    const verificationRequirements = getVerificationRequirementsForGates(gate.eligibility.membership_gate_summaries);
    if (requestedCapabilities.length === 0 && verificationRequirements.length === 0) {
      const message = "This community is missing the Self verification details needed to continue.";
      toast.error(message);
      return { started: false };
    }

    const result = await startSelfVerificationFlow({
      requestedCapabilities,
      unavailableMessage: "This community is missing the Self verification details needed to continue.",
      verificationRequirements,
    });
    if (!result.started && result.error) {
      toast.error(result.error);
    }
    if (result.started) {
      closeModal();
    }
    return result;
  }, [closeModal, startSelfVerificationFlow, startVeryVerification]);

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
      logger.info("[interaction-gate] blocked", { ...logBase, reason: "auth" });
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
      logger.warn("[interaction-gate] eligibility lookup failed", {
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
      logger.info("[interaction-gate] allowed", {
        ...logBase,
        eligibilityStatus: gate.eligibility.status,
      });
      await onAllowed();
      return "allowed";
    }

    pendingInteractionRef.current = {
      action,
      communityId,
      gate,
      onAllowed,
      postId,
    };

    const openCommunity = () => navigate(buildCommunityPath(gate.preview.community_id));
    const customModalState = buildBlockedModalState?.({
      action,
      closeModal,
      gate,
      invalidateCommunityGate,
      interactionCopy,
      openCommunity,
    });
    const builtModalState = customModalState === undefined ? createDefaultBlockedModalState({
      action,
      closeModal,
      gate,
      invalidateCommunityGate,
      interactionCopy,
      openCommunity,
      defaultVerificationLoadingProvider: veryLoading ? "very" : selfLoading ? "self" : null,
      startDefaultVerification,
    }) : customModalState;
    logger.info("[interaction-gate] blocked", {
      ...logBase,
      eligibilityStatus: gate.eligibility.status,
      missingCapabilities: gate.eligibility.missing_capabilities,
      requirements: gate.preview.membership_gate_summaries.length,
    });
    if (builtModalState) {
      setModalState(builtModalState);
    }
    return "blocked";
  }, [closeModal, connect, interactionCopy, loadCommunityGate, routeKind, session?.accessToken, invalidateCommunityGate, selfLoading, startDefaultVerification, veryLoading]);

  const interactionModal = modalState ? (
    <CommunityInteractionGateModal
      description={modalState.description}
      hideCloseButtonOnMobile={modalState.hideCloseButtonOnMobile}
      hideSecondaryActionOnMobile={modalState.hideSecondaryActionOnMobile}
      icon={modalState.icon}
      onOpenChange={(open) => {
        if (!open) closeModal();
      }}
      open
      primaryAction={modalState.primaryAction}
      requirements={modalState.requirements}
      requirementStatuses={modalState.requirementStatuses}
      secondaryAction={modalState.secondaryAction}
      title={modalState.title}
    />
  ) : null;

  const selfVerificationModal = selfPrompt ? (
    <SelfVerificationModal
      actionLabel={selfPrompt.actionLabel}
      description={selfPrompt.description}
      error={selfError}
      href={selfPrompt.href}
      onOpenChange={handleSelfModalOpenChange}
      open={selfModalOpen}
      title={selfPrompt.title}
    />
  ) : null;

  const gateModal = interactionModal || selfVerificationModal ? (
    <>
      {interactionModal}
      {selfVerificationModal}
    </>
  ) : null;

  return {
    closeInteractionGate: closeModal,
    gateModal,
    invalidateCommunityGate,
    runGatedCommunityAction,
  };
}
