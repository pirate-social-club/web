import { afterEach, describe, expect, test } from "bun:test";

import {
  buildStoryLicenseReuseNotice,
  formatStoryLicenseTerms,
  rememberStoryLicenseReuseNotice,
  takeStoryLicenseReuseNotice,
} from "./story-license-reuse-notice";
import type { Asset as ApiAsset } from "@pirate/api-contracts";

const originalSessionStorage = globalThis.sessionStorage;

function installSessionStorage() {
  const records = new Map<string, string>();
  const storage: Storage = {
    get length() {
      return records.size;
    },
    clear: () => records.clear(),
    getItem: (key: string) => records.get(key) ?? null,
    key: (index: number) => Array.from(records.keys())[index] ?? null,
    removeItem: (key: string) => {
      records.delete(key);
    },
    setItem: (key: string, value: string) => {
      records.set(key, value);
    },
  };
  Object.defineProperty(globalThis, "sessionStorage", {
    configurable: true,
    value: storage,
  });
  return records;
}

function asset(overrides: Partial<ApiAsset>): ApiAsset {
  return {
    id: "ast_1",
    object: "asset",
    community: "com_1",
    source_post: "post_1",
    creator_user: "usr_1",
    asset_kind: "song_audio",
    rights_basis: "original",
    access_mode: "public",
    license_preset: "commercial-remix",
    commercial_rev_share_pct: 10,
    primary_content_ref: "storage://song.wav",
    publication_status: "story_published",
    story_status: "published",
    story_royalty_registration_status: "registered",
    locked_delivery_status: "none",
    created: 1,
    ...overrides,
  };
}

afterEach(() => {
  Object.defineProperty(globalThis, "sessionStorage", {
    configurable: true,
    value: originalSessionStorage,
  });
});

describe("story license reuse notice", () => {
  test("formats commercial remix terms with royalty", () => {
    expect(formatStoryLicenseTerms({
      licensePreset: "commercial-remix",
      commercialRevSharePct: 15,
    })).toBe("Commercial remix, 15% royalty");
  });

  test("builds a notice when returned asset terms differ from submitted terms", () => {
    const notice = buildStoryLicenseReuseNotice({
      submittedLicense: { presetId: "commercial-use" },
      asset: asset({
        license_preset: "commercial-remix",
        commercial_rev_share_pct: 10,
      }),
    });

    expect(notice?.label).toBe("Story license reused");
    expect(notice?.description).toContain("Commercial remix, 10% royalty");
  });

  test("does not build a notice when returned asset terms match submitted terms", () => {
    expect(buildStoryLicenseReuseNotice({
      submittedLicense: { presetId: "commercial-remix", commercialRevSharePct: 10 },
      asset: asset({
        license_preset: "commercial-remix",
        commercial_rev_share_pct: 10,
      }),
    })).toBeNull();
  });

  test("takes stored notices once", () => {
    installSessionStorage();
    const notice = {
      label: "Story license reused",
      description: "This upload reused an existing Story registration.",
    };

    rememberStoryLicenseReuseNotice("post_1", notice);

    expect(takeStoryLicenseReuseNotice("post_1")).toEqual(notice);
    expect(takeStoryLicenseReuseNotice("post_1")).toBeNull();
  });
});
