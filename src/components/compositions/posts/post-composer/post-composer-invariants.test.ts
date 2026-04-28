import * as BunTest from "bun:test";

import type { LiveComposerState } from "./post-composer.types";
import {
  deriveLiveStateForRoomKindChange,
  shouldClearSelectedQualifiers,
  shouldForcePublicIdentityForAuthor,
  shouldForcePublicIdentityForTab,
} from "./post-composer-invariants";

const { describe, expect, test } = BunTest;

function liveState(overrides: Partial<LiveComposerState> = {}): LiveComposerState {
  return {
    roomKind: "solo",
    accessMode: "free",
    visibility: "public",
    setlistItems: [],
    setlistStatus: "draft",
    performerAllocations: [{ userId: "host-1", role: "host", sharePct: 100 }],
    ...overrides,
  };
}

describe("post composer invariants", () => {
  test("forces public identity for anonymous tabs that become ineligible", () => {
    expect(shouldForcePublicIdentityForTab({
      activeTab: "song",
      identityMode: "anonymous",
      monetizationVisible: false,
    })).toBe(true);
    expect(shouldForcePublicIdentityForTab({
      activeTab: "video",
      identityMode: "anonymous",
      monetizationVisible: true,
    })).toBe(true);
    expect(shouldForcePublicIdentityForTab({
      activeTab: "image",
      identityMode: "anonymous",
      monetizationVisible: false,
    })).toBe(false);
    expect(shouldForcePublicIdentityForTab({
      activeTab: "song",
      identityMode: "public",
      monetizationVisible: false,
    })).toBe(false);
  });

  test("forces public identity for agent authors", () => {
    expect(shouldForcePublicIdentityForAuthor({
      authorMode: "agent",
      identityMode: "anonymous",
    })).toBe(true);
    expect(shouldForcePublicIdentityForAuthor({
      authorMode: "agent",
      identityMode: "public",
    })).toBe(false);
    expect(shouldForcePublicIdentityForAuthor({
      authorMode: "human",
      identityMode: "anonymous",
    })).toBe(false);
  });

  test("clears qualifiers when author or identity mode cannot carry them", () => {
    expect(shouldClearSelectedQualifiers({
      authorMode: "agent",
      identityMode: "anonymous",
      selectedQualifierCount: 1,
    })).toBe(true);
    expect(shouldClearSelectedQualifiers({
      authorMode: "human",
      identityMode: "public",
      selectedQualifierCount: 1,
    })).toBe(true);
    expect(shouldClearSelectedQualifiers({
      authorMode: "human",
      identity: { allowQualifiersOnAnonymousPosts: false },
      identityMode: "anonymous",
      selectedQualifierCount: 1,
    })).toBe(true);
    expect(shouldClearSelectedQualifiers({
      authorMode: "human",
      identity: { allowQualifiersOnAnonymousPosts: true },
      identityMode: "anonymous",
      selectedQualifierCount: 1,
    })).toBe(false);
    expect(shouldClearSelectedQualifiers({
      authorMode: "agent",
      identityMode: "anonymous",
      selectedQualifierCount: 0,
    })).toBe(false);
  });

  test("derives solo live allocation from a duet room transition", () => {
    expect(deriveLiveStateForRoomKindChange({
      current: liveState({
        guestUserId: "guest-1",
        roomKind: "solo",
        performerAllocations: [
          { userId: "host-1", role: "host", sharePct: 50 },
          { userId: "guest-1", role: "guest", sharePct: 50 },
        ],
      }),
      previousRoomKind: "duet",
    })).toEqual({
      roomKind: "solo",
      accessMode: "free",
      visibility: "public",
      setlistItems: [],
      setlistStatus: "draft",
      performerAllocations: [{ userId: "host-1", role: "host", sharePct: 100 }],
      guestUserId: undefined,
    });
  });

  test("derives duet live allocation from a solo room transition", () => {
    expect(deriveLiveStateForRoomKindChange({
      current: liveState({
        roomKind: "duet",
      }),
      previousRoomKind: "solo",
    })).toEqual({
      roomKind: "duet",
      accessMode: "free",
      visibility: "public",
      setlistItems: [],
      setlistStatus: "draft",
      performerAllocations: [
        { userId: "host-1", role: "host", sharePct: 50 },
        { userId: "", role: "guest", sharePct: 50 },
      ],
    });
  });

  test("does not derive live allocation when the room kind is unchanged", () => {
    expect(deriveLiveStateForRoomKindChange({
      current: liveState(),
      previousRoomKind: "solo",
    })).toBeNull();
  });
});
