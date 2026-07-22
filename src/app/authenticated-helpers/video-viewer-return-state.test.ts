import "@/test/setup-runtime";

import { afterEach, describe, expect, test } from "bun:test";

import {
  clearVideoViewerReturnState,
  readVideoViewerReturnState,
  safeReturnPath,
  saveVideoViewerReturnState,
} from "./video-viewer-return-state";

const values = new Map<string, string>();
Object.defineProperty(window, "sessionStorage", {
  configurable: true,
  value: {
    getItem: (key: string) => values.get(key) ?? null,
    removeItem: (key: string) => values.delete(key),
    setItem: (key: string, value: string) => values.set(key, value),
  },
});

afterEach(() => {
  clearVideoViewerReturnState();
  values.clear();
});

describe("video viewer return state", () => {
  test("accepts only same-origin relative return paths", () => {
    expect(safeReturnPath("/?sort=new#post")).toBe("/?sort=new#post");
    expect(safeReturnPath("//attacker.test/path")).toBeNull();
    expect(safeReturnPath("https://attacker.test/path")).toBeNull();
  });

  test("restores a matching, recent snapshot", () => {
    const state = {
      createdAt: 1_000,
      itemId: "video_2",
      muted: false,
      paused: true,
      playbackSeconds: 18.25,
      returnPath: "/?sort=new",
      scrollY: 420,
    };
    saveVideoViewerReturnState(state);

    expect(readVideoViewerReturnState("/?sort=new", 2_000)).toEqual(state);
    expect(readVideoViewerReturnState("/elsewhere", 2_000)).toBeNull();
    expect(readVideoViewerReturnState("/?sort=new", 1_000 + 31 * 60 * 1_000)).toBeNull();
  });
});
