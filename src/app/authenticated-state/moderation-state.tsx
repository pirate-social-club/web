"use client";

import * as React from "react";
import type { Community as ApiCommunity } from "@pirate/api-contracts";

import { useApi } from "@/lib/api";
import type { ApiCommunityNamespaceAttachment } from "@/lib/api/client-api-types";
import { useSession } from "@/lib/api/session-store";
import { rememberKnownCommunity } from "@/lib/known-communities-store";
import type { NamespaceVerificationCallbacks } from "@/components/compositions/verification/verify-namespace-modal/verify-namespace-modal.types";
import { toast } from "@/components/primitives/sonner";

import { toNamespaceSessionResult } from "@/app/authenticated-helpers/namespace-verification-result";
import { useCommunityRecord } from "@/app/authenticated-data/moderation-data";
import { getErrorMessage } from "@/lib/error-utils";
import { useCommunityAccessState } from "./use-community-access-state";
import { useCommunityAgentPolicyState } from "./use-community-agent-policy-state";
import { useCommunityAssistantPolicyState } from "./use-community-assistant-policy-state";
import { useCommunityCommerceState } from "./use-community-commerce-state";
import { useCommunityContentPolicyState } from "./use-community-content-policy-state";
import { useCommunityKaraokePolicyState } from "./use-community-karaoke-policy-state";
import { useCommunityStudyPolicyState } from "./use-community-study-policy-state";
import { useCommunityArchiveState } from "./use-community-archive-state";
import { useCommunityMachineAccessState } from "./use-community-machine-access-state";
import { useCommunityProfileState } from "./use-community-profile-state";
import { useCommunitySafetyState } from "./use-community-safety-state";
import { useCommunityTelegramState } from "./use-community-telegram-state";
import { useCommunityVisualPolicyState } from "./use-community-visual-policy-state";
import { useCommunityHandlePolicyState } from "./use-community-handle-policy-state";

export function useCommunityModerationState(communityId: string) {
  const api = useApi();
  const session = useSession();
  const { community, error, loading, setCommunity } = useCommunityRecord(communityId);
  const [activeNamespaceSessionId, setActiveNamespaceSessionId] = React.useState<string | null>(null);
  const [namespaceAttachments, setNamespaceAttachments] = React.useState<ApiCommunityNamespaceAttachment[]>([]);

  const refreshNamespaceAttachments = React.useCallback(async () => {
    if (!community?.namespace_verification) {
      setNamespaceAttachments([]);
      return;
    }
    const response = await api.communities.listNamespaces(communityId);
    setNamespaceAttachments(response.namespaces);
  }, [api, community?.namespace_verification, communityId]);

  React.useEffect(() => {
    void refreshNamespaceAttachments().catch(() => setNamespaceAttachments([]));
  }, [refreshNamespaceAttachments]);

  React.useEffect(() => {
    if (!community) {
      return;
    }

    rememberKnownCommunity({
      avatarSrc: community.avatar_ref ?? undefined,
      communityId: community.id,
      displayName: community.display_name,
      routeSlug: community.route_slug ?? null,
    });
  }, [community]);

  React.useEffect(() => {
    setActiveNamespaceSessionId(community?.pending_namespace_verification_session ?? null);
  }, [community?.pending_namespace_verification_session]);

  const effectiveNamespaceSessionId = activeNamespaceSessionId ?? community?.pending_namespace_verification_session ?? null;

  const namespaceVerificationCallbacks = React.useMemo<NamespaceVerificationCallbacks>(() => ({
    onStartSession: async ({ family, rootLabel }) => {
      const result = await api.verification.startNamespaceSession({
        family,
        root_label: rootLabel,
      });

      setActiveNamespaceSessionId(result.id);
      const updatedCommunity = await api.communities.setPendingNamespaceSession(
        communityId,
        result.id,
      );
      setCommunity(updatedCommunity);

      return toNamespaceSessionResult(result);
    },
    onCompleteSession: async ({ namespaceVerificationSessionId, restartChallenge }) => {
      const result = await api.verification.completeNamespaceSession(namespaceVerificationSessionId, {
        restart_challenge: restartChallenge ?? null,
      });

      if (result.status === "verified" && result.namespace_verification) {
        const namespaceRole = !community?.namespace_verification
          || result.namespace_verification === community.namespace_verification
          ? "primary"
          : "mirror";
        const updatedCommunity = await api.communities.attachNamespace(
          communityId,
          result.namespace_verification,
          namespaceRole,
        );
        setCommunity(updatedCommunity);
        setActiveNamespaceSessionId(null);
        await refreshNamespaceAttachments();
      }

      return {
        status: result.status,
        namespaceVerificationId: result.namespace_verification ?? null,
        failureReason: result.failure_reason ?? null,
      };
    },
    onGetSession: async ({ namespaceVerificationSessionId }) => {
      const result = await api.verification.getNamespaceSession(namespaceVerificationSessionId);
      return toNamespaceSessionResult(result);
    },
  }), [api, community?.namespace_verification, communityId, refreshNamespaceAttachments, setCommunity]);

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
  const access = useCommunityAccessState({
    community,
    saveCommunity,
    useGateTreeBuilder: import.meta.env.VITE_GATE_TREE_BUILDER_ENABLED === "true",
  });
  const safety = useCommunitySafetyState({ community, saveCommunity });
  const visualPolicy = useCommunityVisualPolicyState({ community, saveCommunity });
  const agents = useCommunityAgentPolicyState({ community, saveCommunity });
  const assistantPolicy = useCommunityAssistantPolicyState({ community });
  const karaokePolicy = useCommunityKaraokePolicyState({ community, setCommunity });
  const studyPolicy = useCommunityStudyPolicyState({ community, setCommunity });
  const machineAccess = useCommunityMachineAccessState({ community });
  const archive = useCommunityArchiveState({ community });
  const telegram = useCommunityTelegramState({ community });
  const handlePolicy = useCommunityHandlePolicyState({
    communityId: community?.id ?? null,
    enabled: Boolean(community?.namespace_verification),
  });

  return {
    activeNamespaceSessionId,
    community,
    effectiveNamespaceSessionId,
    error,
    loading,
    namespaceAttachments,
    namespaceVerificationCallbacks,
    refreshNamespaceAttachments,
    session,
    setActiveNamespaceSessionId,
    setCommunity,
    ...access,
    ...safety,
    ...visualPolicy,
    ...agents,
    ...assistantPolicy,
    ...karaokePolicy,
    ...studyPolicy,
    ...machineAccess,
    ...archive,
    ...telegram,
    ...profile,
    ...contentPolicy,
    ...commerce,
    ...handlePolicy,
  };
}
