import { describe, expect, test } from "bun:test";

import { buildPostShareActions } from "./post-share-actions";

const basePost = {
  id: "post_pst_test",
  object: "post",
  post_type: "text",
  status: "published",
  title: "Test post",
  visibility: "public",
  parent_post: null,
} as const;

function actionKeys(overrides: Record<string, unknown> = {}): string[] {
  return buildPostShareActions({ ...basePost, ...overrides } as never).map((action) => action.key);
}

describe("buildPostShareActions", () => {
  test("adds crosspost before link sharing for eligible posts", () => {
    expect(actionKeys().slice(0, 2)).toEqual(["crosspost", "copy-link"]);
  });

  test("omits crosspost for ineligible source post shape", () => {
    expect(actionKeys({ post_type: "crosspost" })).not.toContain("crosspost");
    expect(actionKeys({ parent_post: "post_parent" })).not.toContain("crosspost");
    expect(actionKeys({ visibility: "members_only" })).not.toContain("crosspost");
  });

  test("omits crosspost for unpublished or unavailable statuses", () => {
    for (const status of ["draft", "hidden", "removed", "deleted"] as const) {
      expect(actionKeys({ status })).not.toContain("crosspost");
      expect(actionKeys({ status })).toContain("copy-link");
    }
  });
});
