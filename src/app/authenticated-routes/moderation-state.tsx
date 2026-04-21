"use client";

import * as React from "react";
import type { Community as ApiCommunity } from "@pirate/api-contracts";
import type { CommunityPricingPolicy as ApiCommunityPricingPolicy } from "@pirate/api-contracts";

import { useApi } from "@/lib/api";
import { useSession } from "@/lib/api/session-store";
import { rememberKnownCommunity } from "@/lib/known-communities-store";
import type { DonationPartnerPreview, DonationPolicyMode } from "@/components/compositions/community-donations-editor/community-donations-editor-page";
import type {
  CommunityAgentPolicyPageProps,
  CommunityAgentPolicySettings,
} from "@/components/compositions/community-agent-policy/community-agent-policy.types";
import type { LabelEditorDefinition } from "@/components/compositions/community-labels-editor/community-labels-editor-page";
import type { CommunityLinkEditorItem } from "@/components/compositions/community-links-editor/community-links-editor-page";

import type { IdentityGateDraft } from "@/components/compositions/create-community-composer/create-community-composer.types";
import type { NamespaceVerificationCallbacks } from "@/components/compositions/verify-namespace-modal/verify-namespace-modal.types";
import { toast } from "@/components/primitives/sonner";
import { getAcceptedProvidersForGateType } from "@/lib/community-gate-providers";

import {
  getCommunityAdultContentPolicyState,
  getCommunityCivilityPolicyState,
  getCommunityGateDrafts,
  getCommunityGraphicContentPolicyState,
  getCommunityLinkDrafts,
  getCommunityOpenAIModerationSettingsState,
} from "./moderation-helpers";
import { toNamespaceSessionResult } from "./create-community-route";
import { useCommunityRecord } from "./moderation-data";
import { getErrorMessage } from "./route-core";
import { useCommunityCommerceState } from "./use-community-commerce-state";



function isValidHexColor(value: string): boolean {
  return /^#[0-9a-fA-F]{6}$/.test(value.trim());
}

function getCommunityLabelDrafts(
  community: ApiCommunity | null,
): LabelEditorDefinition[] {
  return community?.label_policy?.definitions
    ?.slice()
    .sort((left, right) => left.position - right.position)
    .map((definition) => ({
      id: definition.label_id,
      label: definition.label,
      color: definition.color_token ?? "#f97316",
      status: definition.status,
    })) ?? [];
}

