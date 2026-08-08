import { act, renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, mock, test } from "bun:test";

import { installDomGlobals } from "@/test/setup-dom";
import type { Community as ApiCommunity } from "@pirate/api-contracts";

installDomGlobals();

class FakeApiError extends Error {
  code: string;
  status: number;

  constructor(code: string, message: string, status: number) {
    super(message);
    this.code = code;
    this.status = status;
  }
}

const COMMUNITY_ID = "cmt_test";

const toastErrors: string[] = [];
const toastInfos: string[] = [];
const toastSuccesses: string[] = [];
const openedUrls: string[] = [];

let chatSettingsResponse: Record<string, unknown> = { linked_chat: null };
let botResponse: Record<string, unknown> | null = null;
let channelDestination: Record<string, unknown> | null = null;
let channelError: unknown = null;
let intentQueue: Array<Record<string, unknown>> = [];
let intentError: unknown = null;
let intentCreateCalls = 0;
let intentGate: Promise<void> | null = null;
let backfillCalls: Array<{ communityId: string; body: { limit: number } }> = [];
let backfillError: unknown = null;
let backfillGate: Promise<void> | null = null;
let unlinkCalls: string[] = [];

function connectedBot() {
  return {
    id: "tgb_test",
    object: "telegram_community_bot",
    status: "connected",
    bot_username: "pirate_bot",
    bot_display_name: "Pirate Bot",
    token_last4: "1234",
    webhook_status: "active",
  };
}

function channelFixture(overrides: Record<string, unknown> = {}) {
  return {
    id: "tcd_test",
    object: "telegram_channel_destination",
    community: COMMUNITY_ID,
    title: "Pirate News",
    username: "piratenews",
    bot_admin_status: "ready",
    publication_mode: "from_now",
    linked_at: 1_777_000_000,
    ...overrides,
  };
}

function intentFixture(overrides: Record<string, unknown> = {}) {
  return {
    id: "tsi_channel",
    object: "telegram_setup_intent",
    community: COMMUNITY_ID,
    status: "pending",
    expires_at: Math.floor(Date.now() / 1000) + 600,
    bot_start_parameter: "tgchan_test",
    bot_deep_link: "https://t.me/pirate_bot?start=tgchan_test",
    ...overrides,
  };
}

const fakeApi = {
  communities: {
    getTelegramChatSettings: async () => chatSettingsResponse,
    getTelegramBot: async () => botResponse,
    getTelegramChannel: async () => {
      if (channelError) {
        throw channelError;
      }
      return channelDestination;
    },
    createTelegramChannelSetupIntent: async () => {
      intentCreateCalls += 1;
      if (intentError) {
        throw intentError;
      }
      if (intentGate) {
        await intentGate;
      }
      return intentQueue.length > 0 ? intentQueue.shift() : intentFixture();
    },
    createTelegramSetupIntent: async () => intentFixture(),
    backfillTelegramChannel: async (communityId: string, body: { limit: number }) => {
      backfillCalls.push({ communityId, body });
      if (backfillError) {
        throw backfillError;
      }
      if (backfillGate) {
        await backfillGate;
      }
      return { enqueued: 20 };
    },
    unlinkTelegramChannel: async (communityId: string) => {
      unlinkCalls.push(communityId);
      return { id: "tcd_test", object: "telegram_channel_destination", unlinked: true };
    },
  },
};

mock.module("@/lib/api", () => ({ useApi: () => fakeApi }));
mock.module("@/lib/api/client", () => ({ ApiError: FakeApiError }));
mock.module("@/lib/telegram-community-join", () => ({
  buildTelegramCommunityJoinUrl: () => "https://pirate.test/tg/join/cmt_test",
}));
mock.module("@/components/primitives/sonner", () => ({
  toast: {
    error: (message: string) => {
      toastErrors.push(message);
    },
    info: (message: string) => {
      toastInfos.push(message);
    },
    success: (message: string) => {
      toastSuccesses.push(message);
    },
    warning: () => undefined,
  },
}));

