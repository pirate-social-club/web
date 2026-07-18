"use client";

import * as React from "react";

import { navigate } from "@/app/router";
import { CommunityInteractionGateModal } from "@/components/compositions/community/interaction-gate-modal/community-interaction-gate-modal";
import type { SelfVerificationModal } from "@/components/compositions/verification/self-verification-modal/self-verification-modal";
import type { ZkPassportVerificationModal } from "@/components/compositions/verification/zkpassport-verification-modal/zkpassport-verification-modal";
import { toast } from "@/components/primitives/sonner";
import { useApi } from "@/lib/api";
import { getErrorMessage } from "@/lib/error-utils";
import {
  revalidateSession,
  updateSessionUser,
  useSession,
  type StoredSession,
} from "@/lib/api/session-store";
import type { VerificationIntent } from "@pirate/api-contracts";
import { usePiratePrivyRuntime } from "@/components/auth/privy-provider";
import { buildCommunityPath } from "@/lib/community-routing";
import { logger } from "@/lib/logger";
import { useSelfVerification } from "@/lib/verification/use-self-verification";
import { useVeryVerification } from "@/lib/verification/use-very-verification";
import { useZkPassportVerification } from "@/lib/verification/use-zkpassport-verification";
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
  type CommunityGateData,
  type ModalState,
  type PendingInteraction,
  type RouteKind,
} from "./use-community-interaction-gate.helpers";

export { resolveCommunityInteractionState } from "./use-community-interaction-gate.helpers";

const LazySelfVerificationModal = React.lazy(async () => {
  const mod = await import("@/components/compositions/verification/self-verification-modal/self-verification-modal");
  return { default: mod.SelfVerificationModal };
}) as typeof SelfVerificationModal;

const LazyZkPassportVerificationModal = React.lazy(async () => {
  const mod = await import("@/components/compositions/verification/zkpassport-verification-modal/zkpassport-verification-modal");
  return { default: mod.ZkPassportVerificationModal };
}) as typeof ZkPassportVerificationModal;

