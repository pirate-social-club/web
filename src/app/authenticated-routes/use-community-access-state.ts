"use client";

import * as React from "react";
import type { Community as ApiCommunity } from "@pirate/api-contracts";

import type { IdentityGateDraft } from "@/components/compositions/create-community-composer/create-community-composer.types";
import { getAcceptedProvidersForGateType } from "@/lib/community-gate-providers";
import { useApi } from "@/lib/api";

import type { SaveCommunityAction } from "./community-moderation-save";
import { getCommunityGateDrafts } from "./moderation-helpers";

export function useCommunityAccessState({
  community,
  saveCommunity,
}: {
  community: ApiCommunity | null;
  saveCommunity: SaveCommunityAction;
}) {
  const api = useApi();
  const [membershipMode, setMembershipMode] = React.useState<"open" | "request" | "gated">("open");
  const [defaultAgeGatePolicy, setDefaultAgeGatePolicy] = React.useState<"none" | "18_plus">("none");
  const [allowAnonymousIdentity, setAllowAnonymousIdentity] = React.useState(true);
  const [anonymousIdentityScope, setAnonymousIdentityScope] = React.useState<"community_stable" | "thread_stable" | "post_ephemeral">("community_stable");
  const [gateDrafts, setGateDrafts] = React.useState<IdentityGateDraft[]>([]);
  const [savingGates, setSavingGates] = React.useState(false);

  React.useEffect(() => {
    if (!community) {
      return;
    }

    setMembershipMode(community.membership_mode);
    setDefaultAgeGatePolicy(community.default_age_gate_policy ?? "none");
    setAllowAnonymousIdentity(community.allow_anonymous_identity);
    setAnonymousIdentityScope(community.anonymous_identity_scope ?? "community_stable");
    setGateDrafts(getCommunityGateDrafts(community));
  }, [community]);

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

  return {
    allowAnonymousIdentity,
    anonymousIdentityScope,
    defaultAgeGatePolicy,
    gateDrafts,
    handleSaveGates,
    membershipMode,
    savingGates,
    setAllowAnonymousIdentity,
    setAnonymousIdentityScope,
    setDefaultAgeGatePolicy,
    setGateDrafts,
    setMembershipMode,
  };
}
