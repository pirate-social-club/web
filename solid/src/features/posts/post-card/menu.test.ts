import { describe, expect, test } from "bun:test";

import {
  canDownloadStem,
  deriveSongHeaderMenuActions,
  getEffectiveDownloadPolicy,
  mergePostCardMenuItems,
  resolveStemAccessPolicy,
  runDerivedMenuAction,
} from "./menu";
import type { SongContentSpec, StemSpec } from "./types";

const noop = () => undefined;

function song(overrides: Partial<SongContentSpec> = {}): SongContentSpec {
  return {
    type: "song",
    accessMode: "public",
    title: "Track",
    ...overrides,
  };
}

describe("getEffectiveDownloadPolicy", () => {
  test("explicit policy wins", () => {
    expect(getEffectiveDownloadPolicy(song({ downloadPolicy: "free_download" }))).toBe("free_download");
  });

  test("public songs default to stream-only", () => {
    expect(getEffectiveDownloadPolicy(song())).toBe("stream_only");
  });

  test("listed+active locked songs default to purchased downloads", () => {
    expect(getEffectiveDownloadPolicy(song({
      accessMode: "locked",
      listingMode: "listed",
      listingStatus: "active",
    }))).toBe("purchased_download");
  });

  test("locked unlisted songs stay stream-only", () => {
    expect(getEffectiveDownloadPolicy(song({ accessMode: "locked" }))).toBe("stream_only");
  });
});

describe("stem access resolution", () => {
  const stem = (overrides: Partial<StemSpec> = {}): StemSpec => ({
    kind: "instrumental",
    accessPolicy: "inherit",
    onDownload: noop,
    ...overrides,
  });

  test("inherit resolves against the song policy", () => {
    expect(resolveStemAccessPolicy(stem(), "free_download")).toBe("free");
    expect(resolveStemAccessPolicy(stem(), "purchased_download")).toBe("purchasers_only");
    expect(resolveStemAccessPolicy(stem(), "stream_only")).toBe("unavailable");
  });

  test("explicit stem policies win over the song policy", () => {
    expect(resolveStemAccessPolicy(stem({ accessPolicy: "free" }), "stream_only")).toBe("free");
    expect(resolveStemAccessPolicy(stem({ accessPolicy: "unavailable" }), "free_download")).toBe("unavailable");
  });

  test("download requires a handler and a passing policy", () => {
    expect(canDownloadStem(stem({ onDownload: undefined }), song(), "free_download")).toBe(false);
    expect(canDownloadStem(stem(), song(), "stream_only")).toBe(false);
    expect(canDownloadStem(stem(), song(), "free_download")).toBe(true);
  });

  test("inherited purchasers-only stems need entitlement", () => {
    const content = song({ accessMode: "locked", hasEntitlement: true });
    expect(canDownloadStem(stem(), content, "purchased_download")).toBe(true);
    expect(canDownloadStem(stem(), song({ accessMode: "locked" }), "purchased_download")).toBe(false);
    expect(canDownloadStem(
      stem({ accessPolicy: "purchasers_only" }),
      song({ accessMode: "locked", entitledStems: ["instrumental"] }),
      "purchased_download",
    )).toBe(true);
  });
});

describe("deriveSongHeaderMenuActions", () => {
  test("non-song content derives nothing", () => {
    expect(deriveSongHeaderMenuActions({ type: "text", body: "hi" })).toEqual([]);
  });

  test("derives annotations and IPFS proof links as metadata actions", () => {
    const actions = deriveSongHeaderMenuActions(song({
      annotationsUrl: "https://genius.com/1",
      storageProofs: {
        original: { cid: "c1", gatewayUrl: "https://dweb.link/ipfs/c1" },
        encryptedOriginal: { cid: "c2", gatewayUrl: "https://dweb.link/ipfs/c2" },
      },
    }));

    expect(actions.map((action) => action.item.key)).toEqual([
      "song-annotations:genius",
      "song-ipfs:view:original",
      "song-ipfs:view:encrypted-original",
    ]);
    expect(actions.every((action) => action.category === "metadata")).toBe(true);
    expect(actions.every((action) => action.item.icon === "external")).toBe(true);
  });

  test("preview proof only shows for locked songs without entitlement", () => {
    const locked = deriveSongHeaderMenuActions(song({
      accessMode: "locked",
      storageProofs: { preview: { cid: "c3", gatewayUrl: "https://dweb.link/ipfs/c3" } },
    }));
    expect(locked.map((action) => action.item.key)).toEqual(["song-ipfs:view:preview"]);

    const owned = deriveSongHeaderMenuActions(song({
      accessMode: "locked",
      hasEntitlement: true,
      storageProofs: { preview: { cid: "c3", gatewayUrl: "https://dweb.link/ipfs/c3" } },
    }));
    expect(owned).toEqual([]);
  });

  test("derives original and stem downloads with entitlement checks", () => {
    const actions = deriveSongHeaderMenuActions(song({
      accessMode: "locked",
      hasEntitlement: true,
      listingMode: "listed",
      listingStatus: "active",
      onDownload: noop,
      entitledStems: ["vocals"],
      stems: [
        { kind: "instrumental", accessPolicy: "inherit", onDownload: noop },
        { kind: "vocals", label: "Acapella", accessPolicy: "purchasers_only", onDownload: noop },
        { kind: "drums", accessPolicy: "purchasers_only", onDownload: noop },
      ],
    }));

    expect(actions.map((action) => action.item.key)).toEqual([
      "song-download:original",
      "song-download:stem:instrumental:0",
      "song-download:stem:vocals:1",
    ]);
    expect(actions[2]!.item.label).toBe("Download Acapella");
    expect(actions.every((action) => action.category === "download")).toBe(true);
  });

  test("runDerivedMenuAction consumes derived keys only", () => {
    let ran = "";
    const actions = deriveSongHeaderMenuActions(song({ onDownload: noop, downloadPolicy: "free_download" }));
    expect(runDerivedMenuAction("song-download:original", actions)).toBe(true);
    expect(runDerivedMenuAction("save", actions)).toBe(false);
    expect(ran).toBe("");
  });
});

describe("mergePostCardMenuItems", () => {
  test("pins delete last and separates the download group", () => {
    const merged = mergePostCardMenuItems(
      [
        { key: "save", label: "Save post" },
        { key: "delete", label: "Delete", destructive: true },
      ],
      [
        {
          category: "metadata",
          item: { key: "song-annotations:genius", label: "View on Genius", icon: "external" },
          onAction: noop,
        },
        {
          category: "download",
          item: { key: "song-download:original", label: "Download original" },
          onAction: noop,
        },
      ],
    );

    expect(merged.map((item) => item.key)).toEqual([
      "save",
      "song-annotations:genius",
      "song-download:original",
      "delete",
    ]);
    expect(merged[2]!.icon).toBe("download");
    expect(merged[2]!.separatorBefore).toBe(true);
  });

  test("no separator when downloads are the only items", () => {
    const merged = mergePostCardMenuItems(undefined, [
      {
        category: "download",
        item: { key: "song-download:original", label: "Download original" },
        onAction: noop,
      },
    ]);
    expect(merged[0]!.separatorBefore).toBe(false);
  });
});