export function verificationIntentForInteraction(
  interaction: PendingInteraction | null,
): VerificationIntent {
  switch (interaction?.action) {
    case "reply_post":
    case "reply_comment":
      return "comment_create";
    case "vote_post":
    case "vote_comment":
    default:
      return interaction?.gate.eligibility.suggested_verification_intent ?? "community_join";
  }
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
  const { connect, reconnectEthereumWallet } = usePiratePrivyRuntime();
  const [modalState, setModalState] = React.useState<ModalState | null>(null);
  const [zkPassportModalOpen, setZkPassportModalOpen] = React.useState(false);
  const [walletConnectionLoading, setWalletConnectionLoading] = React.useState(false);
  const sessionKey = session?.user.id ?? null;
  const pendingInteractionRef = React.useRef<PendingInteraction | null>(null);
  const rerunJoinedInteractionRef = React.useRef<(
    pendingInteraction: PendingInteraction,
    joinedGate: CommunityGateData,
  ) => Promise<void> | void>(() => undefined);
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
    toast.error("Complete the browser anti-bot check first.");
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

  const completeAltchaJoin = React.useCallback(async () => {
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
        rerunJoinedInteraction: (joinedInteraction, joinedGate) =>
          rerunJoinedInteractionRef.current(joinedInteraction, joinedGate),
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
      toast.error(getErrorMessage(error, "Browser anti-bot check failed."));
    });
  }, [api.communities, buildAltchaBody, closeModal, completeAltchaJoinWithPayload, gatesPanel, interactionCopy, invalidateCommunityGate, updateCachedGate]);

  const completeAltchaAction = React.useCallback(async () => {
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
        invalidateCommunityGate,
        pendingInteraction,
      });
    }, (error) => {
      logger.warn("[interaction-gate] action after browser check failed", {
        action: pendingInteraction.action,
        communityId: pendingInteraction.communityId,
        message: getErrorMessage(error, "Browser anti-bot check failed."),
        postId: pendingInteraction.postId,
      });
    });
  }, [closeModal, completeAltchaActionWithPayload, invalidateCommunityGate]);

  const {
    startVerification: startVeryVerification,
    verificationError: veryError,
    verificationLoading: veryLoading,
  } = useVeryVerification({
    verified: false,
    verificationIntent: () =>
      verificationIntentForInteraction(pendingInteractionRef.current),
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
    verificationIntent: () =>
      verificationIntentForInteraction(pendingInteractionRef.current),
  });

  const {
    checkPendingVerification: checkZkPassportPendingVerification,
    startVerification: startZkPassportVerificationFlow,
    verificationError: zkPassportError,
    verificationHref: zkPassportHref,
    verificationLoading: zkPassportLoading,
  } = useZkPassportVerification({
    onVerified: async () => {
      setZkPassportModalOpen(false);
      await completeVerificationJoin();
    },
    verificationIntent: () =>
      verificationIntentForInteraction(pendingInteractionRef.current),
  });

  const startZkPassportVerificationWithModal = React.useCallback(async (
    options: Parameters<typeof startZkPassportVerificationFlow>[0],
  ) => {
    const result = await startZkPassportVerificationFlow({
      ...options,
      deferOpen: true,
    });
    if (result.started && result.href) {
      setZkPassportModalOpen(true);
    }
    return result;
  }, [startZkPassportVerificationFlow]);

  React.useEffect(() => {
    if (veryError) {
      toast.error(veryError);
    }
  }, [veryError]);

  React.useEffect(() => {
    if (zkPassportError) {
      toast.error(zkPassportError);
    }
  }, [zkPassportError]);

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
    startZkPassportVerificationFlow: startZkPassportVerificationWithModal,
    updateCachedGate,
  });
  const startWalletConnection = React.useCallback(async () => {
    const openWalletConnection = reconnectEthereumWallet ?? connect;
    if (!openWalletConnection) {
      toast.error("Could not open wallet connection.");
      return { started: false };
    }

    setWalletConnectionLoading(true);
    try {
      openWalletConnection();
      toast.info("Connect the wallet that holds the required NFT, then try again.");
      return { started: true };
    } finally {
      setWalletConnectionLoading(false);
    }
  }, [connect, reconnectEthereumWallet]);

  const refreshSessionUser = React.useCallback(async () => {
    let refreshedUser: StoredSession["user"] | null = null;
    const ok = await revalidateSession(async () => {
      refreshedUser = await api.users.getMe();
      return refreshedUser;
    });
    if (!ok || !refreshedUser) {
      return null;
    }
    updateSessionUser(refreshedUser);
    return refreshedUser;
  }, [api.users]);

  const runGatedCommunityAction = useGatedActionRunner({
    altchaLoading,
    buildAltchaBody,
    closeModal,
    completeAltchaAction,
    completeAltchaJoin,
    connect,
    defaultVerificationLoadingProvider: passportLoading
      ? "passport"
      : zkPassportLoading
        ? "zkpassport"
        : veryLoading
          ? "very"
          : selfLoading
            ? "self"
            : null,
    interactionCopy,
    invalidateCommunityGate,
    loadCommunityGate,
    refreshSessionUser,
    routeKind,
    sessionAccessToken: session?.accessToken,
    sessionUser: session?.user ?? null,
    setModalState,
    setPendingInteraction: (pendingInteraction) => {
      pendingInteractionRef.current = pendingInteraction;
    },
    startDefaultVerification,
    startWalletConnection,
    walletConnectionLoading,
  });

  rerunJoinedInteractionRef.current = async (pendingInteraction, joinedGate) => {
    if (pendingInteraction.resumeActionAfterJoin === false) {
      await pendingInteraction.onAllowed();
      return;
    }
    await runGatedCommunityAction({
      action: pendingInteraction.action,
      commentId: pendingInteraction.commentId,
      communityId: pendingInteraction.communityId,
      gateData: joinedGate,
      onAllowed: pendingInteraction.onAllowed,
      postId: pendingInteraction.postId,
      requireMembership: pendingInteraction.requireMembership,
      resumeActionAfterJoin: pendingInteraction.resumeActionAfterJoin,
      voteValue: pendingInteraction.voteValue,
    });
  };

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
      requirementGroups={modalState.requirementGroups}
      requirements={modalState.requirements}
      requirementsMode={modalState.requirementsMode}
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

  const zkPassportVerificationModal = zkPassportModalOpen ? (
    <React.Suspense fallback={null}>
      <LazyZkPassportVerificationModal
        actionLabel="Open ZKPassport"
        checkLoading={zkPassportLoading}
        description="Verify with ZKPassport to continue."
        error={zkPassportError}
        href={zkPassportHref}
        onCheckPending={checkZkPassportPendingVerification}
        onOpenChange={setZkPassportModalOpen}
        open={zkPassportModalOpen}
        title="Verify with ZKPassport"
      />
    </React.Suspense>
  ) : null;

  const gateModal = interactionModal || selfVerificationModal || zkPassportVerificationModal ? (
    <>
      {interactionModal}
      {selfVerificationModal}
      {zkPassportVerificationModal}
    </>
  ) : null;

  return {
    closeInteractionGate: closeModal,
    gateModal,
    invalidateCommunityGate,
    prewarmCommunityGate: updateCachedGate,
    runGatedCommunityAction,
  };
}
