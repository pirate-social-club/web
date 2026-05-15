"use client";

import * as React from "react";
import type { JoinEligibility } from "@pirate/api-contracts";

import { navigate } from "@/app/router";
import { CommunityInteractionGateModal } from "@/components/compositions/community/interaction-gate-modal/community-interaction-gate-modal";
import type { AltchaPowWidget } from "@/components/compositions/verification/altcha-pow-widget/altcha-pow-widget";
import type { SelfVerificationModal } from "@/components/compositions/verification/self-verification-modal/self-verification-modal";
import { Spinner } from "@/components/primitives/spinner";
import { toast } from "@/components/primitives/sonner";
import { useApi } from "@/lib/api";
import { getErrorMessage } from "@/lib/error-utils";
import { useSession } from "@/lib/api/session-store";
import { usePiratePrivyRuntime } from "@/components/auth/privy-provider";
import { buildCanonicalAuthUrl, isCanonicalAuthOrigin } from "@/lib/auth-origin";
import { buildCommunityPath } from "@/lib/community-routing";
import {
  getVerificationCapabilitiesForProvider,
  getVerificationRequirementsForGates,
  hasAltchaProofAction,
  getMissingCapabilitiesFromGateEvaluation,
} from "@/lib/identity-gates";
import { logger } from "@/lib/logger";
import { useSelfVerification } from "@/lib/verification/use-self-verification";
import { useVeryVerification } from "@/lib/verification/use-very-verification";
import { getLocaleMessages } from "@/locales";
import type { AltchaScope } from "@/lib/api/client-groups-core";
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
  type InteractionAction,
  type InteractionResult,
  type ModalState,
  type PendingInteraction,
  type RouteKind,
  type RunGatedCommunityActionParams,
} from "./use-community-interaction-gate.helpers";

export { resolveCommunityInteractionState } from "./use-community-interaction-gate.helpers";

const LazyAltchaPowWidget = React.lazy(async () => {
  const mod = await import("@/components/compositions/verification/altcha-pow-widget/altcha-pow-widget");
  return { default: mod.AltchaPowWidget };
}) as typeof AltchaPowWidget;
const LazySelfVerificationModal = React.lazy(async () => {
  const mod = await import("@/components/compositions/verification/self-verification-modal/self-verification-modal");
  return { default: mod.SelfVerificationModal };
}) as typeof SelfVerificationModal;

function VerificationWidgetFallback() {
  return (
    <div className="flex min-h-28 items-center justify-center">
      <Spinner className="size-5" />
    </div>
  );
}

function hasAltchaGate(gate: CommunityGateData): boolean {
  return gate.preview.membership_gate_summaries.some((summary) => summary.gate_type === "altcha_pow");
}

