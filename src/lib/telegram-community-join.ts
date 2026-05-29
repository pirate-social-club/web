export function buildTelegramCommunityJoinUrl(input: {
  appOrigin?: string | null;
  communityId: string | null | undefined;
}): string | null {
  const communityId = input.communityId?.trim();
  if (!communityId) {
    return null;
  }

  const origin = input.appOrigin?.trim()
    || (typeof window !== "undefined" ? window.location.origin : "https://pirate.sc");
  return new URL(`/tg/join/${encodeURIComponent(communityId)}`, origin).toString();
}
