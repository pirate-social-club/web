import { describe, expect, test } from "bun:test";
import {
  publicProfileCanonicalPath,
  publicProfileCommunityPath,
  publicProfileDescription,
  publicProfileDisplayName,
  publicProfileShareImage,
} from "./public-profile-presentation";
import { profileResponsePolicy, type PublicProfileView } from "./api/public-profile";

const profile: PublicProfileView = {
  profile: {
    displayName: null,
    avatarRef: "https://cdn.pirate.sc/avatar.png",
    coverRef: null,
    bio: null,
    globalHandleLabel: "resolved.pirate",
  },
  requestedHandleLabel: "old label",
  resolvedHandleLabel: "resolved.pirate",
  isCanonical: false,
  createdCommunities: [
    { community: "community-id", displayName: "Community", created: 1, routeSlug: null },
  ],
};

describe("public profile presentation and response policy", () => {
  test("falls back to the resolved label and never invents a community slug", () => {
    expect(publicProfileDisplayName(profile)).toBe("resolved.pirate");
    expect(publicProfileCommunityPath(profile.createdCommunities[0]!)).toBe("/c/community-id");
    expect(publicProfileCanonicalPath(profile)).toBe("/u/resolved.pirate");
    expect(publicProfileCanonicalPath(profile, "https://pirate.sc")).toBe("https://pirate.sc/u/resolved.pirate");
    expect(publicProfileShareImage({ ...profile, profile: { ...profile.profile, avatarRef: null } }, "https://pirate.sc")).toBe("https://pirate.sc/og/pirate-share-card.jpg");
  });

  test("uses localized bio/community/default description precedence", () => {
    const copy = {
      createdCommunitySingularDescription: "{name} created 1 community.",
      createdCommunityPluralDescription: "{name} created {count} communities.",
      defaultDescription: "Public profile for {name}.",
    } as const;
    expect(publicProfileDescription(profile, copy)).toBe("resolved.pirate created 1 community.");
    expect(publicProfileDescription({ ...profile, createdCommunities: [] }, copy)).toBe("Public profile for resolved.pirate.");
    expect(publicProfileDescription({ ...profile, profile: { ...profile.profile, bio: "Bio <escaped>" } }, copy)).toBe("Bio <escaped>");
    expect(publicProfileDescription({ ...profile, profile: { ...profile.profile, bio: "x".repeat(300) } }, copy)).toHaveLength(180);
  });

  test("keeps signed-out success cacheable, bearer success private, and all failures no-store", () => {
    const alias = { kind: "success", status: 200, data: profile } as const;
    expect(profileResponsePolicy(alias, false)).toEqual({
      status: 302,
      cacheControl: "public, max-age=60, s-maxage=300",
      vary: "Accept-Language",
      redirect: "/u/resolved.pirate",
    });
    expect(profileResponsePolicy(alias, true)).toMatchObject({ status: 302, cacheControl: "no-store" });
    expect(profileResponsePolicy({ kind: "not-found", status: 404 }, false)).toMatchObject({ status: 404, cacheControl: "no-store", redirect: null });
    expect(profileResponsePolicy({ kind: "upstream-error", status: 502 }, false)).toMatchObject({ status: 502, cacheControl: "no-store" });
  });
});
