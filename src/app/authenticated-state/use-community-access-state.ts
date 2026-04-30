"use client";

import * as React from "react";
import type { Community as ApiCommunity } from "@pirate/api-contracts";

import type { IdentityGateDraft } from "@/components/compositions/community/create-composer/create-community-composer.types";
import { useApi } from "@/lib/api";

import { submitCommunitySave, type SaveCommunityAction } from "@/app/authenticated-helpers/community-moderation-save";
import { serializeIdentityGateDrafts } from "@/app/authenticated-helpers/community-gate-rule-serialization";
import { getCommunityGateDrafts } from "@/app/authenticated-helpers/moderation-helpers";

export function useCommunityAccessState({
  community,
  saveCommunity,
}: {
  community: ApiCommunity | null;
  saveCommunity: SaveCommunityAction;
}) {
  const api = useApi();
  const [membershipMode, setMembershipMode] = React.useState<"request" | "gated">("gated");
  const [defaultAgeGatePolicy, setDefaultAgeGatePolicy] = React.useState<"none" | "18_plus">("none");
  const [allowAnonymousIdentity, setAllowAnonymousIdentity] = React.useState(true);
  const [anonymousIdentityScope, setAnonymousIdentityScope] = React.useState<"community_stable" | "thread_stable" | "post_ephemeral">("community_stable");
  const [gateDrafts, setGateDrafts] = React.useState<IdentityGateDraft[]>([]);
  const [savingGates, setSavingGates] = React.useState(false);
  React.useEffect(() => {
    if (!community) {
      return;
    }

    setMembershipMode(community.membership_mode === "request" ? "request" : "gated");
    setDefaultAgeGatePolicy(community.default_age_gate_policy ?? "none");
    setAllowAnonymousIdentity(community.allow_anonymous_identity);
    setAnonymousIdentityScope(community.anonymous_identity_scope ?? "community_stable");
    setGateDrafts(getCommunityGateDrafts(community));
  }, [community]);

  const handleSaveGates = React.useCallback(() => {
    if (!community) return;
    const hasAdultMinimumAgeGate = membershipMode === "gated" && gateDrafts.some((draft) =>
      draft.gateType === "minimum_age"
      && Number.isInteger(draft.minimumAge)
      && draft.minimumAge >= 18
      && draft.minimumAge <= 125,
    );
    const effectiveDefaultAgeGatePolicy = hasAdultMinimumAgeGate ? "18_plus" : defaultAgeGatePolicy;
    const gatePolicy = membershipMode === "gated"
      ? serializeIdentityGateDrafts(gateDrafts)
      : null;
    void submitCommunitySave({
      action: (currentCommunity) => api.communities.updateGates(currentCommunity.id, {
        membership_mode: membershipMode,
        default_age_gate_policy: effectiveDefaultAgeGatePolicy,
        allow_anonymous_identity: allowAnonymousIdentity,
        anonymous_identity_scope: allowAnonymousIdentity ? anonymousIdentityScope : null,
        gate_policy: gatePolicy,
      }),
      community,
      failureMessage: "Could not save access settings.",
      saveCommunity,
      saving: savingGates,
      savingSetter: setSavingGates,
      successMessage: "Access settings saved.",
    });
  }, [allowAnonymousIdentity, anonymousIdentityScope, api.communities, community, defaultAgeGatePolicy, gateDrafts, membershipMode, saveCommunity, savingGates]);

  return {
    allowAnonymousIdentity,
    anonymousIdentityScope,
    defaultAgeGatePolicy,
    gateDrafts,
    handleSaveGates,
    membershipMode,
    preservedGateRuleCount: 0,
    savingGates,
    setAllowAnonymousIdentity,
    setAnonymousIdentityScope,
    setDefaultAgeGatePolicy,
    setGateDrafts,
    setMembershipMode,
  };
}
