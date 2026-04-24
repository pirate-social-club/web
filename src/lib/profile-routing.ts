type PublicIdentityHandle = {
  global_handle: { label: string };
  primary_public_handle?: { label: string } | null;
};

export function getProfileHandleLabel(profile: PublicIdentityHandle): string {
  return profile.primary_public_handle?.label ?? profile.global_handle.label;
}

export function formatProfileDisplayHandle(handleLabel: string): string {
  const trimmed = handleLabel.trim();
  if (!trimmed) return "";
  if (trimmed.startsWith("u/")) return trimmed;
  return trimmed.toLowerCase().endsWith(".pirate") ? `u/${trimmed}` : trimmed;
}

export function buildPublicProfilePath(handleLabel: string): string {
  return `/u/${encodeURIComponent(handleLabel)}`;
}

export function buildPublicProfilePathForProfile(
  profile: PublicIdentityHandle,
): string {
  return buildPublicProfilePath(getProfileHandleLabel(profile));
}
