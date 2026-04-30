import { describe, expect, test } from "bun:test";

import {
  defaultAudienceState,
  defaultAssetLicenseState,
  defaultCharityContributionState,
  defaultMonetizationState,
  defaultSongState,
  defaultVideoState,
} from "@/components/compositions/posts/post-composer/post-composer-config";
import type { CreatePostDraftState } from "@/app/authenticated-state/create-post-draft-state";

import { resolveGlobalCreatePostCanContinue } from "./misc-routes";

function createDraft(overrides: Partial<CreatePostDraftState> = {}): CreatePostDraftState {
  return {
    audience: defaultAudienceState(),
    authorMode: "human",
    body: "",
    caption: "",
    charityContribution: defaultCharityContributionState(),
    composerMode: "text",
    derivativeStep: undefined,
    identityMode: "public",
    imageUpload: null,
    imageUploadLabel: undefined,
    linkUrl: "",
    license: defaultAssetLicenseState(),
    lyrics: "",
    monetizationState: defaultMonetizationState(),
    pendingSongBundleId: null,
    selectedQualifierIds: [],
    songMode: "original",
    songState: defaultSongState(),
    submitError: null,
    title: "",
    videoState: defaultVideoState(),
    ...overrides,
  };
}

describe("resolveGlobalCreatePostCanContinue", () => {
  test("allows schemeless links before a community is selected", () => {
    expect(resolveGlobalCreatePostCanContinue(createDraft({
      composerMode: "link",
      linkUrl: "example.com/story",
    }))).toBe(true);
  });

  test("rejects invalid links before a community is selected", () => {
    expect(resolveGlobalCreatePostCanContinue(createDraft({
      composerMode: "link",
      linkUrl: "sdkljfn",
    }))).toBe(false);
  });
});
