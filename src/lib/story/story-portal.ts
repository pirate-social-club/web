import type { PirateStoryNetwork } from "@/lib/network-config";

const STORY_IP_ID_PATTERN = /^0x[0-9a-f]{40}$/i;

const STORY_IP_EXPLORER_BASE_URL: Record<PirateStoryNetwork, string> = {
  "story-aeneid": "https://aeneid.explorer.story.foundation",
  "story-mainnet": "https://explorer.story.foundation",
};

export function buildStoryExplorerIpAssetUrl(
  storyIpId: string | null | undefined,
  storyNetwork: PirateStoryNetwork | null | undefined,
): string | null {
  const normalizedIpId = storyIpId?.trim();
  if (!normalizedIpId || !storyNetwork || !STORY_IP_ID_PATTERN.test(normalizedIpId)) {
    return null;
  }

  return `${STORY_IP_EXPLORER_BASE_URL[storyNetwork]}/ipa/${normalizedIpId}`;
}

export function buildStoryPortalAssetUrl(
  storyIpId: string | null | undefined,
  storyNetwork: PirateStoryNetwork | null | undefined,
): string | null {
  return buildStoryExplorerIpAssetUrl(storyIpId, storyNetwork);
}