function getLabelValidationError(
  labelsEnabled: boolean,
  labels: LabelEditorDefinition[],
): string | null {
  if (!labelsEnabled) {
    return null;
  }

  const seen = new Set<string>();
  for (const label of labels) {
    if (label.status !== "active") {
      continue;
    }

    const normalizedName = label.label.trim().toLowerCase();
    if (!normalizedName) {
      return "Each label needs a name.";
    }
    if (!isValidHexColor(label.color)) {
      return "Each label needs a valid hex color.";
    }
    if (seen.has(normalizedName)) {
      return "Label names must be unique.";
    }
    seen.add(normalizedName);
  }

  return null;
}

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
  const [ruleName, setRuleName] = React.useState("");
  const [description, setDescription] = React.useState("");
  const [reportReason, setReportReason] = React.useState("");
  const [profileDisplayName, setProfileDisplayName] = React.useState("");
  const [profileDescription, setProfileDescription] = React.useState("");
  const [profileAvatarFile, setProfileAvatarFile] = React.useState<File | null>(null);
  const [profileBannerFile, setProfileBannerFile] = React.useState<File | null>(null);
  const [profileAvatarRemoved, setProfileAvatarRemoved] = React.useState(false);
  const [profileBannerRemoved, setProfileBannerRemoved] = React.useState(false);
  const [profileDisplayNameError, setProfileDisplayNameError] = React.useState<string | undefined>(undefined);
  const [links, setLinks] = React.useState<CommunityLinkEditorItem[]>([]);
  const [labelsEnabled, setLabelsEnabled] = React.useState(false);
  const [requireOnTopLevelPosts, setRequireOnTopLevelPosts] = React.useState(false);
  const [labels, setLabels] = React.useState<LabelEditorDefinition[]>([]);
  const [savingRules, setSavingRules] = React.useState(false);
  const [savingLinks, setSavingLinks] = React.useState(false);
  const [savingLabels, setSavingLabels] = React.useState(false);
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
  const [savingProfile, setSavingProfile] = React.useState(false);
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
    const firstRule = community?.community_profile?.rules?.[0];
    setRuleName(firstRule?.title ?? "");
    setDescription(firstRule?.body ?? "");
    setReportReason(firstRule?.report_reason?.trim() || (firstRule?.title ?? ""));
  }, [community]);

  React.useEffect(() => {
    if (!community) {
      return;
    }

    setLinks(getCommunityLinkDrafts(community));
    setLabelsEnabled(community.label_policy?.label_enabled === true);
    setRequireOnTopLevelPosts(community.label_policy?.require_label_on_top_level_posts === true);
    setLabels(getCommunityLabelDrafts(community));
    setProfileDisplayName(community.display_name);
    setProfileDescription(community.description ?? "");
    setProfileAvatarFile(null);
    setProfileBannerFile(null);
    setProfileAvatarRemoved(community.avatar_ref == null);
    setProfileBannerRemoved(community.banner_ref == null);
    setProfileDisplayNameError(undefined);
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
  const labelsValidationError = getLabelValidationError(labelsEnabled, labels);
  const profileHasChanges = community == null ? false : (
    profileDisplayName.trim() !== community.display_name.trim()
    || profileDescription !== (community.description ?? "")
    || profileAvatarFile !== null
    || profileBannerFile !== null
    || (profileAvatarRemoved && community.avatar_ref != null)
    || (profileBannerRemoved && community.banner_ref != null)
  );

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

  const commerce = useCommunityCommerceState({ communityId, community, setCommunity });

  const handleSaveRules = React.useCallback(() => {
    if (!community || savingRules) return;
    const existingRules = community.community_profile?.rules ?? [];
    const rules = [
      {
        rule_id: existingRules[0]?.rule_id ?? null,
        title: ruleName,
        body: description,
        report_reason: reportReason.trim() || ruleName.trim(),
        position: 0,
        status: "active" as const,
      },
      ...existingRules.slice(1).map((rule, index) => ({
        rule_id: rule.rule_id,
        title: rule.title,
        body: rule.body,
        report_reason: rule.report_reason?.trim() || rule.title,
        position: index + 1,
        status: rule.status,
      })),
    ];
    void saveCommunity(
      () => api.communities.updateRules(community.community_id, { rules }),
      setSavingRules,
      "Rules saved.",
      "Could not save rules.",
    );
  }, [api.communities, community, description, reportReason, ruleName, saveCommunity, savingRules]);

  const handleSaveProfile = React.useCallback(async () => {
    if (!community || savingProfile) return;
    const trimmedDisplayName = profileDisplayName.trim();
    if (!trimmedDisplayName) {
      setProfileDisplayNameError("Name is required.");
      return;
    }

    setProfileDisplayNameError(undefined);
    setSavingProfile(true);
    try {
      let avatarRef = profileAvatarRemoved ? null : community.avatar_ref ?? null;
      let bannerRef = profileBannerRemoved ? null : community.banner_ref ?? null;

      if (profileAvatarFile) {
        avatarRef = (await api.communities.uploadMedia({ kind: "avatar", file: profileAvatarFile })).media_ref;
      }
      if (profileBannerFile) {
        bannerRef = (await api.communities.uploadMedia({ kind: "banner", file: profileBannerFile })).media_ref;
      }

      const updatedCommunity = await api.communities.update(community.community_id, {
        display_name: trimmedDisplayName,
        description: profileDescription.trim() ? profileDescription : null,
        avatar_ref: avatarRef,
        banner_ref: bannerRef,
      });
      setCommunity(updatedCommunity);
      setProfileAvatarFile(null);
      setProfileBannerFile(null);
      setProfileAvatarRemoved(updatedCommunity.avatar_ref == null);
      setProfileBannerRemoved(updatedCommunity.banner_ref == null);
      toast.success("Profile saved.");
    } catch (nextError) {
      toast.error(getErrorMessage(nextError, "Could not save profile."));
    } finally {
      setSavingProfile(false);
    }
  }, [
    api.communities,
    community,
    profileAvatarFile,
    profileAvatarRemoved,
    profileBannerFile,
    profileBannerRemoved,
    profileDescription,
    profileDisplayName,
    savingProfile,
    setCommunity,
  ]);

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

  const handleSaveLinks = React.useCallback(() => {
    if (!community || savingLinks) return;
    void saveCommunity(
      () => api.communities.updateReferenceLinks(community.community_id, {
        reference_links: links.filter((link) => link.url.trim()).map((link, index) => ({
          community_reference_link_id: link.id.startsWith("draft-") ? null : link.id,
          label: link.label.trim() || null,
          platform: link.platform as NonNullable<ApiCommunity["reference_links"]>[number]["platform"],
          position: index,
          url: link.url.trim(),
        })),
      }),
      setSavingLinks,
      "Links saved.",
      "Could not save links.",
    ).then((updatedCommunity) => {
      setLinks(getCommunityLinkDrafts(updatedCommunity));
    }).catch(() => undefined);
  }, [api.communities, community, links, saveCommunity, savingLinks]);

  const handleSaveLabels = React.useCallback(() => {
    if (!community || savingLabels || labelsValidationError) return;
    void saveCommunity(
      () => api.communities.updateLabelPolicy(community.community_id, {
        label_enabled: labelsEnabled,
        require_label_on_top_level_posts: labelsEnabled && requireOnTopLevelPosts,
        definitions: labels.map((label, index) => ({
          label_id: label.id.startsWith("draft-") ? null : label.id,
          label: label.label.trim(),
          color_token: label.color.trim() || null,
          status: label.status,
          position: index,
        })),
      }),
      setSavingLabels,
      "Labels saved.",
      "Could not save labels.",
    ).then((updatedCommunity) => {
      setLabelsEnabled(updatedCommunity.label_policy?.label_enabled === true);
      setRequireOnTopLevelPosts(updatedCommunity.label_policy?.require_label_on_top_level_posts === true);
      setLabels(getCommunityLabelDrafts(updatedCommunity));
    }).catch(() => undefined);
  }, [
    api.communities,
    community,
    labels,
    labelsEnabled,
    labelsValidationError,
    requireOnTopLevelPosts,
    saveCommunity,
    savingLabels,
  ]);



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
    description,
    effectiveNamespaceSessionId,
    error,
    gateDrafts,
    graphicContentPolicy,
    labels,
    labelsEnabled,
    labelsValidationError,
    links,
    loading,
    membershipMode,
    namespaceVerificationCallbacks,
    profileAvatarFile,
    profileAvatarRemoved,
    profileBannerFile,
    profileBannerRemoved,
    profileDescription,
    profileDisplayName,
    profileDisplayNameError,
    profileHasChanges,
    providerSettings,
    reportReason,
    ruleName,
    savingGates,
    savingLabels,
    savingLinks,
    savingProfile,
    savingRules,
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
    setDescription,
    setGateDrafts,
    setGraphicContentPolicy,
    setLabels,
    setLabelsEnabled,
    setLinks,
    setMembershipMode,
    setProfileAvatarFile,
    setProfileAvatarRemoved,
    setProfileBannerFile,
    setProfileBannerRemoved,
    setProfileDescription,
    setProfileDisplayName,
    setProfileDisplayNameError,
    setProviderSettings,
    setReportReason,
    setRequireOnTopLevelPosts,
    setRuleName,
    handleSaveAgents,
    handleSaveGates,
    handleSaveLabels,
    handleSaveLinks,
    handleSaveProfile,
    handleSaveRules,
    handleSaveSafety,
    requireOnTopLevelPosts,
    ...commerce,
  };
}