function getAltchaActionConfig(input: {
  action: InteractionAction;
  commentId?: string;
  gate: CommunityGateData;
  postId?: string;
}): { actionRef: string; scope: AltchaScope } | null {
  if (!hasAltchaGate(input.gate)) {
    return null;
  }
  if (input.action === "reply_post" && input.postId) {
    return { actionRef: `post:${input.postId}`, scope: "comment_create" };
  }
  if (input.action === "reply_comment" && input.commentId) {
    return { actionRef: `comment:${input.commentId}`, scope: "comment_create" };
  }
  return null;
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
	  const [passportLoading, setPassportLoading] = React.useState(false);
  const sessionKey = session?.user.id ?? null;
  const pendingInteractionRef = React.useRef<PendingInteraction | null>(null);
  const altchaPayloadRef = React.useRef<string | null>(null);
  const [altchaLoading, setAltchaLoading] = React.useState(false);
  const [altchaResetKey, setAltchaResetKey] = React.useState(0);
  const interactionCopy = React.useMemo(
    () => {
      const localeMessages = getLocaleMessages(
        uiLocale === "pseudo" ? "pseudo" : uiLocale === "ar" ? "ar" : uiLocale === "zh" ? "zh" : "en",
        "routes",
      );

      return {
        ...localeMessages.interactionGate,
        locale: uiLocale,
        openInPirate: localeMessages.publicProfile.openInPirate,
        taskVerify: localeMessages.createCommunity.startVerification,
      };
    },
    [uiLocale],
  );

  const gatesPanel = React.useMemo(() => {
    const resolvedLocale: import("@/lib/ui-locale-core").UiLocaleCode =
      uiLocale === "pseudo" ? "pseudo" : uiLocale === "ar" ? "ar" : uiLocale === "zh" ? "zh" : "en";
    return getLocaleMessages(resolvedLocale, "gates").panel;
  }, [uiLocale]);

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
          id: preview.id,
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
            description: gatesPanel.pendingRequestDescription,
            icon: "pending",
            requirements: gate.preview.membership_gate_summaries,
            requirementStatuses: getRequirementStatuses({ ...gate, eligibility: nextEligibility }),
            title: gatesPanel.pendingRequestTitle,
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
          description: gatesPanel.pendingRequestDescription,
          icon: "pending",
          requirements: gate.preview.membership_gate_summaries,
          requirementStatuses: getRequirementStatuses({ ...gate, eligibility: nextEligibility }),
          title: gatesPanel.pendingRequestTitle,
        });
        return;
      }

      setModalState(createDefaultBlockedModalState({
        action,
        closeModal,
        gate: { ...gate, eligibility: nextEligibility },
        invalidateCommunityGate,
        interactionCopy,
        openCommunity: () => navigate(buildCommunityPath(gate.preview.id)),
      }));
    } catch (error: unknown) {
      toast.error(getErrorMessage(error, "Verification completed, but Pirate could not join this community."));
    }
  }, [api.communities, closeModal, interactionCopy, invalidateCommunityGate, updateCachedGate]);

  const completeAltchaJoin = React.useCallback(async () => {
    const pendingInteraction = pendingInteractionRef.current;
    if (!pendingInteraction) {
      return;
    }
    const payload = altchaPayloadRef.current;
    if (!payload) {
      toast.error("Complete the proof-of-work check first.");
      return;
    }

    const { action, communityId, gate, onAllowed } = pendingInteraction;
    setAltchaLoading(true);
    try {
      const joinResult = await api.communities.join(communityId, undefined, { altchaPayload: payload });
      altchaPayloadRef.current = null;
      invalidateCommunityGate(communityId);
      if (joinResult.status === "requested") {
        setModalState({
          description: gatesPanel.pendingRequestDescription,
          icon: "pending",
          requirements: gate.preview.membership_gate_summaries,
          requirementStatuses: getRequirementStatuses(gate),
          title: gatesPanel.pendingRequestTitle,
        });
        return;
      }

      const nextEligibility = await api.communities.getJoinEligibility(communityId);
      updateCachedGate(communityId, { ...gate, eligibility: nextEligibility });
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

      setModalState(createDefaultBlockedModalState({
        action,
        closeModal,
        gate: { ...gate, eligibility: nextEligibility },
        invalidateCommunityGate,
        interactionCopy,
        openCommunity: () => navigate(buildCommunityPath(gate.preview.id)),
      }));
    } catch (error: unknown) {
      altchaPayloadRef.current = null;
      const nextResetKey = Date.now();
      setAltchaResetKey(nextResetKey);
      setModalState((current) => current ? {
        ...current,
        body: (
          <React.Suspense fallback={<VerificationWidgetFallback />}>
            <LazyAltchaPowWidget
              key={nextResetKey}
              action={`community:${communityId}`}
              locale={interactionCopy.locale}
              onPayloadChange={(nextPayload) => {
                altchaPayloadRef.current = nextPayload;
              }}
              scope="community_join"
            />
          </React.Suspense>
        ),
        primaryAction: current.primaryAction ? { ...current.primaryAction, loading: false } : current.primaryAction,
      } : current);
      toast.error(getErrorMessage(error, "Proof-of-work check failed."));
    } finally {
      setAltchaLoading(false);
    }
  }, [api.communities, closeModal, gatesPanel, interactionCopy, invalidateCommunityGate, updateCachedGate]);

  const completeAltchaAction = React.useCallback(async () => {
    const pendingInteraction = pendingInteractionRef.current;
    if (!pendingInteraction) {
      return;
    }
    const payload = altchaPayloadRef.current;
    if (!payload) {
      toast.error("Complete the proof-of-work check first.");
      return;
    }

    setAltchaLoading(true);
    try {
      closeModal();
      altchaPayloadRef.current = null;
      await pendingInteraction.onAllowed({ altchaPayload: payload });
      pendingInteractionRef.current = null;
    } catch (error: unknown) {
      altchaPayloadRef.current = null;
      setAltchaResetKey((current) => current + 1);
      toast.error(getErrorMessage(error, "Proof-of-work check failed."));
    } finally {
      setAltchaLoading(false);
    }
  }, [closeModal]);

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
	    provider: "self" | "very" | "passport";
	  }): Promise<{ started: boolean }> => {
	    if (provider === "passport") {
	      const pendingInteraction = pendingInteractionRef.current;
	      const communityId = pendingInteraction?.communityId ?? gate.preview.id;
	      setPassportLoading(true);
	      try {
	        const refreshed = await api.verification.refreshPassportWalletScore({ community: communityId });
	        let nextEligibility = refreshed.join_eligibility ?? await api.communities.getJoinEligibility(communityId);
	        updateCachedGate(communityId, { ...gate, eligibility: nextEligibility });
	        if (nextEligibility.status === "joinable") {
	          const joinResult = await api.communities.join(communityId);
	          invalidateCommunityGate(communityId);
	          if (joinResult.status === "requested") {
	            setModalState({
	              description: gatesPanel.pendingRequestDescription,
	              icon: "pending",
	              requirements: gate.preview.membership_gate_summaries,
	              requirementStatuses: getRequirementStatuses({ ...gate, eligibility: nextEligibility }),
	              title: gatesPanel.pendingRequestTitle,
	            });
	            return { started: true };
	          }
	          nextEligibility = await api.communities.getJoinEligibility(communityId);
	          updateCachedGate(communityId, { ...gate, eligibility: nextEligibility });
	        }
	        if (nextEligibility.status === "already_joined") {
	          setModalState({
	            description: pendingInteraction
	              ? getReadyAfterJoinDescription(gate, pendingInteraction.action, { locale: interactionCopy.locale })
	              : interactionCopy.readyDescription,
	            primaryAction: {
	              label: pendingInteraction
	                ? getReadyActionLabel(pendingInteraction.action, { locale: interactionCopy.locale })
	                : interactionCopy.readyTitle,
	              onClick: async () => {
	                closeModal();
	                pendingInteractionRef.current = null;
	                await pendingInteraction?.onAllowed();
	              },
	            },
	            requirements: [],
	            requirementStatuses: [],
	            icon: "ready",
	            title: interactionCopy.readyTitle,
	          });
	          return { started: true };
	        }
	        setModalState(createDefaultBlockedModalState({
	          action: pendingInteraction?.action ?? "reply_post",
	          closeModal,
	          gate: { ...gate, eligibility: nextEligibility },
	          invalidateCommunityGate,
	          interactionCopy,
	          openCommunity: () => navigate(buildCommunityPath(gate.preview.id)),
	          defaultVerificationLoadingProvider: "passport",
	          startDefaultVerification,
	        }));
	        return { started: true };
	      } catch (error: unknown) {
	        toast.error(getErrorMessage(error, "Could not refresh Passport score."));
	        return { started: false };
	      } finally {
	        setPassportLoading(false);
	      }
	    }

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
	  }, [api.communities, api.verification, closeModal, interactionCopy, invalidateCommunityGate, startSelfVerificationFlow, startVeryVerification, updateCachedGate]);

  const runGatedCommunityAction = React.useCallback(async ({
    action,
    buildBlockedModalState,
    communityId,
    gateData,
    onAllowed,
	    postId,
	    commentId,
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
      if (!isCanonicalAuthOrigin()) {
        const canonicalUrl = buildCanonicalAuthUrl(
          action === "vote_post" && postId ? `/p/${postId}` : buildCommunityPath(communityId),
        );
        toast.info(interactionCopy.connectToContinue, {
          action: {
            label: interactionCopy.openInPirate,
            onClick: () => {
              window.location.href = canonicalUrl;
            },
          },
        });
        return "blocked";
      }
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

    const actionAltchaConfig = getAltchaActionConfig({ action, commentId, gate, postId });
    if (state === "allowed" && actionAltchaConfig) {
      pendingInteractionRef.current = {
        action,
        commentId,
        communityId,
        gate,
        onAllowed,
        postId,
      };
      setModalState({
        body: (
          <React.Suspense fallback={<VerificationWidgetFallback />}>
            <LazyAltchaPowWidget
              key={altchaResetKey}
              action={actionAltchaConfig.actionRef}
              locale={interactionCopy.locale}
              onPayloadChange={(payload) => {
                altchaPayloadRef.current = payload;
              }}
              scope={actionAltchaConfig.scope}
            />
          </React.Suspense>
        ),
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

    pendingInteractionRef.current = {
      action,
      commentId,
      communityId,
      gate,
      onAllowed,
      postId,
    };

    const openCommunity = () => navigate(buildCommunityPath(gate.preview.id));
    const customModalState = buildBlockedModalState?.({
      action,
      closeModal,
      gate,
      invalidateCommunityGate,
      interactionCopy,
      openCommunity,
    });
    const altchaModalState: ModalState | undefined =
      customModalState === undefined &&
      gate.eligibility.status === "verification_required" &&
      hasAltchaProofAction(gate.eligibility)
        ? {
            body: (
              <React.Suspense fallback={<VerificationWidgetFallback />}>
                <LazyAltchaPowWidget
                  key={altchaResetKey}
                  action={`community:${communityId}`}
                  locale={interactionCopy.locale}
                  onPayloadChange={(payload) => {
                    altchaPayloadRef.current = payload;
                  }}
                  scope="community_join"
                />
              </React.Suspense>
            ),
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
    const builtModalState = customModalState === undefined ? (altchaModalState ?? createDefaultBlockedModalState({
      action,
      closeModal,
      gate,
      invalidateCommunityGate,
      interactionCopy,
      openCommunity,
	      defaultVerificationLoadingProvider: passportLoading ? "passport" : veryLoading ? "very" : selfLoading ? "self" : null,
	      startDefaultVerification,
	    })) : customModalState;
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
	  }, [altchaLoading, altchaResetKey, closeModal, completeAltchaAction, completeAltchaJoin, connect, interactionCopy, loadCommunityGate, routeKind, session?.accessToken, invalidateCommunityGate, passportLoading, selfLoading, startDefaultVerification, veryLoading]);

  const interactionModal = modalState ? (
    <CommunityInteractionGateModal
      description={modalState.description}
      body={modalState.body}
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
    <React.Suspense fallback={null}>
      <LazySelfVerificationModal
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
    </React.Suspense>
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
