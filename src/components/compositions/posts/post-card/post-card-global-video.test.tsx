import "@/test/setup-runtime";

import { afterEach, describe, expect, test } from "bun:test";
import { cleanup, fireEvent, render } from "@testing-library/react";

import {
  VideoExperienceContext,
  type VideoExperienceSeed,
} from "@/app/video-experience/video-experience-context";

import { PostCard } from "./post-card";

afterEach(cleanup);

describe("PostCard global video entry", () => {
  test("opens the shell experience immediately from hydrated card data", async () => {
    const opened: VideoExperienceSeed[] = [];
    const view = render(
      <VideoExperienceContext.Provider value={{ openVideo: (seed) => opened.push(seed) }}>
        <PostCard
          byline={{ author: { kind: "user", label: "artist" }, timestampLabel: "now" }}
          content={{
            accessMode: "public",
            aspectRatio: 9 / 16,
            caption: "Seeded from the community feed.",
            posterSrc: "https://media.test/poster.webp",
            src: "https://media.test/video.mp4",
            type: "video",
          }}
          engagement={{ commentCount: 3, score: 7, upvoteCount: 9 }}
          postId="pst_seed"
          viewContext="community"
        />
      </VideoExperienceContext.Provider>,
    );

    fireEvent.click(await view.findByRole("button", { name: "Play video" }));

    expect(opened).toHaveLength(1);
    expect(opened[0]?.source).toBe("community");
    expect(opened[0]?.item).toMatchObject({
      caption: "Seeded from the community feed.",
      id: "pst_seed",
      likeCount: 9,
      media: { src: "https://media.test/video.mp4" },
    });
  });

  test("keeps previews local and inert", async () => {
    const opened: VideoExperienceSeed[] = [];
    const view = render(
      <VideoExperienceContext.Provider value={{ openVideo: (seed) => opened.push(seed) }}>
        <PostCard
          byline={{ author: { kind: "user", label: "artist" }, timestampLabel: "now" }}
          content={{
            accessMode: "public",
            src: "blob:https://pirate.test/draft",
            type: "video",
          }}
          engagement={{ commentCount: 0, score: 0 }}
          postId="draft"
          previewMode
        />
      </VideoExperienceContext.Provider>,
    );

    fireEvent.click(await view.findByRole("button", { name: "Play video" }));
    expect(opened).toEqual([]);
  });
});