Object.defineProperty(window, "open", {
  configurable: true,
  value: (url: string) => {
    openedUrls.push(url);
    return {};
  },
});

const { telegramChannelErrorMessage, useCommunityTelegramState } = await import("./use-community-telegram-state");

function createCommunity(): ApiCommunity {
  return { id: COMMUNITY_ID } as ApiCommunity;
}

function renderTelegramHook() {
  // The community object must be referentially stable across renders: the
  // hook's load effect depends on it, mirroring how the route supplies it.
  const community = createCommunity();
  return renderHook(() => useCommunityTelegramState({ community }));
}

function channelProps(result: { current: ReturnType<typeof useCommunityTelegramState> }) {
  const props = result.current.telegramChannelSectionProps;
  if (!props) {
    throw new Error("expected the broadcast channel section to be rendered");
  }
  return props;
}

function linkedChatSettings() {
  return {
    linked_chat: {
      title: "Pirate Chat",
      username: "piratechat",
      directory_visible: true,
      link_mode: "open",
      bot_admin_status: "ready",
    },
    directory_visible: true,
  };
}

describe("useCommunityTelegramState broadcast channel", () => {
  beforeEach(() => {
    toastErrors.length = 0;
    toastInfos.length = 0;
    toastSuccesses.length = 0;
    openedUrls.length = 0;
    chatSettingsResponse = { linked_chat: null };
    botResponse = null;
    channelDestination = null;
    channelError = null;
    intentQueue = [];
    intentError = null;
    intentCreateCalls = 0;
    intentGate = null;
    backfillCalls = [];
    backfillError = null;
    backfillGate = null;
    unlinkCalls = [];
  });

  test("stays in loading until the destination read completes, then shows unconnected", async () => {
    const { result } = renderTelegramHook();

    expect(channelProps(result).state.kind).toBe("loading");
    await waitFor(() => expect(channelProps(result).state.kind).toBe("unconnected"));
  });

  // Regression: web #688 shipped the channel read inside the same Promise.all
  // as the bot and chat reads, against an API that had no such route. The
  // rejection stranded the whole panel — settings that had worked for months
  // stopped populating. The channel read must fail alone.
  test("keeps bot and chat settings populated when the channel endpoint 404s", async () => {
    chatSettingsResponse = linkedChatSettings();
    botResponse = connectedBot();
    channelError = new FakeApiError("not_found", "Not Found", 404);

    const { result } = renderTelegramHook();

    await waitFor(() => expect(result.current.loadingTelegram).toBe(false));
    expect(result.current.telegramLoadError).toBeNull();
    expect(result.current.telegramSettings.linkedChat.status).toBe("connected");
    expect(result.current.telegramSettings.linkedChat.chatTitle).toBe("Pirate Chat");
    expect(result.current.telegramSettings.bot.username).toBe("pirate_bot");
    // No channel support on this API build: offer no connect flow at all.
    expect(result.current.telegramChannelSectionProps).toBeNull();
  });

  test("surfaces a channel-only error when the channel read fails unexpectedly", async () => {
    chatSettingsResponse = linkedChatSettings();
    botResponse = connectedBot();
    channelError = new FakeApiError("internal", "boom", 500);

    const { result } = renderTelegramHook();

    await waitFor(() => expect(result.current.loadingTelegram).toBe(false));
    expect(result.current.telegramLoadError).toBeNull();
    expect(result.current.telegramSettings.linkedChat.status).toBe("connected");
    expect(result.current.telegramSettings.bot.username).toBe("pirate_bot");
    // Unexpected failures still show the section, degraded rather than hidden.
    await waitFor(() => expect(channelProps(result).state.kind).toBe("error"));
  });

  test("requires the community bot before creating a setup intent", async () => {
    const { result } = renderTelegramHook();
    await waitFor(() => expect(channelProps(result).state.kind).toBe("unconnected"));
    expect(channelProps(result).botConnected).toBe(false);

    act(() => {
      channelProps(result).onConnect?.();
    });

    expect(intentCreateCalls).toBe(0);
    expect(toastErrors).toContain("Connect the community bot first.");
    expect(channelProps(result).state.kind).toBe("unconnected");
  });

  test("creates a setup intent and opens the Telegram deep link", async () => {
    botResponse = connectedBot();
    const { result } = renderTelegramHook();
    await waitFor(() => expect(channelProps(result).state.kind).toBe("unconnected"));
    expect(channelProps(result).botConnected).toBe(true);

    act(() => {
      channelProps(result).onConnect?.();
    });

    await waitFor(() => expect(channelProps(result).state.kind).toBe("awaiting_telegram"));
    expect(intentCreateCalls).toBe(1);
    expect(openedUrls).toEqual(["https://t.me/pirate_bot?start=tgchan_test"]);
    const state = channelProps(result).state;
    if (state.kind !== "awaiting_telegram") {
      throw new Error("expected awaiting_telegram");
    }
    expect(state.deepLink).toBe("https://t.me/pirate_bot?start=tgchan_test");
    expect(state.expiresAt).toBeGreaterThan(Date.now() / 1000);
  });

  test("does not double-submit while intent creation is in flight", async () => {
    botResponse = connectedBot();
    let releaseIntent!: () => void;
    intentGate = new Promise<void>((resolve) => {
      releaseIntent = resolve;
    });
    const { result } = renderTelegramHook();
    await waitFor(() => expect(channelProps(result).state.kind).toBe("unconnected"));

    act(() => {
      channelProps(result).onConnect?.();
      channelProps(result).onConnect?.();
    });
    expect(intentCreateCalls).toBe(1);
    expect(channelProps(result).state.kind).toBe("creating_intent");

    releaseIntent();
    await waitFor(() => expect(channelProps(result).state.kind).toBe("awaiting_telegram"));
    expect(intentCreateCalls).toBe(1);
  });

  test("completes the connection when the window regains focus", async () => {
    botResponse = connectedBot();
    const { result } = renderTelegramHook();
    await waitFor(() => expect(channelProps(result).state.kind).toBe("unconnected"));

    act(() => {
      channelProps(result).onConnect?.();
    });
    await waitFor(() => expect(channelProps(result).state.kind).toBe("awaiting_telegram"));

    channelDestination = channelFixture();
    await act(async () => {
      window.dispatchEvent(new window.Event("focus"));
    });

    await waitFor(() => expect(channelProps(result).state.kind).toBe("connected"));
    const state = channelProps(result).state;
    if (state.kind !== "connected") {
      throw new Error("expected connected");
    }
    expect(state.channel.title).toBe("Pirate News");
    expect(state.channel.username).toBe("piratenews");
    expect(toastSuccesses).toContain("Telegram channel connected.");
  });

  test("manual check keeps the owner in control until a destination exists", async () => {
    botResponse = connectedBot();
    const { result } = renderTelegramHook();
    await waitFor(() => expect(channelProps(result).state.kind).toBe("unconnected"));

    act(() => {
      channelProps(result).onConnect?.();
    });
    await waitFor(() => expect(channelProps(result).state.kind).toBe("awaiting_telegram"));

    act(() => {
      channelProps(result).onCheckConnection?.();
    });
    await waitFor(() => {
      const state = channelProps(result).state;
      expect(state.kind === "awaiting_telegram" && !state.checking).toBe(true);
    });
    expect(toastInfos).toContain("No channel connected yet. Complete the connection in Telegram.");

    channelDestination = channelFixture();
    act(() => {
      channelProps(result).onCheckConnection?.();
    });
    await waitFor(() => expect(channelProps(result).state.kind).toBe("connected"));
  });

  test("a failed focus refetch does not strand the owner", async () => {
    botResponse = connectedBot();
    const { result } = renderTelegramHook();
    await waitFor(() => expect(channelProps(result).state.kind).toBe("unconnected"));

    act(() => {
      channelProps(result).onConnect?.();
    });
    await waitFor(() => expect(channelProps(result).state.kind).toBe("awaiting_telegram"));

    channelError = new FakeApiError("upstream", "Telegram exploded", 502);
    await act(async () => {
      window.dispatchEvent(new window.Event("focus"));
    });
    // Still awaiting: the manual Check connection action remains available.
    expect(channelProps(result).state.kind).toBe("awaiting_telegram");

    channelError = null;
    channelDestination = channelFixture();
    act(() => {
      channelProps(result).onCheckConnection?.();
    });
    await waitFor(() => expect(channelProps(result).state.kind).toBe("connected"));
  });

  test("start again after expiry creates a new intent", async () => {
    botResponse = connectedBot();
    intentQueue = [
      intentFixture({ expires_at: Math.floor(Date.now() / 1000) - 5 }),
      intentFixture({
        bot_deep_link: "https://t.me/pirate_bot?start=tgchan_second",
        bot_start_parameter: "tgchan_second",
      }),
    ];
    const { result } = renderTelegramHook();
    await waitFor(() => expect(channelProps(result).state.kind).toBe("unconnected"));

    act(() => {
      channelProps(result).onConnect?.();
    });
    await waitFor(() => expect(channelProps(result).state.kind).toBe("awaiting_telegram"));

    act(() => {
      channelProps(result).onConnect?.();
    });
    await waitFor(() => expect(intentCreateCalls).toBe(2));
    await waitFor(() => {
      const state = channelProps(result).state;
      expect(state.kind === "awaiting_telegram" && state.deepLink.endsWith("tgchan_second")).toBe(true);
    });
    expect(openedUrls).toEqual([
      "https://t.me/pirate_bot?start=tgchan_test",
      "https://t.me/pirate_bot?start=tgchan_second",
    ]);
  });

  test("maps intent creation failures to owner-friendly copy", async () => {
    botResponse = connectedBot();
    intentError = new FakeApiError("already_connected", "channel already connected", 409);
    const { result } = renderTelegramHook();
    await waitFor(() => expect(channelProps(result).state.kind).toBe("unconnected"));

    act(() => {
      channelProps(result).onConnect?.();
    });

    await waitFor(() => expect(channelProps(result).state.kind).toBe("error"));
    const state = channelProps(result).state;
    if (state.kind !== "error") {
      throw new Error("expected error");
    }
    expect(state.message).toBe("This channel is already connected to another Pirate community.");
    expect(toastErrors).toContain("This channel is already connected to another Pirate community.");
  });

  test("backfill asks for confirmation, sends the fixed limit, and reports queued posts", async () => {
    botResponse = connectedBot();
    channelDestination = channelFixture();
    const { result } = renderTelegramHook();
    await waitFor(() => expect(channelProps(result).state.kind).toBe("connected"));

    act(() => {
      channelProps(result).onRequestBackfill?.();
    });
    expect(channelProps(result).state.kind).toBe("backfill_confirm");

    act(() => {
      channelProps(result).onConfirmBackfill?.();
    });
    await waitFor(() => expect(channelProps(result).state.kind).toBe("backfill_queued"));

    expect(backfillCalls).toEqual([{ communityId: COMMUNITY_ID, body: { limit: 20 } }]);
    expect(toastSuccesses).toContain(
      "20 posts queued for publication. They will appear gradually in Telegram.",
    );
  });

  test("backfill cancel returns to connected without calling the API", async () => {
    botResponse = connectedBot();
    channelDestination = channelFixture();
    const { result } = renderTelegramHook();
    await waitFor(() => expect(channelProps(result).state.kind).toBe("connected"));

    act(() => {
      channelProps(result).onRequestBackfill?.();
    });
    act(() => {
      channelProps(result).onCancelBackfill?.();
    });

    expect(channelProps(result).state.kind).toBe("connected");
    expect(backfillCalls).toHaveLength(0);
  });

  test("does not double-submit a backfill while one is in flight", async () => {
    botResponse = connectedBot();
    channelDestination = channelFixture();
    let releaseBackfill!: () => void;
    backfillGate = new Promise<void>((resolve) => {
      releaseBackfill = resolve;
    });
    const { result } = renderTelegramHook();
    await waitFor(() => expect(channelProps(result).state.kind).toBe("connected"));

    act(() => {
      channelProps(result).onRequestBackfill?.();
    });
    act(() => {
      channelProps(result).onConfirmBackfill?.();
      channelProps(result).onConfirmBackfill?.();
    });
    expect(backfillCalls).toHaveLength(1);
    expect(channelProps(result).state.kind).toBe("backfilling");

    releaseBackfill();
    await waitFor(() => expect(channelProps(result).state.kind).toBe("backfill_queued"));
    expect(backfillCalls).toHaveLength(1);
  });

  test("disconnect confirms and preserves bot and group state", async () => {
    botResponse = connectedBot();
    channelDestination = channelFixture();
    const { result } = renderTelegramHook();
    await waitFor(() => expect(channelProps(result).state.kind).toBe("connected"));

    const settingsBefore = result.current.telegramSettings;

    act(() => {
      channelProps(result).onRequestDisconnect?.();
    });
    expect(channelProps(result).state.kind).toBe("disconnect_confirm");

    act(() => {
      channelProps(result).onConfirmDisconnect?.();
    });
    await waitFor(() => expect(channelProps(result).state.kind).toBe("unconnected"));

    expect(unlinkCalls).toEqual([COMMUNITY_ID]);
    expect(toastSuccesses).toContain("Telegram channel disconnected.");
    expect(result.current.telegramSettings).toBe(settingsBefore);
  });

  test("disconnect cancel returns to connected", async () => {
    botResponse = connectedBot();
    channelDestination = channelFixture();
    const { result } = renderTelegramHook();
    await waitFor(() => expect(channelProps(result).state.kind).toBe("connected"));

    act(() => {
      channelProps(result).onRequestDisconnect?.();
    });
    act(() => {
      channelProps(result).onCancelDisconnect?.();
    });

    expect(channelProps(result).state.kind).toBe("connected");
    expect(unlinkCalls).toHaveLength(0);
  });
});

