import { describe, expect, test } from "bun:test";
import type { HomeFeedItem } from "@pirate/api-contracts";
import type { LocalizedPostResponse } from "@pirate/api-contracts";
import type { Profile } from "@pirate/api-contracts";

import { applyPostVote, toCommunityFeedItem, toHomeFeedItem } from "@/app/authenticated-route-renderer";
import { loadProfilesByUserId } from "@/app/authenticated-data/community-data";

function createEntry(): HomeFeedItem {
  return {
    community: {
      id: "com_cmt_alpha",
      object: "home_feed_community_summary",
      avatar_ref: null,
      display_name: "Alpha Crew",
      member_count: null,
      route_slug: "alpha",
    },
    post: {
      downvote_count: 2,
      like_count: 0,
      machine_translated: false,
      post: {
        anonymous_label: null,
        anonymous_scope: null,
        asset: null,
        access_mode: null,
        age_gate_policy: "none",
        analysis_result_ref: null,
        analysis_state: "allow",
        author_user: "usr_author",
        authorship_mode: "human_direct",
        body: "Body copy",
        caption: null,
        community: "cmt_alpha",
        content_safety_state: "safe",
        created: Date.parse("2026-04-18T10:00:00.000Z"),
        disclosed_qualifiers_json: null,
        identity_mode: "public",
        label_id: null,
        link_url: null,
        media_refs: undefined,
        parent_post_id: null,
        id: "pst_alpha",
        object: "post",
        post: "pst_alpha",
        post_type: "text",
        rights_basis: "none",
        song_artifact_bundle: null,
        song_mode: null,
        source_language: "en",
        status: "published",
        visibility: "public",
        title: "Hello world",
        translation_policy: "none",
      },
      resolved_locale: "en",
      source_hash: "src_test",
      thread_snapshot: {
        comment_count: 5,
        created: Date.parse("2026-04-18T10:30:00.000Z"),
        published_through_comment_created: Date.parse("2026-04-18T10:30:00.000Z"),
        snapshot_seq: 1,
        swarm_feed_ref: null,
        swarm_manifest_ref: "swm_test",
        thread_root_post: "pst_alpha",
        thread_root_post_id: "pst_alpha",
      },
      comment_count: 5,
      translated_body: null,
      translated_caption: null,
      translated_title: null,
      translation_state: "same_language",
      upvote_count: 11,
      viewer_reaction_kinds: [],
      viewer_vote: 1,
    } as unknown as LocalizedPostResponse,
  } as unknown as HomeFeedItem;
}

function createAuthorProfile(overrides: Partial<Profile> = {}): Profile {
  return {
    id: "usr_author",
    object: "profile",
    avatar_ref: null,
    bio: null,
    cover_ref: null,
    created: Date.parse("2026-04-18T10:00:00.000Z"),
    display_name: "Blackbeard",
    global_handle: {
      free_rename_consumed: false,
      id: "ghl_blackbeard",
      object: "global_handle",
      issuance_source: "generated_signup",
      issued_at: Date.parse("2026-04-18T10:00:00.000Z"),
      label: "sable-harbor-4143.pirate",
      replaced_at: null,
      status: "active",
      tier: "generated",
    },
    linked_handles: null,
    preferred_locale: null,
    primary_public_handle: null,
    primary_wallet_address: null,
    verification_capabilities: null,
    ...overrides,
  };
}

