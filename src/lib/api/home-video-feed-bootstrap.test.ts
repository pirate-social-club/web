import "@/test/setup-runtime";

import { afterEach, describe, expect, test } from "bun:test";
import type { HomeFeedResponse } from "@pirate/api-contracts";

import { consumeHomeVideoFeedBootstrap } from "./home-video-feed-bootstrap";

const response = { items: [], next_cursor: null } as HomeFeedResponse;

afterEach(() => {
  delete window.__pirateHomeVideoFeedBootstrap;
});

describe("consumeHomeVideoFeedBootstrap", () => {
  test("claims a matching pre-hydration response once", async () => {
    window.__pirateHomeVideoFeedBootstrap = {
      authenticated: true,
      locale: "en",
      promise: Promise.resolve({ ok: true, response }),
    };

    await expect(consumeHomeVideoFeedBootstrap({
      authenticated: true,
      locale: "en",
    })).resolves.toBe(response);
    expect(consumeHomeVideoFeedBootstrap({
      authenticated: true,
      locale: "en",
    })).toBeNull();
  });

  test("rejects mismatched and unsuccessful bootstrap responses", async () => {
    window.__pirateHomeVideoFeedBootstrap = {
      authenticated: false,
      locale: "es",
      promise: Promise.resolve({ ok: true, response }),
    };
    expect(consumeHomeVideoFeedBootstrap({
      authenticated: true,
      locale: "en",
    })).toBeNull();

    window.__pirateHomeVideoFeedBootstrap = {
      authenticated: true,
      locale: "en",
      promise: Promise.resolve({ ok: false }),
    };
    await expect(consumeHomeVideoFeedBootstrap({
      authenticated: true,
      locale: "en",
    })).rejects.toThrow("Pre-hydration video feed request failed");
  });
});
