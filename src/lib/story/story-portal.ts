import type { PirateStoryNetwork } from "@/lib/network-config";

const STORY_IP_ID_PATTERN = /^0x[0-9a-f]{40}$/i;

const STORY_PORTAL_BASE_URL: Record<PirateStoryNetwork, string> = {
  "story-aeneid": "https://aeneid.portal.story.foundation",
  "story-mainnet": "https://portal.story.foundation",
};

export function buildStoryPortalAssetUrl(
  storyIpId: string | null | undefined,
  storyNetwork: PirateStoryNetwork | null | undefined,
): string | null {
  const normalizedIpId = storyIpId?.trim();
  if (!normalizedIpId || !storyNetwork || !STORY_IP_ID_PATTERN.test(normalizedIpId)) {
    return null;
  }

  return `${STORY_PORTAL_BASE_URL[storyNetwork]}/asset/${normalizedIpId}`;
}

export function buildStoryExplorerIpAssetUrl(
  storyIpId: string | null | undefined,
  storyNetwork: PirateStoryNetwork | null | undefined,
): string | null {
  return buildStoryPortalAssetUrl(storyIpId, storyNetwork);
}
