"use client";

import * as React from "react";
import type { Community as ApiCommunity } from "@pirate/api-contracts";

import type { IdentityGateDraft } from "@/components/compositions/create-community-composer/create-community-composer.types";
import { useApi } from "@/lib/api";

import type { SaveCommunityAction } from "./community-moderation-save";
import { serializeIdentityGateDrafts } from "./community-gate-rule-serialization";
import { getCommunityGateDrafts, getPreservedCommunityGateRules } from "./moderation-helpers";

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
  const preservedGateRules = React.useMemo(
    () => community ? getPreservedCommunityGateRules(community) : [],
    [community],
  );

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
    const hasAdultMinimumAgeGate = membershipMode === "gated" && gateDrafts.some((draft) =>
      draft.gateType === "minimum_age"
      && Number.isInteger(draft.minimumAge)
      && draft.minimumAge >= 18
      && draft.minimumAge <= 125,
    );
    const effectiveDefaultAgeGatePolicy = hasAdultMinimumAgeGate ? "18_plus" : defaultAgeGatePolicy;
    void saveCommunity(
      () => api.communities.updateGates(community.community_id, {
        membership_mode: membershipMode,
        default_age_gate_policy: effectiveDefaultAgeGatePolicy,
        allow_anonymous_identity: allowAnonymousIdentity,
        anonymous_identity_scope: allowAnonymousIdentity ? anonymousIdentityScope : null,
        gate_rules: [
          ...preservedGateRules,
          ...serializeIdentityGateDrafts(gateDrafts, { includeGateRuleIds: true }),
        ],
      }),
      setSavingGates,
      "Access settings saved.",
      "Could not save access settings.",
    );
  }, [allowAnonymousIdentity, anonymousIdentityScope, api.communities, community, defaultAgeGatePolicy, gateDrafts, membershipMode, preservedGateRules, saveCommunity, savingGates]);

  return {
    allowAnonymousIdentity,
    anonymousIdentityScope,
    defaultAgeGatePolicy,
    gateDrafts,
    handleSaveGates,
    membershipMode,
    preservedGateRuleCount: preservedGateRules.length,
    savingGates,
    setAllowAnonymousIdentity,
    setAnonymousIdentityScope,
    setDefaultAgeGatePolicy,
    setGateDrafts,
    setMembershipMode,
  };
}
