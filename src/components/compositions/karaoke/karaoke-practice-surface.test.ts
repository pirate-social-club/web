import "@/test/setup-runtime";

import { describe, expect, test } from "bun:test";

import { shouldIgnoreKaraokeShortcutTarget } from "./karaoke-practice-surface";

describe("shouldIgnoreKaraokeShortcutTarget", () => {
  test("ignores native buttons", () => {
    const button = document.createElement("button");

    expect(shouldIgnoreKaraokeShortcutTarget(button)).toBe(true);
  });

  test("ignores role button descendants", () => {
    const wrapper = document.createElement("div");
    const icon = document.createElement("span");

    wrapper.setAttribute("role", "button");
    wrapper.append(icon);

    expect(shouldIgnoreKaraokeShortcutTarget(icon)).toBe(true);
  });

  test("allows shortcuts on the karaoke surface itself", () => {
    const section = document.createElement("section");

    expect(shouldIgnoreKaraokeShortcutTarget(section)).toBe(false);
  });
});
