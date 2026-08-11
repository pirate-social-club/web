import "@/test/setup-runtime";

import * as React from "react";
import { beforeEach, describe, expect, mock, test } from "bun:test";
import { render } from "@testing-library/react";

import type { FeedItem } from "./feed";

let postCardRenderCount = 0;

mock.module("@/components/compositions/posts/post-card/post-card", () => ({
  PostCard: () => {
    postCardRenderCount += 1;
    return null;
  },
}));

import { Feed } from "./feed";

const ITEMS = Array.from({ length: 40 }, (_, index): FeedItem => ({
  id: `post_${index}`,
  post: {
    byline: {
      author: { kind: "user", label: "author" },
      timestampLabel: "now",
    },
    content: { body: `Post ${index}`, type: "text" },
    postId: `post_${index}`,
  },
}));

beforeEach(() => {
  postCardRenderCount = 0;
});

describe("Feed reconciliation", () => {
  test("does not reconcile stable rows for an unrelated parent update", () => {
    let commitCount = 0;
    const onRender = () => {
      commitCount += 1;
    };
    const view = render(
      <React.Profiler id="feed" onRender={onRender}>
        <Feed items={ITEMS} loadingMore={false} />
      </React.Profiler>,
    );

    view.rerender(
      <React.Profiler id="feed" onRender={onRender}>
        <Feed items={ITEMS} loadingMore />
      </React.Profiler>,
    );

    expect(commitCount).toBe(2);
    expect(postCardRenderCount).toBe(40);
  });
});
