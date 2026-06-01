import { describe, expect, test } from "bun:test";
import { renderToStaticMarkup } from "react-dom/server";

import { Document } from "@/app/document";
import {
  buildCloudflareShareImageUrl,
  buildCommunitySeoMetadata,
  buildOpenGraphUrl,
  buildPostSeoMetadata,
  resolveSharePreviewQueryValue,
  shouldAlwaysResolveEntitySeo,
} from "@/lib/share-metadata";

function basePost(overrides: Record<string, unknown> = {}) {
  return {
    id: "pst_test",
    object: "post",
    community: "com_test",
    post_type: "text",
    title: "A proper preview",
    body: "The body should become the share description.",
    caption: null,
    link_og_image_url: null,
    link_og_title: null,
    media_refs: [],
    ...overrides,
  };
}

function postResponse(overrides: Record<string, unknown> = {}) {
  return {
    post: basePost(),
    translated_body: null,
    translated_caption: null,
    translated_title: null,
    song_presentation: null,
    ...overrides,
  } as never;
}

const community = {
  id: "com_test",
  object: "community_preview",
  display_name: "Preview Club",
  description: "A community with rich link previews.",
  avatar_ref: "https://media.test/avatar.png",
  banner_ref: "https://media.test/banner.jpg",
} as never;