describe("telegramChannelErrorMessage", () => {
  test("maps provider failures to owner-friendly copy", () => {
    expect(telegramChannelErrorMessage(
      new FakeApiError("bot_required", "community bot required", 400),
      "fallback",
    )).toBe("Connect the community bot first.");
    expect(telegramChannelErrorMessage(
      new FakeApiError("not_a_channel", "chat_type mismatch", 400),
      "fallback",
    )).toBe("Select a Telegram broadcast channel.");
    expect(telegramChannelErrorMessage(
      new FakeApiError("forbidden", "bot is not an admin", 403),
      "fallback",
    )).toBe("Make the bot a channel administrator with permission to post.");
    expect(telegramChannelErrorMessage(
      new FakeApiError("already_connected", "destination already connected", 409),
      "fallback",
    )).toBe("This channel is already connected to another Pirate community.");
    expect(telegramChannelErrorMessage(
      new FakeApiError("setup_intent_expired", "intent expired", 410),
      "fallback",
    )).toBe("The request expired. Start again.");
  });

  test("never leaks raw provider or SQL errors", () => {
    expect(telegramChannelErrorMessage(
      new Error('SQLITE_CONSTRAINT: FOREIGN KEY constraint failed'),
      "Could not queue posts for publication.",
    )).toBe("Could not queue posts for publication.");
  });
});
