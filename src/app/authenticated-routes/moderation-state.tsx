"use client";

import * as React from "react";
import type { Community as ApiCommunity } from "@pirate/api-contracts";

import { useApi } from "@/lib/api";
import { useSession } from "@/lib/api/session-store";
import { rememberKnownCommunity } from "@/lib/known-communities-store";
import type {
  CommunityAgentPolicyPageProps,
  CommunityAgentPolicySettings,
} from "@/components/compositions/community-agent-policy/community-agent-policy.types";

import type { IdentityGateDraft } from "@/components/compositions/create-community-composer/create-community-composer.types";
import type { NamespaceVerificationCallbacks } from "@/components/compositions/verify-namespace-modal/verify-namespace-modal.types";
import { toast } from "@/components/primitives/sonner";
import { getAcceptedProvidersForGateType } from "@/lib/community-gate-providers";

import {
  getCommunityAdultContentPolicyState,
  getCommunityCivilityPolicyState,
  getCommunityGateDrafts,
  getCommunityGraphicContentPolicyState,
  getCommunityOpenAIModerationSettingsState,
} from "./moderation-helpers";
import { toNamespaceSessionResult } from "./create-community-route";
import { useCommunityRecord } from "./moderation-data";
import { getErrorMessage } from "./route-core";
import { useCommunityCommerceState } from "./use-community-commerce-state";
import { useCommunityContentPolicyState } from "./use-community-content-policy-state";
import { useCommunityProfileState } from "./use-community-profile-state";

function getCommunityAgentPolicySettings(
  community: ApiCommunity | null,
): CommunityAgentPolicySettings {
  return {
    agentPostingPolicy: community?.agent_posting_policy === "disallow" ? "disallow" : "allow",
    agentPostingScope: community?.agent_posting_scope === "top_level_and_replies"
      ? "top_level_and_replies"
      : "replies_only",
    acceptedAgentOwnershipProviders: community?.accepted_agent_ownership_providers ?? [],
    dailyPostCap: community?.agent_daily_post_cap ?? null,
    dailyReplyCap: community?.agent_daily_reply_cap ?? null,
  };
}

