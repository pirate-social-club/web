"use client";

import * as React from "react";
import type { Community as ApiCommunity } from "@pirate/api-contracts";

import { useApi } from "@/lib/api";
import { useSession } from "@/lib/api/session-store";
import { rememberKnownCommunity } from "@/lib/known-communities-store";
import type { NamespaceVerificationCallbacks } from "@/components/compositions/verification/verify-namespace-modal/verify-namespace-modal.types";
import { toast } from "@/components/primitives/sonner";

import { toNamespaceSessionResult } from "@/app/authenticated-helpers/namespace-verification-result";
import { useCommunityRecord } from "@/app/authenticated-data/moderation-data";
import { getErrorMessage } from "@/lib/error-utils";
import { useCommunityAccessState } from "./use-community-access-state";
import { useCommunityAgentPolicyState } from "./use-community-agent-policy-state";
import { useCommunityCommerceState } from "./use-community-commerce-state";
import { useCommunityContentPolicyState } from "./use-community-content-policy-state";
import { useCommunityMachineAccessState } from "./use-community-machine-access-state";
import { useCommunityProfileState } from "./use-community-profile-state";
import { useCommunitySafetyState } from "./use-community-safety-state";

export function useCommunityModerationState(communityId: string) {
  const api = useApi();
  const session = useSession();
  const { community, error, loading, setCommunity } = useCommunityRecord(communityId);
  const [activeNamespaceSessionId, setActiveNamespaceSessionId] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (!community) {
      return;
    }

    rememberKnownCommunity({
      avatarSrc: community.avatar_ref ?? undefined,
      communityId: community.community_id,
      displayName: community.display_name,
    });
  }, [community]);

  React.useEffect(() => {
    setActiveNamespaceSessionId(community?.pending_namespace_verification_session_id ?? null);
  }, [community?.pending_namespace_verification_session_id]);

  const effectiveNamespaceSessionId = activeNamespaceSessionId ?? community?.pending_namespace_verification_session_id ?? null;

  const namespaceVerificationCallbacks = React.useMemo<NamespaceVerificationCallbacks>(() => ({
    onStartSession: async ({ family, rootLabel }) => {
      const result = await api.verification.startNamespaceSession({
        family,
        root_label: rootLabel,
      });

      setActiveNamespaceSessionId(result.namespace_verification_session_id);
      const updatedCommunity = await api.communities.setPendingNamespaceSession(
        communityId,
        result.namespace_verification_session_id,
      );
      setCommunity(updatedCommunity);

      return toNamespaceSessionResult(result);
    },
    onCompleteSession: async ({ namespaceVerificationSessionId, restartChallenge }) => {
      const result = await api.verification.completeNamespaceSession(namespaceVerificationSessionId, {
        restart_challenge: restartChallenge ?? null,
      });

      if (result.status === "verified" && result.namespace_verification_id) {
        const updatedCommunity = await api.communities.attachNamespace(communityId, result.namespace_verification_id);
        setCommunity(updatedCommunity);
        setActiveNamespaceSessionId(null);
      }

      return {
        status: result.status,
        namespaceVerificationId: result.namespace_verification_id ?? null,
        failureReason: result.failure_reason ?? null,
      };
    },
    onGetSession: async ({ namespaceVerificationSessionId }) => {
      const result = await api.verification.getNamespaceSession(namespaceVerificationSessionId);
      return toNamespaceSessionResult(result);
    },
  }), [api, communityId, setCommunity]);

  const saveCommunity = React.useCallback(
    async (
      action: () => Promise<ApiCommunity>,
      savingSetter: React.Dispatch<React.SetStateAction<boolean>>,
      successMessage: string,
      failureMessage: string,
    ) => {
      savingSetter(true);
      try {
        const updatedCommunity = await action();
        setCommunity(updatedCommunity);
        toast.success(successMessage);
        return updatedCommunity;
      } catch (nextError) {
        toast.error(getErrorMessage(nextError, failureMessage));
        throw nextError;
      } finally {
        savingSetter(false);
      }
    },
    [setCommunity],
  );

  const commerce = useCommunityCommerceState({ community, saveCommunity });
  const contentPolicy = useCommunityContentPolicyState({ community, saveCommunity });
  const profile = useCommunityProfileState({ community, setCommunity });
  const access = useCommunityAccessState({ community, saveCommunity });
  const safety = useCommunitySafetyState({ community, saveCommunity });
  const agents = useCommunityAgentPolicyState({ community, saveCommunity });
  const machineAccess = useCommunityMachineAccessState({ community });

  return {
    activeNamespaceSessionId,
    community,
    effectiveNamespaceSessionId,
    error,
    loading,
    namespaceVerificationCallbacks,
    session,
    setActiveNamespaceSessionId,
    setCommunity,
    ...access,
    ...safety,
    ...agents,
    ...machineAccess,
    ...profile,
    ...contentPolicy,
    ...commerce,
  };
}
