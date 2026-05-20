import { describe, expect, test } from "bun:test";

import { buildDerivativeSourceSearchOptions, derivativeSourceToComposerReference } from "./create-post-state";
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

  test("uses direct Story parent refs for remix source search results", () => {
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

    expect(derivativeSourceToComposerReference(source, { preferDirectStoryRef: true }).id)
      .toBe("story:ip:0x1111111111111111111111111111111111111111#licenseTermsId=17");
    expect(derivativeSourceToComposerReference(source).id).toBe("story:asset:asset_ast_source_song");
  });
});
