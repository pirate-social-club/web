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

describe("buildPostShareActions", () => {
  test("adds crosspost before link sharing for eligible posts", () => {
    expect(buildPostShareActions(basePost as never).map((action) => action.key)).toContain("crosspost");
    expect(buildPostShareActions(basePost as never).map((action) => action.key)).toContain("copy-link");
  });

  test("omits crosspost for ineligible source posts", () => {
    const crosspost = { ...basePost, post_type: "crosspost" };
    const reply = { ...basePost, parent_post: "post_parent" };
    const hidden = { ...basePost, visibility: "members_only" };

    expect(buildPostShareActions(crosspost as never).map((action) => action.key)).not.toContain("crosspost");
    expect(buildPostShareActions(reply as never).map((action) => action.key)).not.toContain("crosspost");
    expect(buildPostShareActions(hidden as never).map((action) => action.key)).not.toContain("crosspost");
  });
});
