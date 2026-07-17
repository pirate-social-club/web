"use client";

import * as React from "react";
import type {
  CommunityHandleMeResponse,
  CommunityHandleStatusResponse,
  JoinEligibility as ApiJoinEligibility,
} from "@pirate/api-contracts";

type JoinAttemptOptions = {
  altchaPayload?: string | null;
  note?: string | null;
};

type JoinAttemptResult = "blocked" | "failed" | "joined" | "requested";

type CommunityHandleClaimApi = {
  getHandleStatus: (
    communityId: string,
    selector?: { namespaceVerification?: string | null },
  ) => Promise<CommunityHandleStatusResponse>;
  getMyHandle: (
    communityId: string,
    selector?: { namespaceVerification?: string | null },
  ) => Promise<CommunityHandleMeResponse>;
};

type CommunityHandleClaimDismissal = {
  dismiss: () => void;
  isDismissed: () => boolean;
};

type CommunityHandleClaimState = {
  phase: string;
};

export interface UseCommunityMembershipActionsOptions {
  altchaPayload: string | null;
  altchaRequired: boolean;
  communityId: string;
  eligibility: ApiJoinEligibility | null;
  handleClaim: CommunityHandleClaimState;
  handleClaimApi: CommunityHandleClaimApi;
  handleClaimCommunityId: string;
  handleClaimNamespaceVerificationId?: string | null;
  handleClaimDismissal: CommunityHandleClaimDismissal;
  handleJoin: (options?: JoinAttemptOptions) => Promise<JoinAttemptResult>;
  invalidateCommunityGate?: (communityId: string) => void;
  onAuthRequired?: () => void;
  onHandleClaimCheckError?: (error: unknown) => void;
  sessionUserId?: string | null;
}

export interface CommunityMembershipActions {
  handleClaimModalOpen: boolean;
  handleClaimModalOpenChange: (open: boolean) => void;
  handleClaimNotNow: () => void;
  handleJoinRequestModalOpenChange: (open: boolean) => void;
  handleJoinRequestSubmit: (note: string) => Promise<void>;
  handleProofOfWorkVerified: (payload: string) => Promise<void>;
  handlePrimaryJoinAction: () => Promise<void>;
  joinRequestError: string | null;
  joinRequestModalOpen: boolean;
  joinRequestSubmitting: boolean;
  proofOfWorkModalOpen: boolean;
  proofOfWorkRetryKey: number;
  setProofOfWorkModalOpen: React.Dispatch<React.SetStateAction<boolean>>;
}

