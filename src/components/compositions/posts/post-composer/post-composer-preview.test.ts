import { describe, expect, test } from "bun:test";

import { buildPostComposerPreviewContent } from "./post-composer-preview";

describe("buildPostComposerPreviewContent", () => {
  test("uses the selected video poster frame for the publish preview", () => {
    const content = buildPostComposerPreviewContent({
      access: "free",
      attachment: {
        kind: "video",
        label: "clip.mp4",
        previewUrl: "blob:https://app.test/video",
      },
      body: "",
      price: "",
      title: "Clip",
      videoPosterSrc: "data:image/jpeg;base64,poster-frame",
    });

    expect(content).toMatchObject({
      type: "video",
      posterSrc: "data:image/jpeg;base64,poster-frame",
      src: "blob:https://app.test/video",
    });
  });
});
