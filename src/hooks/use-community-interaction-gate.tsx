"use client";

import * as React from "react";
import type { JoinEligibility } from "@pirate/api-contracts";

import { navigate } from "@/app/router";
import { CommunityInteractionGateModal } from "@/components/compositions/community/interaction-gate-modal/community-interaction-gate-modal";
import { SelfVerificationModal } from "@/components/compositions/verification/self-verification-modal/self-verification-modal";
import { toast } from "@/components/primitives/sonner";
import { useApi } from "@/lib/api";
import { getErrorMessage } from "@/lib/error-utils";
import { useSession } from "@/lib/api/session-store";
import { usePiratePrivyRuntime } from "@/components/auth/privy-provider";
import { buildCommunityPath } from "@/lib/community-routing";
import {
  getVerificationCapabilitiesForProvider,
  getVerificationRequirementsForGates,
} from "@/lib/identity-gates";
import { logger } from "@/lib/logger";
import { useSelfVerification } from "@/lib/verification/use-self-verification";
import { useVeryVerification } from "@/lib/verification/use-very-verification";
import { getLocaleMessages } from "@/locales";
import {
  COMMUNITY_GATE_CACHE_TTL_MS,
  SELF_INTERACTION_GATE_STORAGE_KEY,
  communityGateCache,
  communityGateRequests,
  createDefaultBlockedModalState,
  getGateCacheKey,
  getReadyActionLabel,
  getReadyAfterJoinDescription,
  getRequirementStatuses,
  resolveCommunityInteractionState,
  type CommunityGateData,
  type InteractionResult,
  type ModalState,
  type PendingInteraction,
  type RouteKind,
  type RunGatedCommunityActionParams,
} from "./use-community-interaction-gate.helpers";

export { resolveCommunityInteractionState } from "./use-community-interaction-gate.helpers";

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
      toast.error(getErrorMessage(error, "Verification completed, but Pirate could not join this community."));
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
    handleSelfQrError,
    handleSelfQrSuccess,
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
      skipModal: true,
    });
    if (!result.started && result.error) {
      toast.error(result.error);
    }
    if (result.started) {
      closeModal();
      if (result.openedModal) {
        return { started: result.started };
      }
      if (result.href) {
        window.location.href = result.href;
      } else {
        toast.error("Could not get Self app launch link.");
      }
    }
    return { started: result.started };
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
      onQrError={handleSelfQrError}
      onQrSuccess={handleSelfQrSuccess}
      open={selfModalOpen}
      selfApp={selfPrompt.selfApp}
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
