import { describe, expect, test } from "bun:test";

import type { Profile as ApiProfile } from "@pirate/api-contracts";

import { resolveCommentAuthorLabel, resolvePostAuthorLabel } from "./post-identity-presentation";

const profileWithHandle = {
  display_name: null,
  global_handle: { label: "fetched.pirate" },
  primary_public_handle: null,
} as unknown as Pick<ApiProfile, "display_name" | "global_handle" | "primary_public_handle">;

describe("resolvePostAuthorLabel", () => {
  test("prefers the server-resolved public handle (no first-paint flicker)", () => {
    const label = resolvePostAuthorLabel({
      identity_mode: "public",
      authorship_mode: "human_direct",
      agent_display_name_snapshot: null,
      author_public_handle: "alice.pirate",
      author_user: "usr_abcdef123456",
      anonymous_label: null,
    }, null);
    expect(label).toBe("alice.pirate");
  });

  test("falls back to the fetched profile handle when the payload handle is absent", () => {
    const label = resolvePostAuthorLabel({
      identity_mode: "public",
      authorship_mode: "human_direct",
      agent_display_name_snapshot: null,
      author_public_handle: null,
      author_user: "usr_abcdef123456",
      anonymous_label: null,
    }, profileWithHandle);
    expect(label).toBe("fetched.pirate");
  });

  test("falls back to the truncated user id only when neither handle is available", () => {
    const label = resolvePostAuthorLabel({
      identity_mode: "public",
      authorship_mode: "human_direct",
      agent_display_name_snapshot: null,
      author_public_handle: null,
      author_user: "abcdef123456",
      anonymous_label: null,
    }, null);
    expect(label).toBe("abcdef12");
  });

  test("uses the anonymous label for anonymous posts and ignores the handle", () => {
    const label = resolvePostAuthorLabel({
      identity_mode: "anonymous",
      authorship_mode: "human_direct",
      agent_display_name_snapshot: null,
      author_public_handle: "leak.pirate",
      author_user: null,
      anonymous_label: "anon_granite-mast-70",
    }, null);
    expect(label).toBe("anon_granite-mast-70");
  });

  test("uses the agent display name for agent posts before the public handle", () => {
    const label = resolvePostAuthorLabel({
      identity_mode: "public",
      authorship_mode: "user_agent",
      agent_display_name_snapshot: "Helper Bot",
      author_public_handle: "owner.pirate",
      author_user: "usr_owner",
      anonymous_label: null,
    }, null);
    expect(label).toBe("Helper Bot");
  });
});

describe("resolveCommentAuthorLabel", () => {
  test("prefers the server-resolved public handle", () => {
    const label = resolveCommentAuthorLabel({
      identity_mode: "public",
      author_public_handle: "bob.pirate",
      author_user: "usr_bob",
      anonymous_label: null,
    }, null);
    expect(label).toBe("bob.pirate");
  });

  test("falls back to the fetched profile when the payload handle is absent", () => {
    const label = resolveCommentAuthorLabel({
      identity_mode: "public",
      author_public_handle: null,
      author_user: "usr_bob",
      anonymous_label: null,
    }, profileWithHandle);
    expect(label).toBe("fetched.pirate");
  });

  test("uses the anonymous label for anonymous comments", () => {
    const label = resolveCommentAuthorLabel({
      identity_mode: "anonymous",
      author_public_handle: null,
      author_user: null,
      anonymous_label: "anon",
    }, null);
    expect(label).toBe("anon");
  });
});