describe("toHomeFeedItem", () => {
  test("maps server home feed entries into home cards", () => {
    const item = toHomeFeedItem(createEntry(), {});

    expect(item.id).toBe("pst_alpha");
    expect(item.post.byline?.community?.href).toBe("/c/alpha");
    expect(item.post.byline?.community?.label).toBe("c/alpha");
    expect(item.post.engagement?.commentCount).toBe(5);
    expect(item.post.engagement?.score).toBe(9);
  });

  test("links home feed community bylines directly to canonical punycode routes", () => {
    const entry = createEntry();
    entry.community.route_slug = "@xn--t77hga";

    const item = toHomeFeedItem(entry, {});

    expect(item.post.byline?.community?.href).toBe("/c/@xn--t77hga");
    expect(item.post.byline?.community?.label).toBe("c/@🇵🇸");
  });

  test("passes home feed community avatars through to post cards", () => {
    const entry = createEntry();
    entry.community.avatar_ref = "https://media.pirate.test/community-avatar.png";

    const item = toHomeFeedItem(entry, {});

    expect(item.post.byline?.community?.avatarSrc).toBe("https://media.pirate.test/community-avatar.png");
  });

  test("uses live comment_count when the thread snapshot lags", () => {
    const entry = createEntry();
    entry.post.comment_count = 1;
    if (entry.post.thread_snapshot) {
      entry.post.thread_snapshot.comment_count = 0;
    }

    const item = toHomeFeedItem(entry, {});

    expect(item.post.engagement?.commentCount).toBe(1);
  });

  test("prefers disclosed qualifier snapshots over the label badge", () => {
    const entry = createEntry();
    entry.post.post.disclosed_qualifiers_json = [
      {
        qualifier_kind: "verification_capability",
        qualifier_source: "community_post",
        qualifier_template: "unique_human",
        redundancy_key: null,
        rendered_label: "Unique Human",
        sensitivity_level: null,
      },
      {
        qualifier_kind: "verification_capability",
        qualifier_source: "community_post",
        qualifier_template: "age_over_18",
        redundancy_key: null,
        rendered_label: "18+",
        sensitivity_level: null,
      },
    ];
    entry.post.label = { id: "lbl_legacy", object: "post_label", label: "Legacy Label", status: "active" };

    const item = toHomeFeedItem(entry, {});

    expect(item.post.qualifierLabels).toEqual(["Unique Human", "18+"]);
  });

  test("uses hydrated public handles before raw user id fallback", () => {
    const entry = createEntry();
    const authorProfile = createAuthorProfile();

    const item = toHomeFeedItem(entry, { usr_author: authorProfile });

    expect(item.post.byline?.author?.label).toBe("sable-harbor-4143.pirate");
  });

  test("prefers the primary public handle when one is selected", () => {
    const entry = createEntry();
    const authorProfile = createAuthorProfile({
      primary_public_handle: {
        kind: "ens",
        label: "blackbeard.eth",
        linked_handle: "lnk_blackbeard_ens",
        verification_state: "verified",
      },
    });

    const item = toHomeFeedItem(entry, { usr_author: authorProfile });

    expect(item.post.byline?.author?.label).toBe("blackbeard.eth");
  });

  test("renders an ENS primary byline after author profile hydration", async () => {
    const entry = createEntry();
    const authorProfile = createAuthorProfile({
      primary_public_handle: {
        kind: "ens",
        label: "blackbeard.eth",
        linked_handle: "lnk_blackbeard_ens",
        verification_state: "verified",
      },
    });
    const api = {
      profiles: {
        getByUserId: async (userId: string) => {
          expect(userId).toBe("usr_author");
          return authorProfile;
        },
      },
    } as unknown as Parameters<typeof loadProfilesByUserId>[0];

    const hydratedProfiles = await loadProfilesByUserId(api, [entry.post.post.author_user ?? ""]);
    const item = toHomeFeedItem(entry, hydratedProfiles);

    expect(item.post.byline?.author?.label).toBe("blackbeard.eth");
    expect(item.post.byline?.author?.href).toBe("/u/blackbeard.eth");
  });

  test("passes through an onVote handler when the container provides one", () => {
    const onVote = () => undefined;

    const item = toHomeFeedItem(createEntry(), {}, undefined, { onVote });

    expect(item.post.onVote).toBe(onVote);
  });

  test("passes through an onComment handler when the container provides one", () => {
    const onComment = () => undefined;

    const item = toHomeFeedItem(createEntry(), {}, undefined, { onComment });

    expect(item.post.onComment).toBe(onComment);
  });

  test("maps link post title and body onto the card", () => {
    const entry = createEntry();
    entry.post.post.post_type = "link";
    entry.post.post.title = "A real link title";
    entry.post.post.body = "My commentary on the link.";
    entry.post.post.link_url = "https://example.com/story";
    entry.post.post.link_og_title = "Publisher preview title";
    entry.post.post.link_enrichment = {
      version: 1,
      publisher: "Example News",
      published_at: "2026-04-29",
      summary: {
        status: "ready",
        summary_paragraph: "A longer neutral article summary.",
        short_summary: "Neutral article summary.",
        key_points: ["First key point.", "Second key point."],
      },
    };

    const item = toHomeFeedItem(entry, {});

    expect(item.post.title).toBe("A real link title");
    expect(item.post.content.type).toBe("link");
    if (item.post.content.type !== "link") throw new Error("expected link content");
    expect(item.post.content.body).toBe("My commentary on the link.");
    expect(item.post.content.previewTitle).toBe("Publisher preview title");
    expect(item.post.content.sourceLabel).toBe("example.com");
    expect(item.post.content.publishedLabel).toBe("Apr 29");
    expect(item.post.content.summary?.summaryParagraph).toBe("A longer neutral article summary.");
    expect(item.post.content.summary?.shortSummary).toBe("Neutral article summary.");
    expect(item.post.content.summary?.keyPoints).toEqual(["First key point.", "Second key point."]);
  });

  test("uses localized link enrichment when viewing original source text", () => {
    const entry = createEntry();
    entry.post.post.post_type = "link";
    entry.post.post.source_language = "ar";
    entry.post.post.title = "تقرير رويترز";
    entry.post.post.body = "تعليق عربي";
    entry.post.post.link_url = "https://www.reuters.com/world/story";
    entry.post.post.link_og_title = "Israel seizes Gaza aid ships";
    entry.post.post.link_enrichment = {
      version: 1,
      title: "Israel seizes Gaza aid ships",
      published_at: "2026-04-29",
      summary: {
        status: "ready",
        summary_paragraph: "A longer neutral article summary.",
        short_summary: "Neutral article summary.",
        key_points: ["Ships seized off Greece", "Israel cites blockade", "Turkey condemns move"],
      },
      translations: {
        ar: {
          locale: "ar",
          title: "إسرائيل تستولي على سفن مساعدات غزة",
          description: null,
          summary: {
            summary_paragraph: "ملخص عربي أطول للخبر.",
            short_summary: "ملخص عربي قصير.",
            key_points: ["مصادرة سفن قبالة اليونان", "إسرائيل تستند إلى الحصار", "تركيا تدين التحرك"],
          },
          generated_at: "2026-05-02T09:00:00.000Z",
          model: "test",
          provider: "openrouter",
        },
      },
    };
    entry.post.translation_state = "ready";
    entry.post.resolved_locale = "en";
    entry.post.translated_title = "Reuters report";
    entry.post.translated_body = "English commentary";

    const item = toHomeFeedItem(entry, {}, undefined, {
      showOriginalLabel: "Show original",
      showTranslationLabel: "Show translation",
    });

    expect(item.post.content.type).toBe("link");
    if (item.post.content.type !== "link") throw new Error("expected link content");
    expect(item.post.content.previewTitle).toBe("Israel seizes Gaza aid ships");
    expect(item.post.content.summary?.keyPoints).toEqual(["Ships seized off Greece", "Israel cites blockade", "Turkey condemns move"]);
    expect(item.postOriginal?.content.type).toBe("link");
    if (!item.postOriginal || item.postOriginal.content.type !== "link") throw new Error("expected original link content");
    expect(item.postOriginal.content.previewTitle).toBe("إسرائيل تستولي على سفن مساعدات غزة");
    expect(item.postOriginal.content.previewTitleDir).toBe("rtl");
    expect(item.postOriginal.content.summary?.summaryParagraph).toBe("ملخص عربي أطول للخبر.");
    expect(item.postOriginal.content.summary?.keyPoints).toEqual(["مصادرة سفن قبالة اليونان", "إسرائيل تستند إلى الحصار", "تركيا تدين التحرك"]);
  });

  test("uses source-language link enrichment for same-language link posts", () => {
    const entry = createEntry();
    entry.post.post.post_type = "link";
    entry.post.post.source_language = "ar";
    entry.post.post.title = "تقرير رويترز";
    entry.post.post.body = "تعليق عربي";
    entry.post.post.link_url = "https://www.reuters.com/world/story";
    entry.post.post.link_og_title = "Israel seizes Gaza aid ships";
    entry.post.post.link_enrichment = {
      version: 1,
      title: "Israel seizes Gaza aid ships",
      published_at: "2026-04-29",
      summary: {
        status: "ready",
        summary_paragraph: "A longer neutral article summary.",
        short_summary: "Neutral article summary.",
        key_points: ["Ships seized off Greece", "Israel cites blockade", "Turkey condemns move"],
      },
      translations: {
        ar: {
          locale: "ar",
          title: "إسرائيل تستولي على سفن مساعدات غزة",
          description: null,
          summary: {
            summary_paragraph: "ملخص عربي أطول للخبر.",
            short_summary: "ملخص عربي قصير.",
            key_points: ["مصادرة سفن مساعدات غزة", "المنظمون يصفونها بالقرصنة", "اليونان تطلب الانسحاب"],
          },
          generated_at: "2026-05-02T09:00:00.000Z",
          model: "test",
          provider: "openrouter",
        },
      },
    };
    entry.post.translation_state = "same_language";
    entry.post.resolved_locale = "ar";

    const item = toHomeFeedItem(entry, {});

    expect(item.post.content.type).toBe("link");
    if (item.post.content.type !== "link") throw new Error("expected link content");
    expect(item.post.content.previewTitle).toBe("إسرائيل تستولي على سفن مساعدات غزة");
    expect(item.post.content.previewTitleDir).toBe("rtl");
    expect(item.post.content.summary?.keyPoints).toEqual(["مصادرة سفن مساعدات غزة", "المنظمون يصفونها بالقرصنة", "اليونان تطلب الانسحاب"]);
    expect(item.post.content.summaryDir).toBe("rtl");
  });

  test("uses viewer-locale link enrichment even when post translation is policy-blocked", () => {
    const entry = createEntry();
    entry.post.post.post_type = "link";
    entry.post.post.source_language = "en";
    entry.post.post.title = "Morocco Probes Building Permit Failures in Fez After 22 Killed";
    entry.post.post.link_url = "https://example.ma/story";
    entry.post.post.link_og_title = "الداخلية تحقق في اختلالات رخص البناء والتعمير بفاس";
    entry.post.post.link_enrichment = {
      version: 1,
      title: "الداخلية تحقق في اختلالات رخص البناء والتعمير بفاس",
      source_language: "ar",
      published_at: "2026-05-05",
      summary: {
        status: "ready",
        summary_paragraph: "The Ministry of Interior is investigating construction irregularities in Fez.",
        short_summary: "The ministry opened a Fez building-permit probe.",
        key_points: ["Interior Ministry investigates Fez", "Probe follows 22 deaths", "Permits are under review"],
      },
      translations: {
        ar: {
          locale: "ar",
          title: "الداخلية تحقق في اختلالات رخص البناء والتعمير بفاس",
          description: null,
          summary: {
            summary_paragraph: "باشرت وزارة الداخلية تحقيقاً في اختلالات البناء والتعمير بفاس.",
            short_summary: "وزارة الداخلية تحقق في اختلالات البناء بفاس.",
            key_points: ["الداخلية تحقق في فاس", "التحقيق يأتي بعد 22 وفاة", "مراجعة رخص البناء"],
          },
          generated_at: "2026-05-05T11:08:00.000Z",
          model: "test",
          provider: "openrouter",
        },
      },
    };
    entry.post.translation_state = "policy_blocked";
    entry.post.resolved_locale = "ar";
    entry.post.translated_title = null;

    const item = toHomeFeedItem(entry, {}, undefined, { viewerContentLocale: "ar" });

    expect(item.post.title).toBe("الداخلية تحقق في اختلالات رخص البناء والتعمير بفاس");
    expect(item.post.titleDir).toBe("rtl");
    expect(item.post.content.type).toBe("link");
    if (item.post.content.type !== "link") throw new Error("expected link content");
    expect(item.post.content.previewTitle).toBe("الداخلية تحقق في اختلالات رخص البناء والتعمير بفاس");
    expect(item.post.content.summary?.summaryParagraph).toBe("باشرت وزارة الداخلية تحقيقاً في اختلالات البناء والتعمير بفاس.");
    expect(item.post.content.summary?.keyPoints).toEqual(["الداخلية تحقق في فاس", "التحقيق يأتي بعد 22 وفاة", "مراجعة رخص البناء"]);
    expect(item.post.content.summaryDir).toBe("rtl");
  });

  test("falls back to curated title for English viewers when source metadata is non-English", () => {
    const entry = createEntry();
    entry.post.post.post_type = "link";
    entry.post.post.source_language = "en";
    entry.post.post.title = "Morocco Probes Building Permit Failures in Fez After 22 Killed";
    entry.post.post.link_url = "https://example.ma/story";
    entry.post.post.link_og_title = "الداخلية تحقق في اختلالات رخص البناء والتعمير بفاس";
    entry.post.post.link_enrichment = {
      version: 1,
      title: "الداخلية تحقق في اختلالات رخص البناء والتعمير بفاس",
      source_language: "ar",
      published_at: "2026-05-05",
      summary: {
        status: "ready",
        summary_paragraph: "The Ministry of Interior is investigating construction irregularities in Fez.",
        short_summary: "The ministry opened a Fez building-permit probe.",
        key_points: ["Interior Ministry investigates Fez", "Probe follows 22 deaths", "Permits are under review"],
      },
    };
    entry.post.translation_state = "policy_blocked";
    entry.post.resolved_locale = "en";
    entry.post.translated_title = null;

    const item = toHomeFeedItem(entry, {}, undefined, { viewerContentLocale: "en" });

    expect(item.post.title).toBe("Morocco Probes Building Permit Failures in Fez After 22 Killed");
    expect(item.post.content.type).toBe("link");
    if (item.post.content.type !== "link") throw new Error("expected link content");
    expect(item.post.content.previewTitle).toBe("Morocco Probes Building Permit Failures in Fez After 22 Killed");
    expect(item.post.content.summary?.keyPoints).toEqual(["Interior Ministry investigates Fez", "Probe follows 22 deaths", "Permits are under review"]);
  });

  test("detects X link URLs client-side when backend embeds are missing", () => {
    const entry = createEntry();
    entry.post.post.post_type = "link";
    entry.post.post.title = "X post";
    entry.post.post.body = "Check this out.";
    entry.post.post.link_url = "https://x.com/EyeonPalestine/status/2051254727724208522";
    entry.post.post.embeds = undefined;

    const item = toHomeFeedItem(entry, {});

    expect(item.post.content.type).toBe("embed");
    if (item.post.content.type !== "embed") throw new Error("expected embed content");
    expect(item.post.content.provider).toBe("x");
    expect(item.post.content.state).toBe("embed");
    expect(item.post.content.canonicalUrl).toBe("https://x.com/EyeonPalestine/status/2051254727724208522");
    expect(item.post.content.renderMode).toBe("official");
  });

  test("forces X embed state to embed even when backend marks it unavailable", () => {
    const entry = createEntry();
    entry.post.post.post_type = "link";
    entry.post.post.title = "X post";
    entry.post.post.body = "Check this out.";
    entry.post.post.link_url = "https://x.com/EyeonPalestine/status/2051254727724208522";
    entry.post.post.embeds = [
      {
        embed_key: "x:2051254727724208522",
        provider: "x",
        provider_ref: "2051254727724208522",
        canonical_url: "https://x.com/EyeonPalestine/status/2051254727724208522",
        original_url: "https://x.com/EyeonPalestine/status/2051254727724208522",
        state: "unavailable",
        preview: null,
        oembed_html: null,
        oembed_cache_age: null,
        unavailable_reason: "unknown",
        checked_at: Date.parse("2026-04-18T10:00:00.000Z"),
      },
    ];

    const item = toHomeFeedItem(entry, {});

    expect(item.post.content.type).toBe("embed");
    if (item.post.content.type !== "embed") throw new Error("expected embed content");
    expect(item.post.content.provider).toBe("x");
    expect(item.post.content.state).toBe("embed");
  });

  test("maps video captions and original translated captions onto cards", () => {
    const entry = createEntry();
    entry.post.post.post_type = "video";
    entry.post.post.title = "Video title";
    entry.post.post.caption = "Original caption";
    entry.post.post.media_refs = [{ storage_ref: "https://media.test/video.mp4", mime_type: "video/mp4", size_bytes: 12 }];
    entry.post.translation_state = "ready";
    entry.post.resolved_locale = "en";
    entry.post.translated_caption = "Translated caption";

    const item = toHomeFeedItem(entry, {}, undefined, {
      showOriginalLabel: "Show original",
      showTranslationLabel: "Show translation",
    });

    expect(item.post.content.type).toBe("video");
    if (item.post.content.type !== "video") throw new Error("expected video content");
    expect(item.post.content.caption).toBe("Translated caption");
    expect(item.postOriginal?.content.type).toBe("video");
    if (!item.postOriginal || item.postOriginal.content.type !== "video") throw new Error("expected original video content");
    expect(item.postOriginal.content.caption).toBe("Original caption");
  });

  test("maps song captions and original translated captions onto cards", () => {
    const entry = createEntry();
    entry.post.post.post_type = "song";
    entry.post.post.title = "Song title";
    entry.post.post.caption = "Original caption";
    entry.post.post.media_refs = [{ storage_ref: "https://media.test/song.mp3", mime_type: "audio/mpeg", size_bytes: 12 }];
    entry.post.translation_state = "ready";
    entry.post.resolved_locale = "en";
    entry.post.translated_caption = "Translated caption";

    const item = toHomeFeedItem(entry, {}, undefined, {
      showOriginalLabel: "Show original",
      showTranslationLabel: "Show translation",
    });

    expect(item.post.content.type).toBe("song");
    if (item.post.content.type !== "song") throw new Error("expected song content");
    expect(item.post.content.caption).toBe("Translated caption");
    expect(item.postOriginal?.content.type).toBe("song");
    if (!item.postOriginal || item.postOriginal.content.type !== "song") throw new Error("expected original song content");
    expect(item.postOriginal.content.caption).toBe("Original caption");
  });
});

