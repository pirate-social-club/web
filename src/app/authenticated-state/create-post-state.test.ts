import { describe, expect, test } from "bun:test";

import {
  buildDerivativeSourceSearchOptions,
  buildLiveDerivativeSourceSearchOptions,
  derivativeSourceToComposerReference,
  shouldSearchDerivativeSongSources,
} from "./create-post-state";
import type { ApiDerivativeSource } from "@/lib/api/client-api-types";

describe("create post derivative source search", () => {
  test("preserves typed query for server-backed source search", () => {
    expect(buildDerivativeSourceSearchOptions(" Travel Guide ")).toEqual({
      kind: "song",
      scope: "global",
      q: "Travel Guide",
      limit: 25,
    });
  });

  test("normalizes blank source search query to initial load", () => {
    expect(buildDerivativeSourceSearchOptions("   ")).toEqual({
      kind: "song",
      scope: "global",
      q: null,
      limit: 25,
    });
  });

  test("requests global derivative sources for live room setlists", () => {
    expect(buildLiveDerivativeSourceSearchOptions()).toEqual({
      kind: "live",
      scope: "global",
      limit: 25,
    });
  });

  test("uses canonical Story refs for globally searched remix sources", () => {
    const source: ApiDerivativeSource = {
      id: "asset_ast_source_song",
      object: "derivative_source",
      community: "com_cmt_source",
      asset: "asset_ast_source_song",
      source_ref: "story:ip:0x1111111111111111111111111111111111111111#licenseTermsId=17",
      title: "Source Song",
      kind: "song",
      story_ip: "0x1111111111111111111111111111111111111111",
      story_license_terms: "17",
      license_preset: "commercial-remix",
      commercial_rev_share_pct: 10,
      creator_user: "usr_artist",
    };

    expect(derivativeSourceToComposerReference(source).id).toBe(
      "story:ip:0x1111111111111111111111111111111111111111#licenseTermsId=17",
    );
  });

  test("searches song sources for remixes and video uses-song declarations", () => {
    expect(shouldSearchDerivativeSongSources({
      composerMode: "song",
      derivativeStep: undefined,
      songMode: "remix",
    })).toBe(true);

    expect(shouldSearchDerivativeSongSources({
      composerMode: "video",
      derivativeStep: {
        visible: true,
        trigger: "uses_song",
      },
      songMode: "original",
    })).toBe(true);

    expect(shouldSearchDerivativeSongSources({
      composerMode: "video",
      derivativeStep: {
        visible: true,
        trigger: "remix",
      },
      songMode: "original",
    })).toBe(false);
  });
});