describe("share metadata", () => {
  test("resolves entity SEO even without a recognizable bot user agent", () => {
    expect(shouldAlwaysResolveEntitySeo({ kind: "post" })).toBe(true);
    expect(shouldAlwaysResolveEntitySeo({ kind: "telegram-post" })).toBe(true);
    expect(shouldAlwaysResolveEntitySeo({ kind: "live-room" })).toBe(true);
    expect(shouldAlwaysResolveEntitySeo({ kind: "community" })).toBe(true);
    expect(shouldAlwaysResolveEntitySeo({ kind: "home" })).toBe(false);
  });

  test("preserves share and locale signals in the Open Graph URL", () => {
    const shareUrl = new URL("https://pirate.sc/p/pst_test?share=1");
    expect(resolveSharePreviewQueryValue(shareUrl)).toBe("1");
    expect(resolveSharePreviewQueryValue(new URL("https://pirate.sc/p/pst_test"))).toBe(null);

    expect(buildOpenGraphUrl("https://pirate.sc/p/pst_test", "en", false, null)).toBe(
      "https://pirate.sc/p/pst_test",
    );
    expect(buildOpenGraphUrl("https://pirate.sc/p/pst_test", "en", false, "1")).toBe(
      "https://pirate.sc/p/pst_test?share=1",
    );
    expect(buildOpenGraphUrl("https://pirate.sc/p/pst_test", "zh", true, "1")).toBe(
      "https://pirate.sc/p/pst_test?share=1&locale=zh-CN",
    );
  });

  test("uses a branded fallback image for communities without media", () => {
    const metadata = buildCommunitySeoMetadata({
      appOrigin: "https://pirate.sc",
      locale: "en",
      preview: {
        ...community,
        avatar_ref: null,
        banner_ref: null,
      },
    });

    expect(metadata.title).toBe("Preview Club • Pirate");
    expect(metadata.description).toBe("A community with rich link previews.");
    expect(metadata.imageUrl).toBe("https://pirate.sc/og/pirate-share-card.jpg");
    expect(metadata.imageType).toBe("image/jpeg");
    expect(metadata.imageWidth).toBe(1200);
    expect(metadata.imageHeight).toBe(630);
    expect(metadata.imageAlt).toBe("Preview Club on Pirate");
  });

  test("uses community-specific fallback copy when a community has no description", () => {
    const metadata = buildCommunitySeoMetadata({
      appOrigin: "https://pirate.sc",
      locale: "en",
      preview: {
        ...community,
        description: null,
      },
    });

    expect(metadata.title).toBe("Preview Club • Pirate");
    expect(metadata.description).toBe("A community on Pirate");
  });

  test("uses video poster metadata before community fallback", () => {
    const metadata = buildPostSeoMetadata({
      appOrigin: "https://pirate.sc",
      community,
      locale: "en",
      postResponse: postResponse({
        post: basePost({
          media_refs: [{
            storage_ref: "https://media.test/video.mp4",
            mime_type: "video/mp4",
            poster_ref: "https://media.test/poster.webp",
            poster_mime_type: "image/webp",
            poster_width: 1280,
            poster_height: 720,
          }],
          post_type: "video",
        }),
      }),
    });

    expect(metadata.title).toBe("Preview Club, a community on Pirate");
    expect(metadata.description).toBe("The body should become the share description.");
    expect(metadata.imageUrl).toBe(buildCloudflareShareImageUrl("https://pirate.sc", "https://media.test/poster.webp"));
    expect(metadata.imageType).toBe("image/jpeg");
    expect(metadata.imageWidth).toBe(1200);
    expect(metadata.imageHeight).toBe(630);
  });

  test("uses image post media before other image sources", () => {
    const metadata = buildPostSeoMetadata({
      appOrigin: "https://pirate.sc",
      community,
      locale: "en",
      postResponse: postResponse({
        post: basePost({
          link_og_image_url: "https://media.test/link.jpg",
          media_refs: [{
            storage_ref: "https://media.test/post-image.png",
            mime_type: "image/png",
          }],
          post_type: "image",
        }),
      }),
    });

    expect(metadata.title).toBe("Preview Club, a community on Pirate");
    expect(metadata.description).toBe("The body should become the share description.");
    expect(metadata.imageUrl).toBe(buildCloudflareShareImageUrl("https://pirate.sc", "https://media.test/post-image.png"));
    expect(metadata.imageType).toBe("image/jpeg");
  });

  test("uses likely image media when MIME is missing", () => {
    const metadata = buildPostSeoMetadata({
      appOrigin: "https://pirate.sc",
      community,
      locale: "en",
      postResponse: postResponse({
        post: basePost({
          media_refs: [{
            storage_ref: "https://media.test/post-image.jpg?signature=test",
            mime_type: null,
          }],
          post_type: "image",
        }),
      }),
    });

    expect(metadata.description).toBe("The body should become the share description.");
    expect(metadata.imageUrl).toBe(buildCloudflareShareImageUrl("https://pirate.sc", "https://media.test/post-image.jpg?signature=test"));
  });

  test("uses song cover art when a song has no image media", () => {
    const metadata = buildPostSeoMetadata({
      appOrigin: "https://pirate.sc",
      community,
      locale: "en",
      postResponse: postResponse({
        post: basePost({
          media_refs: [{
            storage_ref: "https://media.test/audio.mp3",
            mime_type: "audio/mpeg",
          }],
          post_type: "song",
          title: "Cover track",
        }),
        song_presentation: {
          title: "Cover track",
          cover_art_ref: "https://media.test/song-cover.jpg",
          duration_ms: 180000,
        },
      }),
    });

    expect(metadata.imageUrl).toBe(buildCloudflareShareImageUrl("https://pirate.sc", "https://media.test/song-cover.jpg"));
    expect(metadata.description).toBe("The body should become the share description.");
    expect(metadata.imageAlt).toBe("Cover track on Pirate");
  });

  test("uses link OG image before community fallback", () => {
    const metadata = buildPostSeoMetadata({
      appOrigin: "https://pirate.sc",
      community,
      locale: "en",
      postResponse: postResponse({
        post: basePost({
          link_og_image_url: "https://link-preview.test/card.jpg",
          post_type: "link",
        }),
      }),
    });

    expect(metadata.description).toBe("The body should become the share description.");
    expect(metadata.imageUrl).toBe(buildCloudflareShareImageUrl("https://pirate.sc", "https://link-preview.test/card.jpg"));
  });

  test("uses inline public post community fields without a separate community input", () => {
    const metadata = buildPostSeoMetadata({
      appOrigin: "https://pirate.sc",
      community: null,
      locale: "en",
      postResponse: postResponse({
        community,
        post: basePost({
          body: null,
          media_refs: [],
        }),
      }),
    });

    expect(metadata.title).toBe("Preview Club, a community on Pirate");
    expect(metadata.description).toBe("A proper preview");
    expect(metadata.imageUrl).toBe(buildCloudflareShareImageUrl("https://pirate.sc", "https://media.test/banner.jpg"));
  });

  test("uses social context title and media description when a media post has no body", () => {
    const metadata = buildPostSeoMetadata({
      appOrigin: "https://pirate.sc",
      community,
      locale: "en",
      postResponse: postResponse({
        post: basePost({
          body: null,
          caption: null,
          media_refs: [{
            storage_ref: "https://media.test/post-image.png",
            mime_type: "image/png",
          }],
          post_type: "image",
          title: "test",
        }),
      }),
    });

    expect(metadata.title).toBe("Preview Club, a community on Pirate");
    expect(metadata.description).toBe("test · Image post");
  });

  test("renders structured Open Graph and X image tags", () => {
    const markup = renderToStaticMarkup(
      <Document
        ctx={{
          canonicalUrl: "https://pirate.sc/p/pst_test",
          isIndexable: true,
          locale: "en",
          seoMetadata: {
            description: "Description",
            imageAlt: "Alt text",
            imageHeight: 630,
            imageType: "image/jpeg",
            imageUrl: "https://pirate.sc/og/pirate-share-card.jpg",
            imageWidth: 1200,
            title: "Title",
            type: "article",
            url: "https://pirate.sc/p/pst_test",
          },
        }}
        rw={{ nonce: "nonce" } as never}
      >
        <main />
      </Document>,
    );

    expect(markup).toContain('property="og:image" content="https://pirate.sc/og/pirate-share-card.jpg"');
    expect(markup).toContain('property="og:image:url" content="https://pirate.sc/og/pirate-share-card.jpg"');
    expect(markup).toContain('property="og:image:secure_url" content="https://pirate.sc/og/pirate-share-card.jpg"');
    expect(markup).toContain('property="og:image:type" content="image/jpeg"');
    expect(markup).toContain('property="og:image:width" content="1200"');
    expect(markup).toContain('property="og:image:height" content="630"');
    expect(markup).toContain('property="og:image:alt" content="Alt text"');
    expect(markup).toContain('itemProp="image" content="https://pirate.sc/og/pirate-share-card.jpg"');
    expect(markup).toContain('name="twitter:card" content="summary_large_image"');
    expect(markup).toContain('name="twitter:image:src" content="https://pirate.sc/og/pirate-share-card.jpg"');
    expect(markup).toContain('name="twitter:image:alt" content="Alt text"');
    expect(markup).toContain('rel="image_src" href="https://pirate.sc/og/pirate-share-card.jpg"');
  });

  test("renders the branded large-image card when route SEO is absent", () => {
    const markup = renderToStaticMarkup(
      <Document
        ctx={{
          appOrigin: "https://pirate.sc",
          canonicalUrl: "https://pirate.sc/p/pst_timeout",
          isIndexable: true,
          locale: "en",
          seoMetadata: null,
        }}
        rw={{ nonce: "nonce" } as never}
      >
        <main />
      </Document>,
    );

    expect(markup).toContain('name="twitter:card" content="summary_large_image"');
    expect(markup).toContain('property="og:image" content="https://pirate.sc/og/pirate-share-card.jpg"');
    expect(markup).toContain('property="og:image:type" content="image/jpeg"');
    expect(markup).toContain('property="og:image:width" content="1200"');
    expect(markup).toContain('property="og:image:height" content="630"');
  });

  test("does not render a generic social card for entity routes when SEO lookup misses", () => {
    const markup = renderToStaticMarkup(
      <Document
        ctx={{
          appOrigin: "https://pirate.sc",
          canonicalUrl: "https://pirate.sc/p/pst_timeout",
          expectsEntitySeoMetadata: true,
          isIndexable: true,
          locale: "en",
          seoMetadata: null,
        }}
        rw={{ nonce: "nonce" } as never}
      >
        <main />
      </Document>,
    );

    expect(markup).toContain("<title>Pirate</title>");
    expect(markup).toContain('rel="canonical" href="https://pirate.sc/p/pst_timeout"');
    expect(markup).not.toContain('property="og:title" content="Pirate"');
    expect(markup).not.toContain('property="og:image" content="https://pirate.sc/og/pirate-share-card.jpg"');
    expect(markup).not.toContain('name="twitter:image" content="https://pirate.sc/og/pirate-share-card.jpg"');
  });

  test("applies fallback dimensions when SEO returns the default image path", () => {
    const markup = renderToStaticMarkup(
      <Document
        ctx={{
          appOrigin: "https://pirate.sc",
          canonicalUrl: "https://pirate.sc/p/pst_default_image",
          isIndexable: true,
          locale: "en",
          seoMetadata: {
            description: "Description",
            imageUrl: "https://pirate.sc/og/pirate-share-card.jpg?cache=v1",
            title: "Title",
            type: "article",
            url: "https://pirate.sc/p/pst_default_image",
          },
        }}
        rw={{ nonce: "nonce" } as never}
      >
        <main />
      </Document>,
    );

    expect(markup).toContain('property="og:image:type" content="image/jpeg"');
    expect(markup).toContain('property="og:image:width" content="1200"');
    expect(markup).toContain('property="og:image:height" content="630"');
  });
});
