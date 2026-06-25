import { describe, expect, test } from "bun:test";

import {
  buildCreatePostComposerActions,
  buildCreatePostComposerDraft,
  type CreatePostStateWithCommunity,
} from "@/app/authenticated-helpers/create-post-composer-props";

// Guards the route-to-composer wiring: if create-post-route stops mapping
// royaltySplit / onRoyaltySplitChange (findings #1), these assertions fail
// because the route delegates to these adapters.
function mockState(overrides: Record<string, unknown>): CreatePostStateWithCommunity {
  return {
    community: {},
    session: undefined,
    ...overrides,
  } as unknown as CreatePostStateWithCommunity;
}

describe("buildCreatePostComposerDraft", () => {
  test("passes royaltySplit through to the composer draft", () => {
    const royaltySplit = { allocations: [{ id: "creator", recipientKind: "creator", walletAddress: "0xabc", sharePct: 100 }] };
    const draft = buildCreatePostComposerDraft(mockState({ royaltySplit }));
    expect(draft.royaltySplit).toBe(royaltySplit);
  });

  test("passes undefined royaltySplit through unchanged (single-owner default)", () => {
    const draft = buildCreatePostComposerDraft(mockState({ royaltySplit: undefined }));
    expect(draft.royaltySplit).toBeUndefined();
  });
});

describe("buildCreatePostComposerActions", () => {
  test("wires onRoyaltySplitChange to the state setter", () => {
    const onRoyaltySplitChange = () => {};
    const actions = buildCreatePostComposerActions(mockState({ onRoyaltySplitChange }));
    expect(actions.onRoyaltySplitChange).toBe(onRoyaltySplitChange);
  });
});