export function useCommunityMembershipActions({
  altchaPayload,
  altchaRequired,
  communityId,
  eligibility,
  handleClaim,
  handleClaimApi,
  handleClaimCommunityId,
  handleClaimNamespaceVerificationId,
  handleClaimDismissal,
  handleJoin,
  invalidateCommunityGate,
  onAuthRequired,
  onHandleClaimCheckError,
  sessionUserId,
}: UseCommunityMembershipActionsOptions): CommunityMembershipActions {
  const [joinRequestModalOpen, setJoinRequestModalOpen] = React.useState(false);
  const [joinRequestSubmitting, setJoinRequestSubmitting] = React.useState(false);
  const [joinRequestError, setJoinRequestError] = React.useState<string | null>(null);
  const [proofOfWorkModalOpen, setProofOfWorkModalOpen] = React.useState(false);
  const [proofOfWorkRetryKey, setProofOfWorkRetryKey] = React.useState(0);
  const [handleClaimModalOpen, setHandleClaimModalOpen] = React.useState(false);
  const previousEligibilityStatusRef = React.useRef<ApiJoinEligibility["status"] | null>(
    eligibility?.status ?? null,
  );

  const maybeOpenHandleClaimModal = React.useCallback(async () => {
    if (!sessionUserId || handleClaimDismissal.isDismissed()) {
      return;
    }

    try {
      const selector = {
        namespaceVerification: handleClaimNamespaceVerificationId,
      };
      const status = await handleClaimApi.getHandleStatus(handleClaimCommunityId, selector);
      if (!status.available) {
        return;
      }
      const current = await handleClaimApi.getMyHandle(handleClaimCommunityId, selector);
      if (!current.handle) {
        setHandleClaimModalOpen(true);
      }
    } catch (error) {
      onHandleClaimCheckError?.(error);
    }
  }, [
    handleClaimApi,
    handleClaimCommunityId,
    handleClaimNamespaceVerificationId,
    handleClaimDismissal,
    onHandleClaimCheckError,
    sessionUserId,
  ]);

  React.useEffect(() => {
    const previousStatus = previousEligibilityStatusRef.current;
    const nextStatus = eligibility?.status ?? null;
    previousEligibilityStatusRef.current = nextStatus;
    if (
      previousStatus &&
      previousStatus !== "already_joined" &&
      nextStatus === "already_joined"
    ) {
      void maybeOpenHandleClaimModal();
    }
  }, [eligibility?.status, maybeOpenHandleClaimModal]);

  const handleJoinRequestModalOpenChange = React.useCallback((open: boolean) => {
    setJoinRequestModalOpen(open);
    if (open) {
      setJoinRequestError(null);
    }
  }, []);

  const openJoinRequestModal = React.useCallback(() => {
    setJoinRequestError(null);
    setJoinRequestModalOpen(true);
  }, []);

  const submitProofOfWork = React.useCallback(async (payload: string) => {
    const result = await handleJoin({ altchaPayload: payload });
    if (result === "joined" || result === "requested") {
      setProofOfWorkModalOpen(false);
      if (result === "joined") {
        await maybeOpenHandleClaimModal();
      }
      return;
    }
    if (result === "failed") {
      setProofOfWorkRetryKey((current) => current + 1);
    }
  }, [handleJoin, maybeOpenHandleClaimModal]);

  const handleProofOfWorkVerified = React.useCallback(async (payload: string) => {
    await submitProofOfWork(payload);
  }, [submitProofOfWork]);

  const handlePrimaryJoinAction = React.useCallback(async () => {
    if (!sessionUserId && onAuthRequired) {
      onAuthRequired();
      return;
    }

    if (eligibility?.status === "requestable") {
      openJoinRequestModal();
      return;
    }
    if (altchaRequired) {
      if (!altchaPayload) {
        setProofOfWorkModalOpen(true);
        return;
      }
      await submitProofOfWork(altchaPayload);
      return;
    }
    const result = await handleJoin();
    if (result === "joined") {
      await maybeOpenHandleClaimModal();
    }
  }, [
    altchaPayload,
    altchaRequired,
    eligibility?.status,
    handleJoin,
    maybeOpenHandleClaimModal,
    onAuthRequired,
    openJoinRequestModal,
    sessionUserId,
    submitProofOfWork,
  ]);

  const handleJoinRequestSubmit = React.useCallback(async (note: string) => {
    setJoinRequestSubmitting(true);
    setJoinRequestError(null);
    try {
      const result = await handleJoin({ note });
      if (result === "requested" || result === "joined") {
        invalidateCommunityGate?.(communityId);
        setJoinRequestModalOpen(false);
        if (result === "joined") {
          await maybeOpenHandleClaimModal();
        }
      } else if (result === "failed") {
        setJoinRequestError("Could not submit your request. Try again.");
      }
    } finally {
      setJoinRequestSubmitting(false);
    }
  }, [
    communityId,
    handleJoin,
    invalidateCommunityGate,
    maybeOpenHandleClaimModal,
  ]);

  const handleClaimModalOpenChange = React.useCallback((open: boolean) => {
    setHandleClaimModalOpen(open);
    if (!open && handleClaim.phase !== "success") {
      handleClaimDismissal.dismiss();
    }
  }, [handleClaim.phase, handleClaimDismissal]);

  const handleClaimNotNow = React.useCallback(() => {
    handleClaimDismissal.dismiss();
    setHandleClaimModalOpen(false);
  }, [handleClaimDismissal]);

  return React.useMemo(
    () => ({
      handleClaimModalOpen,
      handleClaimModalOpenChange,
      handleClaimNotNow,
      handleJoinRequestModalOpenChange,
      handleJoinRequestSubmit,
      handleProofOfWorkVerified,
      handlePrimaryJoinAction,
      joinRequestError,
      joinRequestModalOpen,
      joinRequestSubmitting,
      proofOfWorkModalOpen,
      proofOfWorkRetryKey,
      setProofOfWorkModalOpen,
    }),
    [
      handleClaimModalOpen,
      handleClaimModalOpenChange,
      handleClaimNotNow,
      handleJoinRequestModalOpenChange,
      handleJoinRequestSubmit,
      handleProofOfWorkVerified,
      handlePrimaryJoinAction,
      joinRequestError,
      joinRequestModalOpen,
      joinRequestSubmitting,
      proofOfWorkModalOpen,
      proofOfWorkRetryKey,
    ],
  );
}
