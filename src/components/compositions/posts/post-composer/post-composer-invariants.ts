import type {
  AuthorMode,
  ComposerIdentityState,
  ComposerTab,
  IdentityMode,
  LiveComposerState,
  LiveRoomKind,
} from "./post-composer.types";
import { anonymousEligibleTabs } from "./post-composer-config";

export function shouldForcePublicIdentityForTab({
  activeTab,
  identityMode,
  monetizationVisible,
}: {
  activeTab: ComposerTab;
  identityMode: IdentityMode;
  monetizationVisible: boolean;
}) {
  return (
    identityMode === "anonymous"
    && (
      !anonymousEligibleTabs.includes(activeTab)
      || (activeTab === "video" && monetizationVisible)
    )
  );
}

export function shouldForcePublicIdentityForAuthor({
  authorMode,
  identityMode,
}: {
  authorMode: AuthorMode;
  identityMode: IdentityMode;
}) {
  return authorMode === "agent" && identityMode !== "public";
}

export function shouldClearSelectedQualifiers({
  authorMode,
  identity,
  identityMode,
  selectedQualifierCount,
}: {
  authorMode: AuthorMode;
  identity?: ComposerIdentityState;
  identityMode: IdentityMode;
  selectedQualifierCount: number;
}) {
  return (
    selectedQualifierCount > 0
    && (
      authorMode === "agent"
      || identityMode !== "anonymous"
      || (
        identityMode === "anonymous"
        && identity?.allowQualifiersOnAnonymousPosts === false
      )
    )
  );
}

export function deriveLiveStateForRoomKindChange({
  current,
  previousRoomKind,
}: {
  current: LiveComposerState;
  previousRoomKind: LiveRoomKind;
}): LiveComposerState | null {
  if (current.roomKind === previousRoomKind) {
    return null;
  }

  const hostAlloc = current.performerAllocations.find((allocation) => allocation.role === "host");
  if (!hostAlloc) {
    return null;
  }

  if (current.roomKind === "solo") {
    return {
      ...current,
      performerAllocations: [{ ...hostAlloc, sharePct: 100 }],
      guestUserId: undefined,
    };
  }

  if (current.roomKind === "duet") {
    return {
      ...current,
      performerAllocations: [
        { ...hostAlloc, sharePct: 50 },
        { userId: "", role: "guest", sharePct: 50 },
      ],
    };
  }

  return null;
}
