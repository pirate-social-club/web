import { describe, expect, test } from "bun:test";

import { filterSupportedPostTypes, isSupportedPostType } from "./post-type-compat";

describe("post type compatibility", () => {
  test("accepts the deployed post types, including generic goods", () => {
    expect(isSupportedPostType("file")).toBe(true);
    expect(isSupportedPostType("deck")).toBe(false);
    expect(isSupportedPostType("future_post")).toBe(false);
  });

  test("skips unknown collection entries without coercing them", () => {
    const supported = filterSupportedPostTypes([
      { post: { post_type: "text" } },
      { post: { post_type: "future_post" } },
      { post: { post_type: "deck" } },
    ]);
    expect(supported.map((item) => item.post.post_type)).toEqual(["text"]);
  });
});
