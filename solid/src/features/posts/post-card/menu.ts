// Song download policy and header-menu derivation, extracted from the React
// post-card.tsx so the composition stays a thin renderer. Icons travel as
// markers (`PostCardMenuIcon`); the action menu maps them to SVGs.

import type {
  DownloadPolicy,
  PostCardContent,
  PostCardMenuItem,
  StemAccessPolicy,
  StemKind,
  StemSpec,
} from "./types";

type SongContent = Extract<PostCardContent, { type: "song" }>;

export interface DerivedSongMenuAction {
  category: "metadata" | "download";
  item: PostCardMenuItem;
  onAction: () => void;
}

export function getEffectiveDownloadPolicy(content: SongContent): DownloadPolicy {
  if (content.downloadPolicy) return content.downloadPolicy;

  if (content.accessMode === "public") {
    return "stream_only";
  }

  if (content.listingMode === "listed" && content.listingStatus === "active") {
    return "purchased_download";
  }

  return "stream_only";
}

function stemKindLabel(kind: StemKind): string {
  switch (kind) {
    case "instrumental":
      return "instrumental";
    case "vocals":
      return "vocals";
    case "drums":
      return "drums";
    case "bass":
      return "bass";
    case "other":
      return "stem";
    default:
      return "stem";
  }
}

function stemLabel(stem: StemSpec): string {
  return stem.label ?? stemKindLabel(stem.kind);
}

export function resolveStemAccessPolicy(stem: StemSpec, songPolicy: DownloadPolicy): StemAccessPolicy {
  if (stem.accessPolicy !== "inherit") {
    return stem.accessPolicy;
  }

  if (songPolicy === "free_download") {
    return "free";
  }

  if (songPolicy === "purchased_download") {
    return "purchasers_only";
  }

  return "unavailable";
}

export function canDownloadStem(
  stem: StemSpec,
  content: SongContent,
  songPolicy: DownloadPolicy,
): boolean {
  if (!stem.onDownload) return false;

  const resolvedPolicy = resolveStemAccessPolicy(stem, songPolicy);
  if (resolvedPolicy === "unavailable") return false;
  if (resolvedPolicy === "free") return true;

  return stem.accessPolicy === "inherit" && songPolicy === "purchased_download"
    ? content.hasEntitlement === true || content.entitledStems?.includes(stem.kind) === true
    : content.entitledStems?.includes(stem.kind) === true;
}

function openExternalUrl(url: string) {
  if (typeof window === "undefined") return;

  const opened = window.open(url, "_blank", "noopener,noreferrer");
  if (opened) {
    opened.opener = null;
  }
}

/**
 * Header menu merge: regular items, derived song metadata rows, derived
 * download rows (separator before the first when anything precedes them), and
 * the destructive delete item pinned last.
 */
export function mergePostCardMenuItems(
  menuItems: PostCardMenuItem[] | undefined,
  derivedActions: DerivedSongMenuAction[],
): PostCardMenuItem[] {
  const regularMenuItems = (menuItems ?? []).filter((item) => item.key !== "delete");
  const deleteMenuItems = (menuItems ?? []).filter((item) => item.key === "delete");
  const metadataItems = derivedActions
    .filter((action) => action.category === "metadata")
    .map((action) => action.item);
  const downloadActions = derivedActions.filter((action) => action.category === "download");
  const firstDownloadNeedsSeparator = downloadActions.length > 0
    && (regularMenuItems.length > 0 || metadataItems.length > 0);
  const downloadItems = downloadActions.map((action, index) => ({
    ...action.item,
    icon: action.item.icon ?? ("download" as const),
    separatorBefore: action.item.separatorBefore || (index === 0 && firstDownloadNeedsSeparator),
  }));

  return [
    ...regularMenuItems,
    ...metadataItems,
    ...downloadItems,
    ...deleteMenuItems,
  ];
}

export function deriveSongHeaderMenuActions(content: PostCardContent): DerivedSongMenuAction[] {
  if (content.type !== "song") return [];

  const actions: DerivedSongMenuAction[] = [];
  if (content.annotationsUrl) {
    const url = content.annotationsUrl;
    actions.push({
      category: "metadata",
      item: {
        key: "song-annotations:genius",
        label: "View on Genius",
        icon: "external",
      },
      onAction: () => openExternalUrl(url),
    });
  }

  const proofs = content.storageProofs;
  if (proofs?.original && (content.accessMode === "public" || content.hasEntitlement)) {
    const { gatewayUrl } = proofs.original;
    actions.push({
      category: "metadata",
      item: {
        key: "song-ipfs:view:original",
        label: "View on IPFS",
        icon: "external",
      },
      onAction: () => openExternalUrl(gatewayUrl),
    });
  }

  if (proofs?.preview && content.accessMode === "locked" && !content.hasEntitlement) {
    const { gatewayUrl } = proofs.preview;
    actions.push({
      category: "metadata",
      item: {
        key: "song-ipfs:view:preview",
        label: "View on IPFS",
        icon: "external",
      },
      onAction: () => openExternalUrl(gatewayUrl),
    });
  }

  if (proofs?.encryptedOriginal) {
    const { gatewayUrl } = proofs.encryptedOriginal;
    actions.push({
      category: "metadata",
      item: {
        key: "song-ipfs:view:encrypted-original",
        label: "View encrypted file on IPFS",
        icon: "external",
      },
      onAction: () => openExternalUrl(gatewayUrl),
    });
  }

  const songPolicy = getEffectiveDownloadPolicy(content);
  const canDownloadOriginal = Boolean(
    content.onDownload
    && (
      songPolicy === "free_download"
      || (songPolicy === "purchased_download" && content.hasEntitlement === true)
    ),
  );

  if (canDownloadOriginal && content.onDownload) {
    actions.push({
      category: "download",
      item: {
        key: "song-download:original",
        label: "Download original",
      },
      onAction: content.onDownload,
    });
  }

  for (const [index, stem] of (content.stems ?? []).entries()) {
    if (!canDownloadStem(stem, content, songPolicy) || !stem.onDownload) continue;

    actions.push({
      category: "download",
      item: {
        key: `song-download:stem:${stem.kind}:${index}`,
        label: `Download ${stemLabel(stem)}`,
      },
      onAction: stem.onDownload,
    });
  }

  return actions;
}

/** Resolves a menu key against the derived song actions; returns true when the
    key was consumed by a derived action. */
export function runDerivedMenuAction(
  key: string,
  derivedActions: readonly DerivedSongMenuAction[],
): boolean {
  const derivedAction = derivedActions.find((action) => action.item.key === key);
  if (!derivedAction) return false;
  derivedAction.onAction();
  return true;
}