export function useCommunityModerationState(communityId: string) {
  const api = useApi();
  const session = useSession();
  const { community, error, loading, setCommunity } = useCommunityRecord(communityId);
  const [membershipMode, setMembershipMode] = React.useState<"open" | "request" | "gated">("open");
  const [defaultAgeGatePolicy, setDefaultAgeGatePolicy] = React.useState<"none" | "18_plus">("none");
  const [allowAnonymousIdentity, setAllowAnonymousIdentity] = React.useState(true);
  const [anonymousIdentityScope, setAnonymousIdentityScope] = React.useState<"community_stable" | "thread_stable" | "post_ephemeral">("community_stable");
  const [gateDrafts, setGateDrafts] = React.useState<IdentityGateDraft[]>([]);
  const [activeNamespaceSessionId, setActiveNamespaceSessionId] = React.useState<string | null>(null);
  const [providerSettings, setProviderSettings] = React.useState(() => getCommunityOpenAIModerationSettingsState({} as ApiCommunity));
  const [adultContentPolicy, setAdultContentPolicy] = React.useState(() => getCommunityAdultContentPolicyState({} as ApiCommunity));
  const [graphicContentPolicy, setGraphicContentPolicy] = React.useState(() => getCommunityGraphicContentPolicyState({} as ApiCommunity));
  const [civilityPolicy, setCivilityPolicy] = React.useState(() => getCommunityCivilityPolicyState({} as ApiCommunity));
  const [savingSafety, setSavingSafety] = React.useState(false);
  const [savingGates, setSavingGates] = React.useState(false);
  const [agentSettings, setAgentSettings] = React.useState<CommunityAgentPolicySettings>(
    getCommunityAgentPolicySettings(null),
  );
  const [savingAgents, setSavingAgents] = React.useState(false);
  const [agentSaveError, setAgentSaveError] = React.useState<string | null>(null);

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
    if (!community) {
      return;
    }

    setMembershipMode(community.membership_mode);
    setDefaultAgeGatePolicy(community.default_age_gate_policy ?? "none");
    setAllowAnonymousIdentity(community.allow_anonymous_identity);
    setAnonymousIdentityScope(community.anonymous_identity_scope ?? "community_stable");
    setGateDrafts(getCommunityGateDrafts(community));
    setProviderSettings(getCommunityOpenAIModerationSettingsState(community));
    setAdultContentPolicy(getCommunityAdultContentPolicyState(community));
    setGraphicContentPolicy(getCommunityGraphicContentPolicyState(community));
    setCivilityPolicy(getCommunityCivilityPolicyState(community));
    setAgentSettings(getCommunityAgentPolicySettings(community));
    setAgentSaveError(null);
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
    onCompleteSession: async ({ namespaceVerificationSessionId, restartChallenge, signaturePayload }) => {
      const result = await api.verification.completeNamespaceSession(namespaceVerificationSessionId, {
        restart_challenge: restartChallenge ?? null,
        signature_payload: signaturePayload ?? null,
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

  const handleSaveSafety = React.useCallback(() => {
    if (!community || savingSafety) return;
    void saveCommunity(
      () => api.communities.updateSafety(community.community_id, {
        adult_content_policy: { ...adultContentPolicy },
        civility_policy: { ...civilityPolicy },
        graphic_content_policy: { ...graphicContentPolicy },
        openai_moderation_settings: {
          scan_titles: providerSettings.scanTitles,
          scan_post_bodies: providerSettings.scanPostBodies,
          scan_captions: providerSettings.scanCaptions,
          scan_link_preview_text: providerSettings.scanLinkPreviewText,
          scan_images: providerSettings.scanImages,
        },
      }),
      setSavingSafety,
      "Safety settings saved.",
      "Could not save safety settings.",
    );
  }, [adultContentPolicy, api.communities, civilityPolicy, community, graphicContentPolicy, providerSettings, saveCommunity, savingSafety]);

  const handleSaveGates = React.useCallback(() => {
    if (!community || savingGates) return;
    void saveCommunity(
      () => api.communities.updateGates(community.community_id, {
        membership_mode: membershipMode,
        default_age_gate_policy: defaultAgeGatePolicy,
        allow_anonymous_identity: allowAnonymousIdentity,
        anonymous_identity_scope: allowAnonymousIdentity ? anonymousIdentityScope : null,
        gate_rules: gateDrafts.map((draft) => {
          if (draft.gateType === "erc721_holding") {
            return {
              scope: "membership" as const,
              gate_family: "token_holding" as const,
              gate_type: "erc721_holding" as const,
              gate_rule_id: draft.gateRuleId ?? null,
              chain_namespace: draft.chainNamespace,
              gate_config: { contract_address: draft.contractAddress.trim() },
            };
          }

          return {
            scope: "membership" as const,
            gate_family: "identity_proof" as const,
            gate_type: draft.gateType,
            gate_rule_id: draft.gateRuleId ?? null,
            proof_requirements: [{
              proof_type: draft.gateType,
              accepted_providers: getAcceptedProvidersForGateType(draft.gateType),
              config: { required_value: draft.requiredValue },
            }],
          };
        }),
      }),
      setSavingGates,
      "Access settings saved.",
      "Could not save access settings.",
    );
  }, [allowAnonymousIdentity, anonymousIdentityScope, api.communities, community, defaultAgeGatePolicy, gateDrafts, membershipMode, saveCommunity, savingGates]);

  const handleSaveAgents = React.useCallback(() => {
    if (!community || savingAgents) return;
    setAgentSaveError(null);
    void saveCommunity(
      () => api.communities.update(community.community_id, {
        agent_posting_policy: agentSettings.agentPostingPolicy,
        agent_posting_scope: agentSettings.agentPostingScope,
        accepted_agent_ownership_providers: agentSettings.acceptedAgentOwnershipProviders,
        agent_daily_post_cap: agentSettings.dailyPostCap,
        agent_daily_reply_cap: agentSettings.dailyReplyCap,
      }),
      setSavingAgents,
      "Agents saved.",
      "Could not save agents.",
    ).then((updatedCommunity) => {
      setAgentSettings(getCommunityAgentPolicySettings(updatedCommunity));
    }).catch((nextError: unknown) => {
      setAgentSaveError(getErrorMessage(nextError, "Could not save agents."));
    });
  }, [agentSettings, api.communities, community, saveCommunity, savingAgents]);

  const agentSubmitState: CommunityAgentPolicyPageProps["submitState"] = savingAgents
    ? { kind: "saving" }
    : agentSaveError
      ? { kind: "error", message: agentSaveError }
      : { kind: "idle" };

  return {
    agentSettings,
    agentSubmitState,
    activeNamespaceSessionId,
    adultContentPolicy,
    allowAnonymousIdentity,
    anonymousIdentityScope,
    civilityPolicy,
    community,
    defaultAgeGatePolicy,
    effectiveNamespaceSessionId,
    error,
    gateDrafts,
    graphicContentPolicy,
    loading,
    membershipMode,
    namespaceVerificationCallbacks,
    providerSettings,
    savingGates,
    savingSafety,
    savingAgents,
    session,
    setActiveNamespaceSessionId,
    setAdultContentPolicy,
    setAgentSettings,
    setAllowAnonymousIdentity,
    setAnonymousIdentityScope,
    setCivilityPolicy,
    setCommunity,
    setDefaultAgeGatePolicy,
    setGateDrafts,
    setGraphicContentPolicy,
    setMembershipMode,
    setProviderSettings,
    handleSaveAgents,
    handleSaveGates,
    handleSaveSafety,
    ...profile,
    ...contentPolicy,
    ...commerce,
  };
}
