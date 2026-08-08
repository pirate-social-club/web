import "@/test/setup-runtime";

import { afterEach, describe, expect, test } from "bun:test";

import {
  clearVideoViewerReturnState,
  currentRelativePath,
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

  test("resolves a path without a window, as during server render", () => {
    const descriptor = Object.getOwnPropertyDescriptor(globalThis, "window");
    // @ts-expect-error -- emulating the worker server-render global, which has no window.
    delete globalThis.window;
    try {
      expect(() => currentRelativePath()).not.toThrow();
      expect(currentRelativePath()).toBe("");
      expect(readVideoViewerReturnState(currentRelativePath())).toBeNull();
    } finally {
      if (descriptor) Object.defineProperty(globalThis, "window", descriptor);
    }
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
