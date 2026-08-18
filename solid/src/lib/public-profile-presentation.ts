import type { PublicProfileView } from "./api/public-profile";

export interface PublicProfileCopy {
  readonly createdCommunitySingularDescription: string;
  readonly createdCommunityPluralDescription: string;
  readonly defaultDescription: string;
}

const PUBLIC_PROFILE_DEFAULT_SHARE_IMAGE_PATH = "/og/pirate-share-card.jpg";
const PUBLIC_PROFILE_META_DESCRIPTION_MAX_LENGTH = 180;

function interpolate(message: string, values: Readonly<Record<string, string | number>>): string {
  return message.replace(/\{([a-zA-Z][a-zA-Z0-9_]*)\}/g, (token, key: string) =>
    Object.prototype.hasOwnProperty.call(values, key) ? String(values[key]) : token,
  );
}

export function publicProfileDisplayName(data: PublicProfileView): string {
  return data.profile.displayName ?? (data.resolvedHandleLabel || data.requestedHandleLabel);
}

export function publicProfileDescription(data: PublicProfileView, copy: PublicProfileCopy): string {
  const name = publicProfileDisplayName(data);
  if (data.profile.bio) return truncatePublicProfileDescription(data.profile.bio);
  if (data.createdCommunities.length > 0) {
    const template = data.createdCommunities.length === 1
      ? copy.createdCommunitySingularDescription
      : copy.createdCommunityPluralDescription;
    return truncatePublicProfileDescription(interpolate(template, {
      name,
      count: data.createdCommunities.length,
    }));
  }
  return truncatePublicProfileDescription(interpolate(copy.defaultDescription, { name }));
}

function truncatePublicProfileDescription(value: string): string {
  const normalized = value.replace(/\s+/g, " ").trim();
  if (normalized.length <= PUBLIC_PROFILE_META_DESCRIPTION_MAX_LENGTH) return normalized;
  return `${normalized.slice(0, PUBLIC_PROFILE_META_DESCRIPTION_MAX_LENGTH - 3).trimEnd()}...`;
}

function originForMetadata(origin: string | undefined): string | null {
  if (!origin) return null;
  try {
    const url = new URL(origin);
    return url.protocol === "https:" || url.protocol === "http:" ? url.origin : null;
  } catch {
    return null;
  }
}

export function publicProfileCanonicalPath(data: PublicProfileView, origin?: string): string {
  const path = `/u/${encodeURIComponent(data.resolvedHandleLabel)}`;
  const trustedOrigin = originForMetadata(origin);
  return trustedOrigin ? `${trustedOrigin}${path}` : path;
}

/** Keep persisted media refs renderable without allowing scriptable URL schemes. */
export function publicProfileMediaRef(value: string | null, origin?: string): string | null {
  const trimmed = value?.trim();
  if (!trimmed) return null;
  try {
    const base = originForMetadata(origin) ?? "https://pirate.sc";
    const url = trimmed.startsWith("/") ? new URL(trimmed, base) : new URL(trimmed);
    if (url.protocol === "http:" || url.protocol === "https:" || url.protocol === "ipfs:") {
      return url.toString();
    }
  } catch {
    // Invalid persisted media refs are omitted from the public page.
  }
  return null;
}

export function publicProfileShareImage(data: PublicProfileView, origin: string): string {
  const trustedOrigin = originForMetadata(origin) ?? "https://pirate.sc";
  for (const candidate of [data.profile.coverRef, data.profile.avatarRef]) {
    const image = publicProfileMediaRef(candidate, trustedOrigin);
    if (image?.startsWith("http:") || image?.startsWith("https:")) return image;
  }
  return `${trustedOrigin}${PUBLIC_PROFILE_DEFAULT_SHARE_IMAGE_PATH}`;
}

export function publicProfileCommunityPath(community: PublicProfileView["createdCommunities"][number]): string {
  return `/c/${encodeURIComponent(community.routeSlug ?? community.community)}`;
}
