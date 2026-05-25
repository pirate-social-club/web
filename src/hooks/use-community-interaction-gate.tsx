"use client";

import * as React from "react";

import { navigate } from "@/app/router";
import { CommunityInteractionGateModal } from "@/components/compositions/community/interaction-gate-modal/community-interaction-gate-modal";
import type { SelfVerificationModal } from "@/components/compositions/verification/self-verification-modal/self-verification-modal";
import { toast } from "@/components/primitives/sonner";
import { useApi } from "@/lib/api";
import { getErrorMessage } from "@/lib/error-utils";
import { useSession } from "@/lib/api/session-store";
import { usePiratePrivyRuntime } from "@/components/auth/privy-provider";
import { buildCommunityPath } from "@/lib/community-routing";
import { useSelfVerification } from "@/lib/verification/use-self-verification";
import { useVeryVerification } from "@/lib/verification/use-very-verification";
import { getLocaleMessages } from "@/locales";
import {
  completeAltchaAction as completeAltchaActionFlow,
  completeAltchaJoin as completeAltchaJoinFlow,
} from "./community-interaction-gate/altcha-completion";
import { useCommunityGateData } from "./community-interaction-gate/use-community-gate-data";
import { useDefaultVerificationActions } from "./community-interaction-gate/use-default-verification-actions";
import { useGatedActionRunner } from "./community-interaction-gate/use-gated-action-runner";
import { useInteractionAltcha } from "./community-interaction-gate/use-interaction-altcha";
import { useVerificationCompletion } from "./community-interaction-gate/use-verification-completion";
import {
  SELF_INTERACTION_GATE_STORAGE_KEY,
  type ModalState,
  type PendingInteraction,
  type RouteKind,
} from "./use-community-interaction-gate.helpers";

export { resolveCommunityInteractionState } from "./use-community-interaction-gate.helpers";

const LazySelfVerificationModal = React.lazy(async () => {
  const mod = await import("@/components/compositions/verification/self-verification-modal/self-verification-modal");
  return { default: mod.SelfVerificationModal };
}) as typeof SelfVerificationModal;

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
  const sessionKey = session?.user.id ?? null;
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

  const closeModal = React.useCallback(() => {
    setModalState(null);
  }, []);

  const {
    invalidateCommunityGate,
    loadCommunityGate,
    updateCachedGate,
  } = useCommunityGateData({
    communitiesApi: api.communities,
    previewLocale,
    sessionKey,
  });
  const handleMissingAltchaPayload = React.useCallback(() => {
    toast.error("Complete the proof-of-work check first.");
  }, []);
  const {
    altchaLoading,
    buildAltchaBody,
    completeAltchaAction: completeAltchaActionWithPayload,
    completeAltchaJoin: completeAltchaJoinWithPayload,
  } = useInteractionAltcha({
    locale: interactionCopy.locale,
    onMissingPayload: handleMissingAltchaPayload,
  });

  const { completeVerificationJoin: completeVerificationJoinWithPending } = useVerificationCompletion({
    clearPendingInteraction: () => {
      pendingInteractionRef.current = null;
    },
    closeModal,
    gatesPanel,
    getJoinEligibility: api.communities.getJoinEligibility,
    interactionCopy,
    invalidateCommunityGate,
    joinCommunity: api.communities.join,
    openCommunity: (communityId) => navigate(buildCommunityPath(communityId)),
    setModalState,
    showError: (message) => {
      toast.error(message);
    },
    showSuccess: (message) => {
      toast.success(message);
    },
    updateCachedGate,
  });
  const completeVerificationJoin = React.useCallback(async () => {
    await completeVerificationJoinWithPending(pendingInteractionRef.current);
  }, [completeVerificationJoinWithPending]);

  const completeAltchaJoin = React.useCallback(async (payloadOverride?: string | null) => {
    const pendingInteraction = pendingInteractionRef.current;
    if (!pendingInteraction) {
      return;
    }

    await completeAltchaJoinWithPayload(async (payload) => {
      await completeAltchaJoinFlow({
        clearPendingInteraction: () => {
          pendingInteractionRef.current = null;
        },
        closeModal,
        communitiesApi: api.communities,
        gatesPanel,
        interactionCopy,
        invalidateCommunityGate,
        payload,
        pendingInteraction,
        setModalState,
        updateCachedGate,
      });
    }, (error, nextResetKey) => {
      setModalState((current) => current ? {
        ...current,
        body: buildAltchaBody({
          action: `community:${pendingInteraction.communityId}`,
          resetKey: nextResetKey,
          scope: "community_join",
        }),
        primaryAction: current.primaryAction ? { ...current.primaryAction, loading: false } : current.primaryAction,
      } : current);
      toast.error(getErrorMessage(error, "Proof-of-work check failed."));
    }, payloadOverride);
  }, [api.communities, buildAltchaBody, closeModal, completeAltchaJoinWithPayload, gatesPanel, interactionCopy, invalidateCommunityGate, updateCachedGate]);

  const completeAltchaAction = React.useCallback(async (payloadOverride?: string | null) => {
    const pendingInteraction = pendingInteractionRef.current;
    if (!pendingInteraction) {
      return;
    }

    await completeAltchaActionWithPayload(async (context) => {
      await completeAltchaActionFlow({
        clearPendingInteraction: () => {
          pendingInteractionRef.current = null;
        },
        closeModal,
        context,
        pendingInteraction,
      });
    }, (error) => {
      toast.error(getErrorMessage(error, "Proof-of-work check failed."));
    }, payloadOverride);
  }, [closeModal, completeAltchaActionWithPayload]);

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

  const {
    passportLoading,
    startDefaultVerification,
  } = useDefaultVerificationActions({
    clearPendingInteraction: () => {
      pendingInteractionRef.current = null;
    },
    closeModal,
    gatesPanel,
    getJoinEligibility: api.communities.getJoinEligibility,
    getPendingInteraction: () => pendingInteractionRef.current,
    interactionCopy,
    invalidateCommunityGate,
    joinCommunity: api.communities.join,
    openCommunity: (communityId) => navigate(buildCommunityPath(communityId)),
    refreshPassportWalletScore: api.verification.refreshPassportWalletScore,
    setModalState,
    showError: (message) => {
      toast.error(message);
    },
    startSelfVerificationFlow,
    startVeryVerification,
    updateCachedGate,
  });

  const runGatedCommunityAction = useGatedActionRunner({
    altchaLoading,
    buildAltchaBody,
    closeModal,
    completeAltchaAction,
    completeAltchaJoin,
    connect,
    defaultVerificationLoadingProvider: passportLoading
      ? "passport"
      : veryLoading
        ? "very"
        : selfLoading
          ? "self"
          : null,
    interactionCopy,
    invalidateCommunityGate,
    loadCommunityGate,
    routeKind,
    sessionAccessToken: session?.accessToken,
    setModalState,
    setPendingInteraction: (pendingInteraction) => {
      pendingInteractionRef.current = pendingInteraction;
    },
    startDefaultVerification,
  });

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
