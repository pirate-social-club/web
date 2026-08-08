import { describe, expect, test } from "bun:test";

import { toVideoViewerItem } from "./video-viewer-item";

function videoItem(upstreamAttributions?: Array<{
  assetId: string;
  relationshipType: "references_song";
  sourcePostId?: string;
  title: string;
}>) {
  return {
    id: "pst_video",
    post: {
      byline: { community: { kind: "community", label: "music.pirate" } },
      content: {
        caption: "Video",
        src: "https://media.test/video.mp4",
        type: "video",
        upstreamAttributions,
      },
      engagement: { commentCount: 0, score: 0 },
    },
  } as never;
}

describe("toVideoViewerItem", () => {
  test("marks resolvable linked-song capabilities as unknown", () => {
    expect(toVideoViewerItem(videoItem([{
      assetId: "ast_song",
      relationshipType: "references_song",
      sourcePostId: "pst_song",
      title: "Song",
    }]))).toMatchObject({
      karaoke: "unknown",
      study: "unknown",
    });
  });

  test("keeps unlinked video learning actions unavailable", () => {
    expect(toVideoViewerItem(videoItem())).toMatchObject({
      karaoke: "unavailable",
      study: "unavailable",
    });
  });
});
