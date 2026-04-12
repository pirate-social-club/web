import {
  getCommunityById,
  getCommunityFlairPolicy,
  getCommunityProfile,
  listCommunityGateRules,
  listCommunityReferenceLinks,
} from "@/lib/pirate-api";

import {
  buildCommunitySettingsState,
  type CommunitySettingsLoadedState,
} from "./community-settings-mappers";

export async function loadCommunitySettingsState(input: {
  communityId: string;
  accessToken?: string | null;
  signal?: AbortSignal;
}): Promise<CommunitySettingsLoadedState> {
  const [community, profile, referenceLinks, gateRules, flairPolicy] = await Promise.all([
    getCommunityById(input),
    getCommunityProfile(input),
    listCommunityReferenceLinks(input),
    listCommunityGateRules(input),
    getCommunityFlairPolicy(input),
  ]);

  return buildCommunitySettingsState({
    community,
    profile,
    referenceLinks: referenceLinks.items,
    gateRules: gateRules.gate_rules,
    flairPolicy,
  });
}
