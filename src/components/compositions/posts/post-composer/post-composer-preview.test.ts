import { describe, expect, test } from "bun:test";

import { getPostComposerPreviewBody } from "./post-composer-publish-settings";
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
      body: "First line\n\n- one\n- two",
      price: "",
      title: "Clip",
      videoPosterSrc: "data:image/jpeg;base64,poster-frame",
    });

    expect(content).toMatchObject({
      type: "video",
      caption: "First line\n\n- one\n- two",
      posterSrc: "data:image/jpeg;base64,poster-frame",
      src: "blob:https://app.test/video",
    });
  });

  test("maps song body text into a caption for the publish preview", () => {
    const content = buildPostComposerPreviewContent({
      access: "free",
      attachment: {
        kind: "song",
        label: "track.wav",
        previewUrl: "blob:https://app.test/song",
      },
      body: "First line\n\n- one\n- two",
      price: "",
      title: "Track",
    });

    expect(content).toMatchObject({
      type: "song",
      caption: "First line\n\n- one\n- two",
    });
  });

  test("uses song post body, not media caption or lyrics, for publish preview captions", () => {
    const body = getPostComposerPreviewBody({
      fields: {
        captionValue: "Image/video caption",
        lyricsValue: "[Verse]\nLyrics should stay on the bundle.",
        textBodyValue: "Song post caption",
      },
      tabs: { activeTab: "song" },
    } as never);

    expect(body).toBe("Song post caption");
  });

  test("keeps local song artwork and playback wired in the publish preview", () => {
    const content = buildPostComposerPreviewContent({
      access: "free",
      attachment: {
        kind: "song",
        artworkUrl: "blob:https://app.test/cover",
        label: "track.wav",
        previewUrl: "blob:https://app.test/song",
      },
      body: "Lyrics shown on the post",
      price: "",
      songPlayback: {
        onPlay: () => undefined,
        onPause: () => undefined,
        state: "idle",
      },
      title: "Track",
    });

    expect(content).toMatchObject({
      type: "song",
      artworkSrc: "blob:https://app.test/cover",
      caption: "Lyrics shown on the post",
      playbackState: "idle",
    });
    expect(typeof (content.type === "song" ? content.onPlay : undefined)).toBe("function");
  });

  test("uses canonical song title instead of upload label for the publish preview", () => {
    const content = buildPostComposerPreviewContent({
      access: "free",
      attachment: {
        kind: "song",
        label: "demo-upload.wav",
        previewUrl: "blob:https://app.test/song",
      },
      body: "",
      price: "",
      songTitle: "Midnight Signal",
      title: "New drop",
    });

    expect(content).toMatchObject({
      type: "song",
      title: "Midnight Signal",
    });
  });

  test("uses fetched link preview title instead of typed title for generic links", () => {
    const content = buildPostComposerPreviewContent({
      access: "free",
      attachment: { kind: "link", url: "https://example.com/article" },
      body: "",
      linkPreview: {
        domain: "example.com",
        title: "OG Article Title",
        imageSrc: "https://example.com/image.jpg",
      },
      price: "",
      title: "My typed title",
    });

    expect(content).toMatchObject({
      type: "link",
      previewTitle: "OG Article Title",
      previewImageSrc: "https://example.com/image.jpg",
    });
  });

  test("builds embed content for X links when linkPreview has provider x", () => {
    const content = buildPostComposerPreviewContent({
      access: "free",
      attachment: { kind: "link", url: "https://x.com/user/status/123" },
      body: "Check this out",
      linkPreview: {
        domain: "x.com",
        provider: "x",
        canonicalUrl: "https://x.com/user/status/123",
        originalUrl: "https://x.com/user/status/123",
        state: "embed",
        oembedHtml: `<blockquote class="twitter-tweet"><p>Tweet content here</p></blockquote>`,
        embedPreview: {
          authorName: "Test User",
          text: "Tweet content here",
          hasMedia: true,
          mediaUrl: "https://pic.x.com/abc.jpg",
        },
      },
      price: "",
      title: "My post title",
    });

    expect(content).toMatchObject({
      type: "embed",
      provider: "x",
      renderMode: "official",
      state: "embed",
      oembedHtml: `<blockquote class="twitter-tweet"><p>Tweet content here</p></blockquote>`,
      preview: {
        authorName: "Test User",
        text: "Tweet content here",
        hasMedia: true,
        mediaUrl: "https://pic.x.com/abc.jpg",
      },
    });
  });

  test("builds embed content for YouTube links when linkPreview has provider youtube", () => {
    const content = buildPostComposerPreviewContent({
      access: "free",
      attachment: { kind: "link", url: "https://youtube.com/watch?v=dQw4w9WgXcQ" },
      body: "",
      linkPreview: {
        domain: "youtube.com",
        provider: "youtube",
        canonicalUrl: "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
        originalUrl: "https://youtube.com/watch?v=dQw4w9WgXcQ",
        state: "embed",
        oembedHtml: `<iframe title="Never Gonna Give You Up" src="https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ"></iframe>`,
        embedPreview: {
          authorName: "Rick Astley",
          thumbnailUrl: "https://i.ytimg.com/vi/dQw4w9WgXcQ/hqdefault.jpg",
          thumbnailWidth: 480,
          thumbnailHeight: 360,
          text: "Never Gonna Give You Up",
        },
      },
      price: "",
      title: "My post title",
    });

    expect(content).toMatchObject({
      type: "embed",
      provider: "youtube",
      renderMode: "official",
      state: "embed",
      oembedHtml: `<iframe title="Never Gonna Give You Up" src="https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ"></iframe>`,
      preview: {
        authorName: "Rick Astley",
        thumbnailUrl: "https://i.ytimg.com/vi/dQw4w9WgXcQ/hqdefault.jpg",
        title: "Never Gonna Give You Up",
      },
    });
  });

  test("uses lightweight preview mode when an embed is not hydrated", () => {
    const content = buildPostComposerPreviewContent({
      access: "free",
      attachment: { kind: "link", url: "https://x.com/user/status/123" },
      body: "",
      linkPreview: {
        domain: "x.com",
        provider: "x",
        canonicalUrl: "https://x.com/user/status/123",
        originalUrl: "https://x.com/user/status/123",
        state: "preview",
        embedPreview: {
          text: "Tweet content here",
        },
      },
      price: "",
      title: "My post title",
    });

    expect(content).toMatchObject({
      type: "embed",
      provider: "x",
      renderMode: "preview",
      state: "preview",
    });
  });

  test("falls back to generic link card when no linkPreview is available", () => {
    const content = buildPostComposerPreviewContent({
      access: "free",
      attachment: { kind: "link", url: "https://example.com" },
      body: "",
      price: "",
      title: "My post title",
    });

    expect(content).toMatchObject({
      type: "link",
      previewTitle: undefined,
    });
  });
});
