"use client";

import * as React from "react";
import type { Community as ApiCommunity } from "@pirate/api-contracts";

import {
  DEFAULT_GATED_GATE_DRAFTS,
  type IdentityGateDraft,
} from "@/components/compositions/community/create-composer/create-community-composer.types";
import { useApi } from "@/lib/api";
import type { AnonymousIdentityScope, CommunityDefaultAgeGatePolicy } from "@/lib/community-access-types";

import { submitCommunitySave, type SaveCommunityAction } from "@/app/authenticated-helpers/community-moderation-save";
import {
  serializeIdentityGateDrafts,
  serializeIdentityGateDraftsForSave,
  type PreserveGatePolicyInput,
} from "@/app/authenticated-helpers/community-gate-rule-serialization";
import { getCommunityGateDrafts } from "@/app/authenticated-helpers/moderation-helpers";
import {
  areStableJsonValuesEqual,
  getGatePolicyMatchMode,
  isGatePolicyProjectionLossy,
} from "@/lib/gate-policy-utils";

export function useCommunityAccessState({
  community,
  saveCommunity,
}: {
  community: ApiCommunity | null;
  saveCommunity: SaveCommunityAction;
}) {
  const api = useApi();
  const [membershipMode, setMembershipMode] = React.useState<"request" | "gated">("gated");
  const [defaultAgeGatePolicy, setDefaultAgeGatePolicy] = React.useState<CommunityDefaultAgeGatePolicy>("none");
  const [allowAnonymousIdentity, setAllowAnonymousIdentity] = React.useState(true);
  const [anonymousIdentityScope, setAnonymousIdentityScope] = React.useState<AnonymousIdentityScope>("community_stable");
  const [gateDrafts, setGateDrafts] = React.useState<IdentityGateDraft[]>([]);
  const [gateMatchMode, setGateMatchMode] = React.useState<"all" | "any">("all");
  const [savingGates, setSavingGates] = React.useState(false);
  const [hasAdvancedGatePolicy, setHasAdvancedGatePolicy] = React.useState(false);
  const [replaceAdvancedGatePolicy, setReplaceAdvancedGatePolicy] = React.useState(false);
  const loadedGatePolicyRef = React.useRef<PreserveGatePolicyInput | null>(null);
  React.useEffect(() => {
    if (!community) {
      return;
    }

    const nextMembershipMode = community.membership_mode === "request" ? "request" : "gated";
    const nextGateDrafts = getCommunityGateDrafts(community);
    const nextVisibleGateDrafts = nextMembershipMode === "gated" && nextGateDrafts.length === 0
      ? DEFAULT_GATED_GATE_DRAFTS
      : nextGateDrafts;
    const nextGateMatchMode = getGatePolicyMatchMode(community.gate_policy);
    setMembershipMode(nextMembershipMode);
    setDefaultAgeGatePolicy(community.default_age_gate_policy ?? "none");
    setAllowAnonymousIdentity(community.allow_anonymous_identity);
    setAnonymousIdentityScope(community.anonymous_identity_scope ?? "community_stable");
    setGateDrafts(nextVisibleGateDrafts);
    setGateMatchMode(nextGateMatchMode);
    setReplaceAdvancedGatePolicy(false);
    loadedGatePolicyRef.current = community.gate_policy
      ? {
          gateDrafts: nextVisibleGateDrafts,
          mode: nextGateMatchMode,
          policy: community.gate_policy,
        }
      : null;
    setHasAdvancedGatePolicy(isGatePolicyProjectionLossy(
      community.gate_policy,
      nextMembershipMode === "gated"
        ? serializeIdentityGateDrafts(nextVisibleGateDrafts, { mode: nextGateMatchMode })
        : null,
    ));
  }, [community]);

  const gatePolicyProjectionUnchanged = React.useMemo(() => {
    const loadedGatePolicy = loadedGatePolicyRef.current;
    return membershipMode === "gated"
      && loadedGatePolicy != null
      && loadedGatePolicy.mode === gateMatchMode
      && gateDraftsEqual(loadedGatePolicy.gateDrafts, gateDrafts);
  }, [gateDrafts, gateMatchMode, membershipMode]);

  const advancedGatePolicyReplacementRequired = hasAdvancedGatePolicy
    && membershipMode === "gated"
    && !gatePolicyProjectionUnchanged;

  const handleSaveGates = React.useCallback(() => {
    if (!community) return;
    if (advancedGatePolicyReplacementRequired && !replaceAdvancedGatePolicy) return;
    const hasAdultMinimumAgeGate = membershipMode === "gated" && gateDrafts.some((draft) =>
      draft.gateType === "minimum_age"
      && Number.isInteger(draft.minimumAge)
      && draft.minimumAge >= 18
      && draft.minimumAge <= 125,
    );
    const effectiveDefaultAgeGatePolicy = hasAdultMinimumAgeGate ? "18_plus" : defaultAgeGatePolicy;
    const gatePolicy = membershipMode === "gated"
      ? serializeIdentityGateDraftsForSave(gateDrafts, {
          mode: gateMatchMode,
          preserve: loadedGatePolicyRef.current,
        })
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
  }, [advancedGatePolicyReplacementRequired, allowAnonymousIdentity, anonymousIdentityScope, api.communities, community, defaultAgeGatePolicy, gateDrafts, gateMatchMode, membershipMode, replaceAdvancedGatePolicy, saveCommunity, savingGates]);

  return {
    advancedGatePolicyReplacementRequired,
    allowAnonymousIdentity,
    anonymousIdentityScope,
    defaultAgeGatePolicy,
    gateDrafts,
    gateMatchMode,
    hasAdvancedGatePolicy,
    handleSaveGates,
    membershipMode,
    preservedGateRuleCount: 0,
    replaceAdvancedGatePolicy,
    savingGates,
    setAllowAnonymousIdentity,
    setAnonymousIdentityScope,
    setDefaultAgeGatePolicy,
    setGateDrafts,
    setGateMatchMode,
    setMembershipMode,
    setReplaceAdvancedGatePolicy,
  };
}

function gateDraftsEqual(left: IdentityGateDraft[], right: IdentityGateDraft[]): boolean {
  return areStableJsonValuesEqual(left, right);
}
