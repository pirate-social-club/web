import { describe, expect, test } from "bun:test";

import {
  firstMediaImageSrc,
  rightsReviewClearActionForEvidenceRefs,
} from "@/app/authenticated-routes/moderation-route";

describe("moderation route media previews", () => {
  test("uses the poster frame for video moderation previews", () => {
    expect(firstMediaImageSrc({
      media_refs_json: JSON.stringify([{
        mime_type: "video/mp4",
        poster_ref: "https://media.test/poster.jpg",
        storage_ref: "https://media.test/video.mp4",
      }]),
    } as never)).toBe("https://media.test/poster.jpg");
  });

  test("uses the storage ref for image moderation previews", () => {
    expect(firstMediaImageSrc({
      media_refs_json: JSON.stringify([{
        mime_type: "image/jpeg",
        poster_ref: "https://media.test/poster.jpg",
        storage_ref: "https://media.test/image.jpg",
      }]),
    } as never)).toBe("https://media.test/image.jpg");
  });

  test("uses upstream-ref clear only when source evidence is available", () => {
    expect(rightsReviewClearActionForEvidenceRefs(["song-bundle:cmt_source:sab_song"]))
      .toBe("clear_with_upstream_refs");
    expect(rightsReviewClearActionForEvidenceRefs([])).toBe("clear");
    expect(rightsReviewClearActionForEvidenceRefs()).toBe("clear");
  });
});
