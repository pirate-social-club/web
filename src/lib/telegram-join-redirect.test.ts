import { afterEach, describe, expect, test } from "bun:test";

import { createFetchMock, type FetchImplementation } from "@/test/fetch-mock";
import { telegramCommunityJoinRedirect } from "./telegram-join-redirect";

const originalFetch = globalThis.fetch;

afterEach(() => {
  Object.defineProperty(globalThis, "fetch", {
    configurable: true,
    value: originalFetch,
  });
});

function mockFetch(handler: FetchImplementation): void {
  Object.defineProperty(globalThis, "fetch", {
    configurable: true,
    value: createFetchMock(handler),
  });
}

function redirectResponse(input: {
  apiOrigin?: string;
  communityId?: string;
  effectiveUrl?: string;
} = {}): Promise<Response> {
  return telegramCommunityJoinRedirect({
    apiOrigin: input.apiOrigin ?? "https://api.pirate.sc",
    communityId: input.communityId ?? "com_cmt_test",
    effectiveUrl: input.effectiveUrl ?? "https://pirate.sc/tg/join/com_cmt_test",
  });
}

describe("telegramCommunityJoinRedirect", () => {
  test("redirects active community bot links with a join payload", async () => {
    const calls: string[] = [];
    mockFetch(async (input) => {
      calls.push(String(input));
      return Response.json({ active_telegram_bot_username: "CommunityPirateBot" });
    });

    const response = await redirectResponse();

    expect(response.status).toBe(302);
    expect(response.headers.get("location")).toBe("https://t.me/CommunityPirateBot?start=join_com_cmt_test");
    expect(response.headers.get("cache-control")).toBe("no-store");
    expect(calls).toEqual([
      "https://api.pirate.sc/communities/com_cmt_test/telegram-bot-username",
    ]);
  });

  test("resolves handle links before building active community bot payloads", async () => {
    const calls: string[] = [];
    mockFetch(async (input) => {
      calls.push(String(input));
      if (String(input).includes("/telegram-bot-username")) {
        return Response.json({ active_telegram_bot_username: "CommunityPirateBot" });
      }
      return Response.json({ id: "com_cmt_georgia" });
    });

    const response = await redirectResponse({
      communityId: "@xn--i77hd",
      effectiveUrl: "https://pirate.sc/tg/join/%40xn--i77hd",
    });

    expect(response.status).toBe(302);
    expect(response.headers.get("location")).toBe("https://t.me/CommunityPirateBot?start=join_com_cmt_georgia");
    expect(calls).toEqual([
      "https://api.pirate.sc/communities/%40xn--i77hd/telegram-bot-username",
      "https://api.pirate.sc/public-communities/%40xn--i77hd",
    ]);
  });

  test("falls back to the staging platform bot when no community bot exists", async () => {
    mockFetch(async () => Response.json({ active_telegram_bot_username: null }));

    const response = await redirectResponse({
      apiOrigin: "https://api-staging.pirate.sc",
      effectiveUrl: "https://staging.pirate.sc/tg/join/com_cmt_test",
    });

    expect(response.status).toBe(302);
    expect(response.headers.get("location")).toBe("https://t.me/Pirate_dev_bot?start=c_com_cmt_test");
  });

  test("resolves handle links before building platform bot fallback payloads", async () => {
    mockFetch(async (input) => {
      if (String(input).includes("/telegram-bot-username")) {
        return Response.json({ active_telegram_bot_username: null });
      }
      return Response.json({ id: "com_cmt_georgia" });
    });

    const response = await redirectResponse({
      apiOrigin: "https://api-staging.pirate.sc",
      communityId: "@xn--i77hd",
      effectiveUrl: "https://staging.pirate.sc/tg/join/%40xn--i77hd",
    });

    expect(response.status).toBe(302);
    expect(response.headers.get("location")).toBe("https://t.me/Pirate_dev_bot?start=c_com_cmt_georgia");
  });

  test("rejects invalid Telegram start payload characters", async () => {
    mockFetch(async () => Response.json({ active_telegram_bot_username: "CommunityPirateBot" }));

    const response = await redirectResponse({ communityId: "com/cmt/test" });
    const body = await response.text();

    expect(response.status).toBe(400);
    expect(body).toContain("Invalid Telegram join link");
  });
});
