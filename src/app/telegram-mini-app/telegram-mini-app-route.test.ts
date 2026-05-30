import { describe, expect, test } from "bun:test";

import {
  readTelegramMiniAppInitData,
  readTelegramMiniAppStartParam,
  resolveTelegramMiniAppStartPath,
  buildTelegramStartAppHref,
  resolveTelegramBotUsername,
  telegramVerifyLaunchButtonLabel,
  telegramVerifyReadyMessage,
  telegramVerifyReadyTitle,
  telegramVerifyWaitingMessage,
  telegramVerifyWaitingTitle,
  telegramVerifyTerminalMessage,
} from "./telegram-mini-app-route";

describe("resolveTelegramMiniAppStartPath", () => {
  test("routes community public IDs from Telegram start params", () => {
    expect(resolveTelegramMiniAppStartPath("c_com_58a12a18213c4bf4a1e6b9343dc3702c")).toBe(
      "/tg/c/com_58a12a18213c4bf4a1e6b9343dc3702c",
    );
  });

  test("routes verify public IDs from Telegram start params", () => {
    expect(resolveTelegramMiniAppStartPath("v_com_58a12a18213c4bf4a1e6b9343dc3702c")).toBe(
      "/tg/verify/com_58a12a18213c4bf4a1e6b9343dc3702c",
    );
  });

  test("routes post public IDs from Telegram start params", () => {
    expect(resolveTelegramMiniAppStartPath("p_post_58a12a18213c4bf4a1e6b9343dc3702c")).toBe(
      "/tg/p/post_58a12a18213c4bf4a1e6b9343dc3702c",
    );
  });

  test("encodes target payloads without interpreting HNS or space handles", () => {
    expect(resolveTelegramMiniAppStartPath("c_@xn--i77hd")).toBe("/tg/c/%40xn--i77hd");
  });

  test("ignores empty or unknown start params", () => {
    expect(resolveTelegramMiniAppStartPath(null)).toBeNull();
    expect(resolveTelegramMiniAppStartPath("")).toBeNull();
    expect(resolveTelegramMiniAppStartPath("community_com_1")).toBeNull();
    expect(resolveTelegramMiniAppStartPath("c_")).toBeNull();
  });
});

describe("readTelegramMiniAppStartParam", () => {
  test("prefers Telegram WebApp start_param", () => {
    expect(readTelegramMiniAppStartParam({
      hash: "#tgWebAppStartParam=c_hash",
      search: "?startapp=c_query",
      webAppStartParam: "c_webapp",
    })).toBe("c_webapp");
  });

  test("reads Telegram launch params from URL hash", () => {
    expect(readTelegramMiniAppStartParam({
      hash: "#tgWebAppData=test&tgWebAppStartParam=c_com_cmt_58a12a18213c4bf4a1e6b9343dc3702c&tgWebAppVersion=8.0",
    })).toBe("c_com_cmt_58a12a18213c4bf4a1e6b9343dc3702c");
  });

  test("reads query params as a browser/debug fallback", () => {
    expect(readTelegramMiniAppStartParam({
      search: "?startapp=c_com_cmt_58a12a18213c4bf4a1e6b9343dc3702c",
    })).toBe("c_com_cmt_58a12a18213c4bf4a1e6b9343dc3702c");
  });
});

describe("readTelegramMiniAppInitData", () => {
  test("prefers Telegram WebApp initData", () => {
    expect(readTelegramMiniAppInitData({
      hash: "#tgWebAppData=hash_data",
      search: "?init_data=query_data",
      webAppInitData: "webapp_data",
    })).toBe("webapp_data");
  });

  test("reads Telegram auth data from URL hash", () => {
    const initData = "query_id=test&user=%7B%22id%22%3A123%7D&auth_date=1&hash=abc";
    expect(readTelegramMiniAppInitData({
      hash: `#tgWebAppData=${encodeURIComponent(initData)}&tgWebAppVersion=8.0`,
    })).toBe(initData);
  });

  test("reads query params as a browser/debug fallback", () => {
    expect(readTelegramMiniAppInitData({
      search: "?init_data=query_id%3Dtest%26auth_date%3D1%26hash%3Dabc",
    })).toBe("query_id=test&auth_date=1&hash=abc");
  });
});

describe("telegramVerifyTerminalMessage", () => {
  test("distinguishes a pre-existing membership from a join completed in this flow", () => {
    const eligibility = { status: "already_joined" } as Parameters<typeof telegramVerifyTerminalMessage>[0];

    expect(telegramVerifyTerminalMessage(eligibility, "en")).toBe("You're already a member.");
    expect(telegramVerifyTerminalMessage(eligibility, "en", { joinedInThisFlow: true })).toBe("Joined.");
  });
});

describe("telegram verification launch copy", () => {
  test("distinguishes ready-to-launch and external-in-progress titles", () => {
    expect(telegramVerifyReadyTitle("self")).toBe("Verify to join");
    expect(telegramVerifyWaitingTitle("self")).toBe("Waiting for verification");
  });

  test("uses stable provider-specific ready messages", () => {
    expect(telegramVerifyReadyMessage("self")).toBe("Use the Self.xyz App to continue.");
    expect(telegramVerifyReadyMessage("zkpassport")).toBe("Use the ZKPassport App to continue.");
  });

  test("uses stable provider-specific waiting messages", () => {
    expect(telegramVerifyWaitingMessage("self")).toBe("Complete verification in the Self.xyz App. Pirate will update automatically.");
    expect(telegramVerifyWaitingMessage("zkpassport")).toBe("Complete verification in the ZKPassport App. Pirate will update automatically.");
    expect(telegramVerifyWaitingMessage(null)).toBe("Complete verification. Pirate will update automatically.");
  });

  test("labels explicit launch buttons by provider", () => {
    expect(telegramVerifyLaunchButtonLabel("self")).toBe("Open Self.xyz");
    expect(telegramVerifyLaunchButtonLabel("zkpassport")).toBe("Open ZKPassport");
  });
});

describe("telegram bot return links", () => {
  test("uses explicit bot username before environment defaults", () => {
    expect(resolveTelegramBotUsername({
      appEnv: "prod",
      explicitUsername: "@Pirate_dev_bot",
    })).toBe("Pirate_dev_bot");
  });

  test("falls back to the staging bot outside production", () => {
    expect(resolveTelegramBotUsername({ appEnv: "staging" })).toBe("Pirate_dev_bot");
  });

  test("builds startapp links for the verify route", () => {
    expect(buildTelegramStartAppHref({
      botUsername: "Pirate_dev_bot",
      startParam: "v_com_cmt_test",
    })).toBe("https://t.me/Pirate_dev_bot?startapp=v_com_cmt_test");
  });
});