describe("toCommunityFeedItem", () => {
  test("keeps community thread counts and comment actions on feed cards", () => {
    const onComment = () => undefined;

    const item = toCommunityFeedItem(createEntry().post, {}, undefined, { onComment });

    expect(item.post.engagement?.commentCount).toBe(5);
    expect(item.post.onComment).toBe(onComment);
  });

  test("uses live comment_count for community cards when the snapshot lags", () => {
    const entry = createEntry();
    entry.post.comment_count = 1;
    if (entry.post.thread_snapshot) {
      entry.post.thread_snapshot.comment_count = 0;
    }

    const item = toCommunityFeedItem(entry.post, {});

    expect(item.post.engagement?.commentCount).toBe(1);
  });
});

describe("applyPostVote", () => {
  test("moves counts when changing an upvote into a downvote", () => {
    const entry = createEntry();

    const updated = applyPostVote(entry.post, -1);

    expect(updated.viewer_vote).toBe(-1);
    expect(updated.upvote_count).toBe(10);
    expect(updated.downvote_count).toBe(3);
  });

  test("supports clearing a local vote snapshot for rollback", () => {
    const entry = createEntry();

    const updated = applyPostVote(entry.post, null);

    expect(updated.viewer_vote).toBe(null);
    expect(updated.upvote_count).toBe(10);
    expect(updated.downvote_count).toBe(2);
  });
});
import "@/test/setup-runtime";
