import { describe, expect, test } from "bun:test";

import { withFetchMockGlobal } from "@/test/fetch-mock";
import { ApiClient, ApiError } from "./client";

withFetchMockGlobal((globalThis) => {

const originalFetch = globalThis.fetch;

test("preserves an explicit retryable false from an API error response", async () => {
  globalThis.fetch = async () => Response.json({
    code: "karaoke_stt_unconfigured",
    message: "Karaoke scoring provider is not configured",
    retryable: false,
  }, { status: 503 });

  try {
    const client = new ApiClient({ baseUrl: "http://pirate.test", getToken: () => null });
    await client.publicPosts.getKaraoke("pst_test").then(
      () => { throw new Error("Expected request to fail"); },
      (error: unknown) => {
        expect(error).toBeInstanceOf(ApiError);
        expect(error).toMatchObject({ retryable: false, retryableExplicit: true, status: 503 });
      },
    );
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("captures request_id from error bodies and falls back to the x-request-id header", async () => {
  globalThis.fetch = async () => Response.json({
    code: "internal_error",
    message: "Internal server error",
    retryable: true,
    request_id: "body-req-id",
  }, { status: 500, headers: { "x-request-id": "header-req-id" } });

  try {
    const client = new ApiClient({ baseUrl: "http://pirate.test", getToken: () => null });
    await client.publicPosts.getKaraoke("pst_test").then(
      () => { throw new Error("Expected request to fail"); },
      (error: unknown) => {
        expect(error).toBeInstanceOf(ApiError);
        expect(error).toMatchObject({ requestId: "body-req-id", status: 500 });
      },
    );

    globalThis.fetch = async () => new Response("not json", {
      status: 500,
      headers: { "x-request-id": "header-req-id" },
    });
    await client.publicPosts.getKaraoke("pst_test").then(
      () => { throw new Error("Expected request to fail"); },
      (error: unknown) => {
        expect(error).toBeInstanceOf(ApiError);
        expect(error).toMatchObject({ requestId: "header-req-id", status: 500 });
      },
    );
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("loads profile follow state with optional viewer authentication", async () => {
  let request: Request | null = null;
  globalThis.fetch = async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
    request = input instanceof Request ? input : new Request(input, init);
    return Response.json({
      object: "profile_follow_state",
      target_user_id: "usr_target",
      target_wallet: { status: "available", address: "0x0000000000000000000000000000000000000001" },
      relationship: { status: "current", viewer_follows: false },
      counts: { status: "current", follower_count: 12, following_count: 34 },
      projection: {
        availability: "current",
        revision: "17",
        indexed_through_block: [{ chain_id: 8453, block_number: "49181298" }],
      },
    });
  };

  try {
    const client = new ApiClient({
      baseUrl: "http://pirate.test",
      getToken: () => "session-token",
    });
    const state = await client.profiles.getFollowState("usr/target");
    const capturedRequest = requireRequest(request);
    expect(capturedRequest.url).toBe("http://pirate.test/profiles/usr%2Ftarget/follow-state");
    expect(capturedRequest.headers.get("authorization")).toBe("Bearer session-token");
    expect(state.counts).toEqual({
      status: "current",
      follower_count: 12,
      following_count: 34,
    });
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("prepares profile follow writes with server idempotency", async () => {
  let request: Request | null = null;
  globalThis.fetch = async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
    request = input instanceof Request ? input : new Request(input, init);
    return Response.json({
      object: "profile_follow_write",
      intent_id: "efw_test",
      target_user_id: "usr_target",
      desired_following: true,
      consistency: { status: "accepted_not_yet_reflected" },
      sponsorship: { eligible: true, reserved_transaction_count: 0 },
      transactions: [],
      expires_at: "2026-07-28T00:10:00.000Z",
    });
  };
  try {
    const client = new ApiClient({
      baseUrl: "http://pirate.test",
      getToken: () => "session-token",
    });
    await client.profiles.prepareFollowWrite("usr/target", true, "idem-follow-1");
    const capturedRequest = requireRequest(request);
    expect(capturedRequest.url).toBe("http://pirate.test/profiles/usr%2Ftarget/follow");
    expect(capturedRequest.method).toBe("POST");
    expect(capturedRequest.headers.get("idempotency-key")).toBe("idem-follow-1");
    expect(capturedRequest.headers.get("authorization")).toBe("Bearer session-token");
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("captures per-field validation errors from { error, fields } bodies into details", async () => {
  globalThis.fetch = async () => Response.json({
    error: "validation_failed",
    fields: [{ field: "base_price_cents", reason: "must be a positive integer (cents)" }],
  }, { status: 400 });

  try {
    const client = new ApiClient({ baseUrl: "http://pirate.test", getToken: () => null });
    await client.publicPosts.getKaraoke("pst_test").then(
      () => { throw new Error("Expected request to fail"); },
      (error: unknown) => {
        expect(error).toBeInstanceOf(ApiError);
        expect(error).toMatchObject({ code: "validation_failed", status: 400 });
        expect((error as ApiError).details).toMatchObject({
          fields: [{ field: "base_price_cents", reason: "must be a positive integer (cents)" }],
        });
      },
    );
  } finally {
    globalThis.fetch = originalFetch;
  }
});

function requireRequest(request: Request | null): Request {
  if (!request) {
    throw new Error("Expected request to be captured");
  }
  return request;
}

function makeTestFile(name: string, type: string): File {
  return new File([new Uint8Array([1, 2, 3, 4])], name, { type });
}

describe("ApiClient geo", () => {
  test("sends authenticated place searches with country and bias params", async () => {
    let request: Request | null = null;
    globalThis.fetch = async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
      request = input instanceof Request ? input : new Request(input, init);
      return Response.json({ places: [] });
    };

    try {
      const client = new ApiClient({
        baseUrl: "http://pirate.test",
        getToken: () => "session-token",
      });

      await client.geo.searchPlaces({
        biasLat: 41.708,
        biasLon: 44.798,
        country: "ge",
        limit: 5,
        text: "Fabrika Tbilisi",
      });

      const capturedRequest = requireRequest(request);
      const url = new URL(capturedRequest.url);
      expect(url.pathname).toBe("/geo/search");
      expect(url.searchParams.get("text")).toBe("Fabrika Tbilisi");
      expect(url.searchParams.get("limit")).toBe("5");
      expect(url.searchParams.get("country")).toBe("ge");
      expect(url.searchParams.get("biasLat")).toBe("41.708");
      expect(url.searchParams.get("biasLon")).toBe("44.798");
      expect(capturedRequest.headers.get("authorization")).toBe("Bearer session-token");
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  test("does not send JSON content type for bodyless GET requests", async () => {
    let request: Request | null = null;
    globalThis.fetch = async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
      request = input instanceof Request ? input : new Request(input, init);
      return Response.json({ places: [] });
    };

    try {
      const client = new ApiClient({
        baseUrl: "http://pirate.test",
        getToken: () => "session-token",
      });

      await client.geo.searchPlaces({
        text: "Tbilisi",
      });

      const capturedRequest = requireRequest(request);
      expect(capturedRequest.method).toBe("GET");
      expect(capturedRequest.headers.get("content-type")).toBeNull();
      expect(capturedRequest.headers.get("authorization")).toBe("Bearer session-token");
    } finally {
      globalThis.fetch = originalFetch;
    }
  });
});

describe("ApiClient bookings", () => {
  test("uses global booking endpoints with optional source community context", async () => {
    const requests: Request[] = [];
    globalThis.fetch = async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
      const request = input instanceof Request ? input : new Request(input, init);
      requests.push(request);

      if (request.url.endsWith("/slots?from=2026-07-01T10%3A00%3A00.000Z&to=2026-07-08T10%3A00%3A00.000Z&tz=UTC")) {
        return Response.json({ host_timezone: "UTC", viewer_timezone: "UTC", slots: [] });
      }
      if (request.url.endsWith("/holds")) {
        return Response.json({
          hold: {
            hold_id: "hold_1",
            source_community_id: "com_1",
            host_user_id: "host_1",
            booker_user_id: "booker_1",
            slot_start_utc: "2026-07-01T10:00:00.000Z",
            slot_end_utc: "2026-07-01T10:30:00.000Z",
            price_cents: 2500,
            status: "active",
            expires_at_utc: "2026-07-01T09:45:00.000Z",
          },
        });
      }
      if (request.url.endsWith("/quote")) {
        return Response.json({ quote: { hold_id: "hold_1" } });
      }
      if (request.url.includes("/bookings?")) {
        return Response.json({ object: "list", data: [], has_more: false });
      }
      return Response.json({ ok: true });
    };

    try {
      const client = new ApiClient({
        baseUrl: "http://pirate.test",
        getToken: () => "session-token",
      });

      await client.bookings.listBookingSlots("host_1", {
        from: "2026-07-01T10:00:00.000Z",
        to: "2026-07-08T10:00:00.000Z",
        tz: "UTC",
      });
      await client.bookings.createBookingHold("host_1", {
        slot_start_utc: "2026-07-01T10:00:00.000Z",
        slot_end_utc: "2026-07-01T10:30:00.000Z",
        source_community_id: "com_1",
      });
      await client.bookings.quoteBookingHold("hold_1");
      await client.bookings.listBookings({ role: "booker", source_community_id: "com_1" });
      await client.bookings.attachBookingSession("bkg_1");

      expect(new URL(requests[0]!.url).pathname).toBe("/bookings/hosts/host_1/slots");
      expect(requests[1]!.url).toBe("http://pirate.test/bookings/hosts/host_1/holds");
      expect(await requests[1]!.json()).toEqual({
        slot_start_utc: "2026-07-01T10:00:00.000Z",
        slot_end_utc: "2026-07-01T10:30:00.000Z",
        source_community_id: "com_1",
      });
      expect(requests[2]!.url).toBe("http://pirate.test/bookings/holds/hold_1/quote");
      const listUrl = new URL(requests[3]!.url);
      expect(listUrl.pathname).toBe("/bookings");
      expect(listUrl.searchParams.get("role")).toBe("booker");
      expect(listUrl.searchParams.get("source_community_id")).toBe("com_1");
      expect(requests[4]!.url).toBe("http://pirate.test/bookings/bkg_1/session/attach");
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  test("uses host booking endpoints for exceptions and price rules", async () => {
    const requests: Request[] = [];
    globalThis.fetch = async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
      const request = input instanceof Request ? input : new Request(input, init);
      requests.push(request);
      if (request.url.endsWith("/availability-exceptions")) {
        return request.method === "GET"
          ? Response.json({ object: "list", data: [], has_more: false })
          : Response.json({ object: "availability_exception", id: "bae_1", kind: "block", start: 1, end: 2, created: 1 });
      }
      if (request.url.endsWith("/price-rules")) {
        return request.method === "GET"
          ? Response.json({ object: "list", data: [], has_more: false })
          : Response.json({ object: "price_rule", id: "bprl_1", price_cents: 7500, priority: 1 });
      }
      return Response.json({ id: "deleted", object: "deleted", deleted: true });
    };

    try {
      const client = new ApiClient({
        baseUrl: "http://pirate.test",
        getToken: () => "session-token",
      });

      await client.hostBookings.listAvailabilityExceptions();
      await client.hostBookings.createAvailabilityException({
        kind: "block",
        start_utc: "2026-07-04T00:00:00.000Z",
        end_utc: "2026-07-04T01:00:00.000Z",
      });
      await client.hostBookings.updateAvailabilityException("bae_1", { kind: "open" });
      await client.hostBookings.deleteAvailabilityException("bae_1");
      await client.hostBookings.listPriceRules();
      await client.hostBookings.createPriceRule({
        match_weekday: [1, 2, 3],
        match_local_start: "09:00",
        match_local_end: "12:00",
        price_cents: 7500,
        priority: 1,
      });
      await client.hostBookings.updatePriceRule("bprl_1", { price_cents: 8000 });
      await client.hostBookings.deletePriceRule("bprl_1");

      expect(requests.map((request) => `${request.method} ${request.url}`)).toEqual([
        "GET http://pirate.test/host-bookings/me/availability-exceptions",
        "POST http://pirate.test/host-bookings/me/availability-exceptions",
        "POST http://pirate.test/host-bookings/me/availability-exceptions/bae_1",
        "DELETE http://pirate.test/host-bookings/me/availability-exceptions/bae_1",
        "GET http://pirate.test/host-bookings/me/price-rules",
        "POST http://pirate.test/host-bookings/me/price-rules",
        "POST http://pirate.test/host-bookings/me/price-rules/bprl_1",
        "DELETE http://pirate.test/host-bookings/me/price-rules/bprl_1",
      ]);
      expect(await requests[1]!.json()).toEqual({
        kind: "block",
        start_utc: "2026-07-04T00:00:00.000Z",
        end_utc: "2026-07-04T01:00:00.000Z",
      });
      expect(await requests[2]!.json()).toEqual({ kind: "open" });
      expect(await requests[5]!.json()).toEqual({
        match_weekday: [1, 2, 3],
        match_local_start: "09:00",
        match_local_end: "12:00",
        price_cents: 7500,
        priority: 1,
      });
      expect(await requests[6]!.json()).toEqual({ price_cents: 8000 });
    } finally {
      globalThis.fetch = originalFetch;
    }
  });
});

describe("ApiClient media uploads", () => {
  test("aborts API requests when a timeout is provided", async () => {
    let observedAbort = false;
    globalThis.fetch = async (_input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
      return await new Promise<Response>((_resolve, reject) => {
        init?.signal?.addEventListener("abort", () => {
          observedAbort = true;
          reject(new DOMException("The operation was aborted.", "AbortError"));
        }, { once: true });
      });
    };

    try {
      const client = new ApiClient({
        baseUrl: "http://pirate.test",
        getToken: () => "session-token",
      });

      await expect(client.communities.createArtifactUpload("com_test", {
        artifact_kind: "primary_audio",
        mime_type: "audio/mpeg",
        filename: "song.mp3",
        size_bytes: 4,
      }, { timeoutMs: 1 })).rejects.toThrow("The operation was aborted.");
      expect(observedAbort).toBe(true);
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  test("sends FormData without forcing a JSON content type", async () => {
    let request: Request | null = null;
    globalThis.fetch = async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
      request = input instanceof Request ? input : new Request(input, init);
      return Response.json({
        kind: "avatar",
        media_ref: "http://pirate.test/community-media/avatar/avatar_test.png",
        mime_type: "image/png",
        size_bytes: 4,
        storage_bucket: "pirate-media",
        storage_object_key: "community-media/avatar/avatar_test.png",
      });
    };

    try {
      const client = new ApiClient({
        baseUrl: "http://pirate.test",
        getToken: () => "session-token",
      });

      await client.communities.uploadMedia({
        kind: "avatar",
        file: makeTestFile("avatar.png", "image/png"),
      });

      const capturedRequest = requireRequest(request);
      expect(capturedRequest.method).toBe("POST");
      expect(capturedRequest.url).toBe("http://pirate.test/community-media");
      expect(capturedRequest.headers.get("authorization")).toBe("Bearer session-token");
      expect(capturedRequest.headers.get("content-type")?.startsWith("multipart/form-data;")).toBe(true);

      const formData = await capturedRequest.formData();
      expect(formData.get("kind")).toBe("avatar");
      const file = formData.get("file");
      expect(file instanceof File).toBe(true);
      expect((file as File).name).toBe("avatar.png");
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  test("keeps JSON content type for normal JSON requests", async () => {
    let request: Request | null = null;
    globalThis.fetch = async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
      request = input instanceof Request ? input : new Request(input, init);
      return Response.json({ community: "cmt_test", status: "joined" });
    };

    try {
      const client = new ApiClient({
        baseUrl: "http://pirate.test",
        getToken: () => "session-token",
      });

      await client.communities.join("cmt_test");

      const capturedRequest = requireRequest(request);
      expect(capturedRequest.headers.get("content-type")).toBe("application/json");
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  test("authorizes OAuth device codes with the current session token", async () => {
    let request: Request | null = null;
    globalThis.fetch = async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
      request = input instanceof Request ? input : new Request(input, init);
      return Response.json({
        client_id: "freedom-desktop",
        scope: "live_room:attach live_room:manage",
        status: "authorized",
        user_code: "PTR-ABCD-2345",
      });
    };

    try {
      const client = new ApiClient({
        baseUrl: "http://pirate.test",
        getToken: () => "session-token",
      });

      await client.auth.verifyDevice("PTR-ABCD-2345");

      const capturedRequest = requireRequest(request);
      expect(capturedRequest.method).toBe("POST");
      expect(capturedRequest.url).toBe("http://pirate.test/oauth/device/verify");
      expect(capturedRequest.headers.get("authorization")).toBe("Bearer session-token");
      expect(await capturedRequest.json()).toEqual({ user_code: "PTR-ABCD-2345" });
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  test("sends join request notes as JSON", async () => {
    let request: Request | null = null;
    globalThis.fetch = async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
      request = input instanceof Request ? input : new Request(input, init);
      return Response.json({ community: "cmt_test", status: "requested" });
    };

    try {
      const client = new ApiClient({
        baseUrl: "http://pirate.test",
        getToken: () => "session-token",
      });

      await client.communities.join("cmt_test", { note: "I would like to join." });

      const capturedRequest = requireRequest(request);
      expect(await capturedRequest.json()).toEqual({ note: "I would like to join." });
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  test("requests the current community handle", async () => {
    let request: Request | null = null;
    globalThis.fetch = async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
      request = input instanceof Request ? input : new Request(input, init);
      return Response.json({ handle: null });
    };

    try {
      const client = new ApiClient({
        baseUrl: "http://pirate.test",
        getToken: () => "session-token",
      });

      await client.communities.getMyHandle("cmt_test");

      const capturedRequest = requireRequest(request);
      expect(capturedRequest.method).toBe("GET");
      expect(capturedRequest.url).toBe("http://pirate.test/communities/cmt_test/handles/me");
      expect(capturedRequest.headers.get("authorization")).toBe("Bearer session-token");
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  test("lists namespaces and scopes handle reads to a selected namespace", async () => {
    const requests: Request[] = [];
    globalThis.fetch = async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
      const request = input instanceof Request ? input : new Request(input, init);
      requests.push(request);
      return request.url.endsWith("/namespaces")
        ? Response.json({ namespaces: [] })
        : Response.json({ handle: null });
    };

    try {
      const client = new ApiClient({
        baseUrl: "http://pirate.test",
        getToken: () => "session-token",
      });

      await client.communities.listNamespaces("cmt_test");
      await client.communities.getMyHandle("cmt_test", {
        namespaceVerification: "nv_charizard",
      });

      expect(requests.map((request) => request.url)).toEqual([
        "http://pirate.test/communities/cmt_test/namespaces",
        "http://pirate.test/communities/cmt_test/handles/me?namespace_verification=nv_charizard",
      ]);
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  test("attaches a verified mirror namespace without changing the primary compatibility default", async () => {
    const requests: Request[] = [];
    globalThis.fetch = async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
      const request = input instanceof Request ? input : new Request(input, init);
      requests.push(request);
      return Response.json({ id: "cmt_test", route_slug: "dankmeme" });
    };

    try {
      const client = new ApiClient({
        baseUrl: "http://pirate.test",
        getToken: () => "session-token",
      });

      await client.communities.attachNamespace("cmt_test", "nv_somethingelse", "mirror");

      expect(requests).toHaveLength(1);
      expect(requests[0]?.url).toBe("http://pirate.test/communities/cmt_test/namespace");
      expect(await requests[0]?.json()).toEqual({
        namespace_verification: "nv_somethingelse",
        namespace_role: "mirror",
      });
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  test("calls community Telegram chat settings endpoints", async () => {
    const requests: Request[] = [];
    globalThis.fetch = async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
      const request = input instanceof Request ? input : new Request(input, init);
      requests.push(request);

      if (request.url.endsWith("/setup-intents")) {
        return Response.json({
          id: "tsi_test",
          object: "telegram_setup_intent",
          community: "cmt_test",
          status: "pending",
          expires_at: 1_777_000_000,
          bot_start_parameter: "tgsetup_test",
          bot_deep_link: "https://t.me/pirate_bot?start=tgsetup_test",
        });
      }

      return Response.json({
        id: "cmt_test",
        object: "community_telegram_chat_settings",
        community: "cmt_test",
        linked_chat: null,
      });
    };

    try {
      const client = new ApiClient({
        baseUrl: "http://pirate.test",
        getToken: () => "session-token",
      });

      await client.communities.getTelegramChatSettings("cmt_test");
      await client.communities.createTelegramSetupIntent("cmt_test");
      await client.communities.updateTelegramChatSettings("cmt_test", {
        directory_visible: false,
        link_mode: "invite_link",
      });
      await client.communities.unlinkTelegramChat("cmt_test");

      expect(requests.map((request) => `${request.method} ${request.url}`)).toEqual([
        "GET http://pirate.test/communities/cmt_test/telegram-chat",
        "POST http://pirate.test/communities/cmt_test/telegram-chat/setup-intents",
        "POST http://pirate.test/communities/cmt_test/telegram-chat",
        "POST http://pirate.test/communities/cmt_test/telegram-chat/unlink",
      ]);
      expect(requests.every((request) => request.headers.get("authorization") === "Bearer session-token")).toBe(true);
      expect(await requests[2]!.json()).toEqual({
        directory_visible: false,
        link_mode: "invite_link",
      });
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  test("updates constrained community presentation settings", async () => {
    const requests: Request[] = [];
    globalThis.fetch = async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
      const request = input instanceof Request ? input : new Request(input, init);
      requests.push(request);
      return Response.json({
        branding: {
          accent_color: "#6D5DFC",
          header_style: "compact",
          tagline: "Video first",
          theme: "dark",
        },
        community: "cmt_test",
        default_surface: "videos",
        id: "cmt_test",
        object: "community_presentation",
      });
    };

    try {
      const client = new ApiClient({
        baseUrl: "http://pirate.test",
        getToken: () => "session-token",
      });

      await client.communities.updatePresentation("cmt_test", {
        branding: {
          accent_color: "#6D5DFC",
          header_style: "compact",
          tagline: "Video first",
          theme: "dark",
        },
        default_surface: "videos",
      });

      expect(requests.map((request) => `${request.method} ${request.url}`)).toEqual([
        "POST http://pirate.test/communities/cmt_test/presentation",
      ]);
      expect(requests[0]?.headers.get("authorization")).toBe("Bearer session-token");
      expect(await requests[0]?.json()).toEqual({
        branding: {
          accent_color: "#6D5DFC",
          header_style: "compact",
          tagline: "Video first",
          theme: "dark",
        },
        default_surface: "videos",
      });
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  test("calls community Telegram broadcast channel endpoints", async () => {
    const requests: Request[] = [];
    globalThis.fetch = async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
      const request = input instanceof Request ? input : new Request(input, init);
      requests.push(request);

      if (request.url.endsWith("/setup-intents")) {
        return Response.json({
          id: "tsi_channel",
          object: "telegram_setup_intent",
          community: "cmt_test",
          status: "pending",
          expires_at: 1_777_000_600,
          bot_start_parameter: "tgchan_test",
          bot_deep_link: "https://t.me/pirate_bot?start=tgchan_test",
        });
      }

      if (request.url.endsWith("/unlink")) {
        return Response.json({
          id: "tcd_test",
          object: "telegram_channel_destination",
          unlinked: true,
        });
      }

      if (request.url.endsWith("/backfill")) {
        return Response.json({ enqueued: 20 }, { status: 202 });
      }

      return Response.json(null);
    };

    try {
      const client = new ApiClient({
        baseUrl: "http://pirate.test",
        getToken: () => "session-token",
      });

      const destination = await client.communities.getTelegramChannel("cmt_test");
      await client.communities.createTelegramChannelSetupIntent("cmt_test");
      await client.communities.backfillTelegramChannel("cmt_test", { limit: 20 });
      await client.communities.unlinkTelegramChannel("cmt_test");

      expect(destination).toBeNull();
      expect(requests.map((request) => `${request.method} ${request.url}`)).toEqual([
        "GET http://pirate.test/communities/cmt_test/telegram-channel",
        "POST http://pirate.test/communities/cmt_test/telegram-channel/setup-intents",
        "POST http://pirate.test/communities/cmt_test/telegram-channel/backfill",
        "POST http://pirate.test/communities/cmt_test/telegram-channel/unlink",
      ]);
      expect(requests.every((request) => request.headers.get("authorization") === "Bearer session-token")).toBe(true);
      expect(await requests[2]!.json()).toEqual({ limit: 20 });
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  test("quotes community handles as JSON", async () => {
    let request: Request | null = null;
    globalThis.fetch = async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
      request = input instanceof Request ? input : new Request(input, init);
      return Response.json({
        id: "hcq_test",
        object: "community_handle_quote",
        community: "com_cmt_test",
        namespace: "ns_test",
        desired_label: "amira",
        label: "amira",
        label_normalized: "amira",
        eligible: true,
        availability: "available",
        price_cents: 0,
        currency: "USD",
        payment_instructions: null,
        quote_ttl_seconds: 600,
        quoted_at: 1,
        expires_at: 2,
      });
    };

    try {
      const client = new ApiClient({
        baseUrl: "http://pirate.test",
        getToken: () => "session-token",
      });

      await client.communities.quoteHandle("cmt_test", { desired_label: "amira" });

      const capturedRequest = requireRequest(request);
      expect(capturedRequest.method).toBe("POST");
      expect(capturedRequest.url).toBe("http://pirate.test/communities/cmt_test/handles/quote");
      expect(await capturedRequest.json()).toEqual({ desired_label: "amira" });
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  test("claims community handles as JSON", async () => {
    let request: Request | null = null;
    globalThis.fetch = async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
      request = input instanceof Request ? input : new Request(input, init);
      return Response.json({
        id: "ch_test",
        object: "community_handle",
        community: "com_cmt_test",
        namespace: "ns_test",
        user: "usr_test",
        label: "amira",
        label_normalized: "amira",
        status: "active",
        issuance_source: "claim",
        quote: "hcq_test",
        price_cents: 0,
        currency: "USD",
        created: 1,
      });
    };

    try {
      const client = new ApiClient({
        baseUrl: "http://pirate.test",
        getToken: () => "session-token",
      });

      await client.communities.claimHandle("cmt_test", {
        quote: "hcq_test",
        settlement_wallet_attachment: "wa_test",
        funding_tx_ref: "0xtx",
        settlement_tx_ref: "0xtx",
      });

      const capturedRequest = requireRequest(request);
      expect(capturedRequest.method).toBe("POST");
      expect(capturedRequest.url).toBe("http://pirate.test/communities/cmt_test/handles/claim");
      expect(await capturedRequest.json()).toEqual({
        quote: "hcq_test",
        settlement_wallet_attachment: "wa_test",
        funding_tx_ref: "0xtx",
        settlement_tx_ref: "0xtx",
      });
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  test("sends profile media uploads as multipart form data", async () => {
    let request: Request | null = null;
    globalThis.fetch = async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
      request = input instanceof Request ? input : new Request(input, init);
      return Response.json({
        kind: "cover",
        media_ref: "http://pirate.test/profile-media/cover/cover_test.png",
        mime_type: "image/png",
        size_bytes: 4,
        storage_bucket: "pirate-media",
        storage_object_key: "profile-media/cover/cover_test.png",
      });
    };

    try {
      const client = new ApiClient({
        baseUrl: "http://pirate.test",
        getToken: () => "session-token",
      });

      await client.profiles.uploadMedia({
        kind: "cover",
        file: makeTestFile("cover.png", "image/png"),
      });

      const capturedRequest = requireRequest(request);
      expect(capturedRequest.url).toBe("http://pirate.test/profile-media");
      const formData = await capturedRequest.formData();
      expect(formData.get("kind")).toBe("cover");
      const file = formData.get("file");
      expect(file instanceof File).toBe(true);
      expect((file as File).name).toBe("cover.png");
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  test("sends post image uploads through community media", async () => {
    let request: Request | null = null;
    globalThis.fetch = async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
      request = input instanceof Request ? input : new Request(input, init);
      return Response.json({
        kind: "post_image",
        media_ref: "http://pirate.test/community-media/post_image/post_image_test.gif",
        mime_type: "image/gif",
        size_bytes: 4,
        storage_bucket: "pirate-media",
        storage_object_key: "community-media/post_image/post_image_test.gif",
      });
    };

    try {
      const client = new ApiClient({
        baseUrl: "http://pirate.test",
        getToken: () => "session-token",
      });

      await client.communities.uploadMedia({
        kind: "post_image",
        file: makeTestFile("post.gif", "image/gif"),
      });

      const capturedRequest = requireRequest(request);
      expect(capturedRequest.url).toBe("http://pirate.test/community-media");
      const formData = await capturedRequest.formData();
      expect(formData.get("kind")).toBe("post_image");
      const file = formData.get("file");
      expect(file instanceof File).toBe(true);
      expect((file as File).name).toBe("post.gif");
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  test("sends comment image uploads through community media", async () => {
    let request: Request | null = null;
    globalThis.fetch = async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
      request = input instanceof Request ? input : new Request(input, init);
      return Response.json({
        kind: "comment_image",
        media_ref: "http://pirate.test/community-media/comment_image/comment_image_test.gif",
        mime_type: "image/gif",
        size_bytes: 4,
        storage_bucket: "pirate-media",
        storage_object_key: "community-media/comment_image/comment_image_test.gif",
      });
    };

    try {
      const client = new ApiClient({
        baseUrl: "http://pirate.test",
        getToken: () => "session-token",
      });

      await client.communities.uploadMedia({
        kind: "comment_image",
        file: makeTestFile("comment.gif", "image/gif"),
      });

      const capturedRequest = requireRequest(request);
      expect(capturedRequest.url).toBe("http://pirate.test/community-media");
      const formData = await capturedRequest.formData();
      expect(formData.get("kind")).toBe("comment_image");
      const file = formData.get("file");
      expect(file instanceof File).toBe(true);
      expect((file as File).name).toBe("comment.gif");
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  test("syncs linked handles with a POST request", async () => {
    let request: Request | null = null;
    globalThis.fetch = async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
      request = input instanceof Request ? input : new Request(input, init);
      return Response.json({
        user: "usr_test",
        global_handle: {
          global_handle_id: "ghl_test",
          label: "captainblackbeard.pirate",
          tier: "generated",
          status: "active",
          issuance_source: "generated_signup",
          issued_at: "2026-04-17T00:00:00.000Z",
        },
        linked_handles: [
          {
            linked_handle: "global:ghl_test",
            label: "captainblackbeard.pirate",
            kind: "pirate",
            verification_state: "verified",
          },
          {
            linked_handle: "lnk_ens_test",
            label: "blackbeard.eth",
            kind: "ens",
            verification_state: "verified",
          },
        ],
        primary_public_handle: {
          linked_handle: "lnk_ens_test",
          label: "blackbeard.eth",
          kind: "ens",
          verification_state: "verified",
        },
        created: "2026-04-17T00:00:00.000Z",
        updated: "2026-04-17T00:00:00.000Z",
      });
    };

    try {
      const client = new ApiClient({
        baseUrl: "http://pirate.test",
        getToken: () => "session-token",
      });

      const profile = await client.profiles.syncLinkedHandles();
      const capturedRequest = requireRequest(request);
      expect(capturedRequest.method).toBe("POST");
      expect(capturedRequest.url).toBe("http://pirate.test/profiles/me/sync-linked-handles");
      expect(profile.primary_public_handle?.label).toBe("blackbeard.eth");
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  test("sends primary public handle selection as JSON", async () => {
    let request: Request | null = null;
    globalThis.fetch = async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
      request = input instanceof Request ? input : new Request(input, init);
      return Response.json({
        user: "usr_test",
        global_handle: {
          global_handle_id: "ghl_test",
          label: "captainblackbeard.pirate",
          tier: "generated",
          status: "active",
          issuance_source: "generated_signup",
          issued_at: "2026-04-17T00:00:00.000Z",
        },
        linked_handles: [],
        primary_public_handle: null,
        created: "2026-04-17T00:00:00.000Z",
        updated: "2026-04-17T00:00:00.000Z",
      });
    };

    try {
      const client = new ApiClient({
        baseUrl: "http://pirate.test",
        getToken: () => "session-token",
      });

      await client.profiles.setPrimaryPublicHandle("lnk_ens_test");

      const capturedRequest = requireRequest(request);
      expect(capturedRequest.method).toBe("POST");
      expect(capturedRequest.url).toBe("http://pirate.test/profiles/me/set-primary-public-handle");
      expect(JSON.stringify(await capturedRequest.json())).toBe(
        JSON.stringify({ linked_handle: "lnk_ens_test" }),
      );
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  test("publishes XMTP inbox using current and legacy payload keys", async () => {
    let request: Request | null = null;
    globalThis.fetch = async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
      request = input instanceof Request ? input : new Request(input, init);
      return Response.json({
        id: "usr_test",
        object: "profile",
        display_name: "Captain",
        avatar_ref: null,
        avatar_source: null,
        cover_ref: null,
        cover_source: null,
        bio: null,
        bio_source: null,
        preferred_locale: null,
        display_verified_nationality_badge: false,
        nationality_badge_country: null,
        linked_handles: [],
        primary_public_handle: null,
        primary_wallet_address: "0x0000000000000000000000000000000000000001",
        xmtp_inbox: "xmtp-inbox-test",
        global_handle: {
          global_handle_id: "ghl_test",
          label: "captain.pirate",
          tier: "standard",
          status: "active",
          issuance_source: "free_cleanup_rename",
          issued_at: "2026-04-17T00:00:00.000Z",
        },
        created: "2026-04-17T00:00:00.000Z",
      });
    };

    try {
      const client = new ApiClient({
        baseUrl: "http://pirate.test",
        getToken: () => "session-token",
      });

      await client.profiles.publishXmtpInboxId("xmtp-inbox-test");

      const capturedRequest = requireRequest(request);
      expect(capturedRequest.method).toBe("POST");
      expect(capturedRequest.url).toBe("http://pirate.test/profiles/me/xmtp-inbox");
      expect(await capturedRequest.json()).toEqual({
        xmtp_inbox: "xmtp-inbox-test",
      });
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  test("sends agent name updates as JSON patch requests", async () => {
    let request: Request | null = null;
    globalThis.fetch = async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
      request = input instanceof Request ? input : new Request(input, init);
      return Response.json({
        agent_id: "agt_test",
        owner_user_id: "usr_test",
        display_name: "Night Signal",
        status: "active",
        current_ownership_record_id: "aor_test",
        current_ownership: null,
        created: "2026-04-17T00:00:00.000Z",
        updated: "2026-04-17T00:10:00.000Z",
      });
    };

    try {
      const client = new ApiClient({
        baseUrl: "http://pirate.test",
        getToken: () => "session-token",
      });

      await client.agents.update("agt_test", { display_name: "Night Signal" });

      const capturedRequest = requireRequest(request);
      expect(capturedRequest.method).toBe("POST");
      expect(capturedRequest.url).toBe("http://pirate.test/agents/agt_test");
      expect(capturedRequest.headers.get("authorization")).toBe("Bearer session-token");
      expect(JSON.stringify(await capturedRequest.json())).toBe(
        JSON.stringify({ display_name: "Night Signal" }),
      );
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  test("loads public profiles without auth headers", async () => {
    let request: Request | null = null;
    globalThis.fetch = async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
      request = input instanceof Request ? input : new Request(input, init);
      return Response.json({
        requested_handle_label: "captain.pirate",
        resolved_handle_label: "captain.pirate",
        is_canonical: true,
        created_communities: [
          {
            community: "cmt_test",
            display_name: "Test Builders",
            route_slug: null,
            created: "2026-04-17T00:00:00.000Z",
          },
        ],
        profile: {
          id: "usr_test",
          global_handle: {
            global_handle_id: "ghl_test",
            label: "captain.pirate",
            tier: "standard",
            status: "active",
            issuance_source: "free_cleanup_rename",
            issued_at: "2026-04-17T00:00:00.000Z",
          },
          linked_handles: [],
          primary_public_handle: null,
          display_name: "Captain",
          bio: null,
          avatar_ref: null,
          cover_ref: null,
          preferred_locale: null,
          created: "2026-04-17T00:00:00.000Z",
          updated: "2026-04-17T00:00:00.000Z",
        },
      });
    };

    try {
      const client = new ApiClient({
        baseUrl: "http://pirate.test",
        getToken: () => "session-token",
      });

      const profile = await client.publicProfiles.getByHandle("captain");
      const capturedRequest = requireRequest(request);
      expect(capturedRequest.method).toBe("GET");
      expect(capturedRequest.url).toBe("http://pirate.test/public-profiles/captain");
      expect(capturedRequest.headers.get("authorization")).toBe(null);
      expect(profile.profile.display_name).toBe("Captain");
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  test("loads authenticated profile activity with tab and locale params", async () => {
    let request: Request | null = null;
    globalThis.fetch = async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
      request = input instanceof Request ? input : new Request(input, init);
      return Response.json({
        comments: [],
        next_cursor: null,
        overview_items: [],
        posts: [],
        tab: "posts",
      });
    };

    try {
      const client = new ApiClient({
        baseUrl: "http://pirate.test",
        getToken: () => "session-token",
      });

      await client.profiles.getActivity({ limit: 25, locale: "en-US", tab: "posts" });
      const capturedRequest = requireRequest(request);
      const url = new URL(capturedRequest.url);
      expect(capturedRequest.method).toBe("GET");
      expect(url.pathname).toBe("/profiles/me/activity");
      expect(url.searchParams.get("limit")).toBe("25");
      expect(url.searchParams.get("locale")).toBe("en-US");
      expect(url.searchParams.get("tab")).toBe("posts");
      expect(capturedRequest.headers.get("authorization")).toBe("Bearer session-token");
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  test("loads public profile activity without auth headers", async () => {
    let request: Request | null = null;
    globalThis.fetch = async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
      request = input instanceof Request ? input : new Request(input, init);
      return Response.json({
        comments: [],
        next_cursor: null,
        overview_items: [],
        posts: [],
        tab: "comments",
      });
    };

    try {
      const client = new ApiClient({
        baseUrl: "http://pirate.test",
        getToken: () => "session-token",
      });

      await client.publicProfiles.getActivity("captain.pirate", { limit: 10, tab: "comments" });
      const capturedRequest = requireRequest(request);
      const url = new URL(capturedRequest.url);
      expect(capturedRequest.method).toBe("GET");
      expect(url.pathname).toBe("/public-profiles/captain.pirate/activity");
      expect(url.searchParams.get("limit")).toBe("10");
      expect(url.searchParams.get("tab")).toBe("comments");
      expect(capturedRequest.headers.get("authorization")).toBe(null);
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  test("loads the authenticated home feed with sort and locale params", async () => {
    let request: Request | null = null;
    globalThis.fetch = async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
      request = input instanceof Request ? input : new Request(input, init);
      return Response.json({
        items: [],
        next_cursor: null,
        top_communities: [],
      });
    };

    try {
      const client = new ApiClient({
        baseUrl: "http://pirate.test",
        getToken: () => "session-token",
      });

      await client.feed.home({
        locale: "es",
        sort: "top",
      });

      const capturedRequest = requireRequest(request);
      expect(capturedRequest.url).toBe("http://pirate.test/feed/home?locale=es&sort=top");
      expect(capturedRequest.headers.get("authorization")).toBe("Bearer session-token");
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  test("falls back to anonymous home feed when an optional token is rejected", async () => {
    const requests: Request[] = [];
    globalThis.fetch = async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
      const request = input instanceof Request ? input : new Request(input, init);
      requests.push(request);
      if (requests.length === 1) {
        return Response.json({
          code: "auth_error",
          message: "Authentication failed",
          retryable: false,
        }, { status: 401 });
      }
      return Response.json({
        items: [],
        next_cursor: null,
        top_communities: [],
      });
    };

    try {
      const client = new ApiClient({
        baseUrl: "http://pirate.test",
        getToken: () => "stale-session-token",
      });

      await client.feed.home({ locale: "en" });

      expect(requests).toHaveLength(2);
      expect(requests[0]?.headers.get("authorization")).toBe("Bearer stale-session-token");
      expect(requests[1]?.headers.get("authorization")).toBe(null);
      expect(requests[1]?.url).toBe("http://pirate.test/feed/home?locale=en");
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  test("loads public home feed without auth headers", async () => {
    let request: Request | null = null;
    globalThis.fetch = async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
      request = input instanceof Request ? input : new Request(input, init);
      return Response.json({
        items: [],
        next_cursor: null,
        top_communities: [],
      });
    };

    try {
      const client = new ApiClient({
        baseUrl: "http://pirate.test",
        getToken: () => "session-token",
      });

      await client.feed.publicHome({
        locale: "es",
        sort: "top",
      });

      const capturedRequest = requireRequest(request);
      expect(capturedRequest.url).toBe("http://pirate.test/feed/home/public?locale=es&sort=top");
      expect(capturedRequest.headers.get("authorization")).toBe(null);
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  test("loads authenticated and public video feeds from dedicated endpoints", async () => {
    const requests: Request[] = [];
    globalThis.fetch = async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
      const request = input instanceof Request ? input : new Request(input, init);
      requests.push(request);
      return Response.json({ items: [], next_cursor: null, top_communities: [] });
    };

    try {
      const client = new ApiClient({
        baseUrl: "http://pirate.test",
        getToken: () => "session-token",
      });

      await client.feed.videos({ cursor: "v1:1000:25", locale: "en" });
      await client.feed.publicVideos({ locale: "en" });

      expect(requests[0]?.url).toBe("http://pirate.test/feed/home/videos?cursor=v1%3A1000%3A25&locale=en");
      expect(requests[0]?.headers.get("authorization")).toBe("Bearer session-token");
      expect(requests[1]?.url).toBe("http://pirate.test/feed/home/videos/public?locale=en");
      expect(requests[1]?.headers.get("authorization")).toBe(null);
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  test("loads public communities without auth headers", async () => {
    const requests: Request[] = [];
    globalThis.fetch = async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
      const request = input instanceof Request ? input : new Request(input, init);
      requests.push(request);

      if (request.url.endsWith("/public-communities/captain-club/posts?locale=en-US&sort=top")) {
        return Response.json({
          items: [],
        });
      }

      return Response.json({
        community: "cmt_test",
        display_name: "Captain Club",
        description: "Public preview",
        avatar_ref: null,
        banner_ref: null,
        membership_mode: "open",
        human_verification_lane: "self",
        member_count: null,
        membership_gate_summaries: [],
        viewer_membership_status: "not_member",
        created: "2026-04-17T00:00:00.000Z",
      });
    };

    try {
      const client = new ApiClient({
        baseUrl: "http://pirate.test",
        getToken: () => "session-token",
      });

      const community = await client.publicCommunities.get("captain-club");
      await client.publicCommunities.listVideos("captain-club", {
        cursor: "v2:1000:25",
        locale: "en-US",
        sort: "best",
      });
      await client.publicCommunities.listPosts("captain-club", {
        locale: "en-US",
        sort: "top",
      });

      expect(requests[0]?.method).toBe("GET");
      expect(requests[0]?.url).toBe("http://pirate.test/public-communities/captain-club");
      expect(requests[0]?.headers.get("authorization")).toBe(null);
      expect(requests[1]?.url).toBe("http://pirate.test/public-communities/captain-club/feed/videos?cursor=v2%3A1000%3A25&locale=en-US&sort=best");
      expect(requests[1]?.headers.get("authorization")).toBe(null);
      expect(requests[2]?.url).toBe("http://pirate.test/public-communities/captain-club/posts?locale=en-US&sort=top");
      expect(requests[2]?.headers.get("authorization")).toBe(null);
      expect(community.display_name).toBe("Captain Club");
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  test("loads authenticated community feeds with locale and sort params", async () => {
    const requests: Request[] = [];
    globalThis.fetch = async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
      requests.push(input instanceof Request ? input : new Request(input, init));
      return Response.json({ items: [], next_cursor: null, top_communities: [] });
    };

    try {
      const client = new ApiClient({
        baseUrl: "http://pirate.test",
        getToken: () => "session-token",
      });

      await client.communities.listPosts("cmt_test", {
        has_event: true,
        limit: "100",
        locale: "nl",
        sort: "top",
      });
      await client.communities.listVideos("cmt_test", {
        cursor: "v2:1000:25",
        locale: "nl",
        sort: "best",
      });

      expect(requests[0]?.method).toBe("GET");
      expect(requests[0]?.url).toBe("http://pirate.test/communities/cmt_test/posts?has_event=true&limit=100&locale=nl&sort=top");
      expect(requests[0]?.headers.get("authorization")).toBe("Bearer session-token");
      expect(requests[1]?.url).toBe("http://pirate.test/communities/cmt_test/feed/videos?cursor=v2%3A1000%3A25&locale=nl&sort=best");
      expect(requests[1]?.headers.get("authorization")).toBe("Bearer session-token");
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  test("cancels community event posts", async () => {
    let request: Request | null = null;
    globalThis.fetch = async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
      request = input instanceof Request ? input : new Request(input, init);
      return Response.json({
        post: {
          id: "post_pst_event",
          event: { status: "canceled" },
        },
      });
    };

    try {
      const client = new ApiClient({
        baseUrl: "http://pirate.test",
        getToken: () => "session-token",
      });

      await client.posts.cancelEvent("cmt_test", "post_pst_event");

      const capturedRequest = requireRequest(request);
      expect(capturedRequest.method).toBe("POST");
      expect(capturedRequest.url).toBe("http://pirate.test/communities/cmt_test/posts/post_pst_event/event-status");
      expect(capturedRequest.headers.get("authorization")).toBe("Bearer session-token");
      expect(await capturedRequest.json()).toEqual({ status: "canceled" });
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  test("adds locale to post and comment read requests", async () => {
    const requests: Request[] = [];
    globalThis.fetch = async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
      const request = input instanceof Request ? input : new Request(input, init);
      requests.push(request);
      return Response.json({});
    };

    try {
      const client = new ApiClient({
        baseUrl: "http://pirate.test",
        getToken: () => "session-token",
      });

      await client.posts.get("pst_test", { locale: "nl" });
      await client.posts.vote("pst_test", 1);
      await client.communities.listComments("cmt_test", "pst_test", {
        locale: "nl",
        sort: "best",
        limit: "25",
      });
      await client.communities.createComment("cmt_test", "pst_test", {
        body: "Top level",
      });
      await client.comments.listReplies("cmt_reply", {
        locale: "nl",
        sort: "new",
      });
      await client.comments.createReply("cmt_reply", {
        body: "Reply body",
      });
      await client.comments.delete("cmt_reply");
      await client.comments.vote("cmt_reply", 1);

      expect(requests[0]?.url).toBe("http://pirate.test/posts/pst_test?locale=nl");
      expect(requests[1]?.url).toBe("http://pirate.test/posts/pst_test/vote");
      expect(requests[2]?.url).toBe(
        "http://pirate.test/communities/cmt_test/posts/pst_test/comments?limit=25&locale=nl&sort=best",
      );
      expect(requests[3]?.url).toBe("http://pirate.test/communities/cmt_test/posts/pst_test/comments");
      expect(requests[4]?.url).toBe("http://pirate.test/comments/cmt_reply/replies?locale=nl&sort=new");
      expect(requests[5]?.url).toBe("http://pirate.test/comments/cmt_reply/replies");
      expect(requests[6]?.url).toBe("http://pirate.test/comments/cmt_reply/delete");
      expect(requests[6]?.method).toBe("POST");
      expect(requests[7]?.url).toBe("http://pirate.test/comments/cmt_reply/vote");
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  test("sends ALTCHA payload headers only when provided", async () => {
    const requests: Request[] = [];
    globalThis.fetch = async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
      const request = input instanceof Request ? input : new Request(input, init);
      requests.push(request);
      if (request.url.endsWith("/join")) {
        return Response.json({ community: "cmt_test", status: "joined" });
      }
      return Response.json({});
    };

    try {
      const client = new ApiClient({
        baseUrl: "http://pirate.test",
        getToken: () => "session-token",
      });

      await client.communities.join("cmt_test", undefined, { altchaPayload: "join-proof" });
      await client.communities.createPost("cmt_test", {
        idempotency_key: "post-proof-test",
        post_type: "text",
        title: "Proof test",
      }, { altchaPayload: "post-proof" });
      await client.communities.createComment("cmt_test", "pst_test", {
        body: "Top level",
      }, { altchaPayload: "comment-proof" });
      await client.posts.vote("pst_test", 1, { altchaPayload: "post-vote-proof" });
      await client.posts.clearVote("pst_test", { altchaPayload: "post-clear-proof" });
      await client.comments.vote("cmt_vote", -1, { altchaPayload: "comment-vote-proof" });
      await client.comments.createReply("cmt_reply", {
        body: "Reply body",
      }, { altchaPayload: null });
      await client.posts.vote("pst_no_proof", 1);

      expect(requests[0]?.headers.get("x-pirate-altcha")).toBe("join-proof");
      expect(requests[1]?.headers.get("x-pirate-altcha")).toBe("post-proof");
      expect(requests[2]?.headers.get("x-pirate-altcha")).toBe("comment-proof");
      expect(requests[3]?.headers.get("x-pirate-altcha")).toBe("post-vote-proof");
      expect(requests[4]?.headers.get("x-pirate-altcha")).toBe("post-clear-proof");
      expect(requests[4]?.url).toEndWith("/posts/pst_test/clear_vote");
      expect(requests[5]?.headers.get("x-pirate-altcha")).toBe("comment-vote-proof");
      expect(requests[6]?.headers.has("x-pirate-altcha")).toBe(false);
      expect(requests[7]?.headers.has("x-pirate-altcha")).toBe(false);
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  test("loads public thread routes without auth headers", async () => {
    const requests: Request[] = [];
    globalThis.fetch = async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
      const request = input instanceof Request ? input : new Request(input, init);
      requests.push(request);
      return Response.json({ items: [], post: { post: "pst_test" } });
    };

    try {
      const client = new ApiClient({
        baseUrl: "http://pirate.test",
        getToken: () => "session-token",
      });

      await client.publicPosts.get("pst_test", { locale: "zh-Hans" });
      await client.publicPosts.getThread("pst_test", { limit: "25", locale: "zh-Hans", sort: "best" });
      await client.publicPosts.getKaraoke("pst_test", { locale: "zh-Hans" });
      await client.publicComments.listPostComments("pst_test", { limit: "25", locale: "zh-Hans", sort: "best" });
      await client.publicComments.listReplies("cmt_test", { locale: "zh-Hans", sort: "new" });

      expect(requests[0]?.url).toBe("http://pirate.test/public-posts/pst_test?locale=zh-Hans");
      expect(requests[0]?.headers.get("authorization")).toBe(null);
      expect(requests[1]?.url).toBe("http://pirate.test/public-posts/pst_test/thread?limit=25&locale=zh-Hans&sort=best");
      expect(requests[1]?.headers.get("authorization")).toBe(null);
      expect(requests[2]?.url).toBe("http://pirate.test/public-posts/pst_test/karaoke?locale=zh-Hans");
      expect(requests[2]?.headers.get("authorization")).toBe(null);
      expect(requests[3]?.url).toBe("http://pirate.test/public-comments/posts/pst_test/comments?limit=25&locale=zh-Hans&sort=best");
      expect(requests[3]?.headers.get("authorization")).toBe(null);
      expect(requests[4]?.url).toBe("http://pirate.test/public-comments/cmt_test/replies?locale=zh-Hans&sort=new");
      expect(requests[4]?.headers.get("authorization")).toBe(null);
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  test("waits briefly for a late auth refresh callback before failing a 401", async () => {
    const requests: Request[] = [];
    let token = "stale-token";

    globalThis.fetch = async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
      const request = input instanceof Request ? input : new Request(input, init);
      requests.push(request);

      if (request.headers.get("authorization") === "Bearer fresh-token") {
        return Response.json({
          id: "usr_test",
          auth_sources: [],
          created: "2026-04-17T00:00:00.000Z",
          updated: "2026-04-17T00:00:00.000Z",
        });
      }

      return Response.json({
        code: "auth_error",
        message: "Authentication failed",
        retryable: false,
      }, { status: 401 });
    };

    try {
      const client = new ApiClient({
        baseUrl: "http://pirate.test",
        getToken: () => token,
      });

      const requestPromise = client.users.getMe();
      globalThis.setTimeout(() => {
        client.setRefreshAuthCallback(async () => {
          token = "fresh-token";
          return true;
        });
      }, 10);

      const result = await requestPromise;

      expect(result.id).toBe("usr_test");
      expect(requests).toHaveLength(2);
      expect(requests[0]?.headers.get("authorization")).toBe("Bearer stale-token");
      expect(requests[1]?.headers.get("authorization")).toBe("Bearer fresh-token");
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  test("waits for auth refresh before sending an authenticated request without a token", async () => {
    const requests: Request[] = [];
    let token: string | null = null;

    globalThis.fetch = async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
      const request = input instanceof Request ? input : new Request(input, init);
      requests.push(request);

      return Response.json({
        id: "usr_test",
        auth_sources: [],
        created: "2026-04-17T00:00:00.000Z",
        updated: "2026-04-17T00:00:00.000Z",
      });
    };

    try {
      const client = new ApiClient({
        baseUrl: "http://pirate.test",
        getToken: () => token,
      });

      const requestPromise = client.users.getMe();
      globalThis.setTimeout(() => {
        client.setRefreshAuthCallback(async () => {
          token = "fresh-token";
          return true;
        });
      }, 10);

      const result = await requestPromise;

      expect(result.id).toBe("usr_test");
      expect(requests).toHaveLength(1);
      expect(requests[0]?.headers.get("authorization")).toBe("Bearer fresh-token");
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  test("lists song artifact bundles for composer pickers", async () => {
    let request: Request | null = null;
    globalThis.fetch = async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
      request = input instanceof Request ? input : new Request(input, init);
      return Response.json({
        items: [{
          id: "sab_song_bundle",
          object: "song_artifact_bundle",
          community: "com_cmt_test",
          creator_user: "usr_test",
          status: "ready",
          title: "Live Room Song",
          primary_audio: { storage_ref: "ref", mime_type: "audio/wav" },
          media_refs: [],
          lyrics: "line",
          lyrics_sha256: "0xhash",
          preview_status: "completed",
          translation_status: "pending",
          alignment_status: "completed",
          moderation_status: "completed",
          created: 1,
        }],
        next_cursor: null,
      });
    };

    try {
      const client = new ApiClient({
        baseUrl: "http://pirate.test",
        getToken: () => "session-token",
      });

      const response = await client.communities.listSongArtifactBundles("cmt_test", {
        q: "Live",
        limit: 10,
      });

      const capturedRequest = requireRequest(request);
      expect(capturedRequest.method).toBe("GET");
      expect(capturedRequest.url).toBe("http://pirate.test/communities/cmt_test/song-artifacts?q=Live&limit=10");
      expect(capturedRequest.headers.get("authorization")).toBe("Bearer session-token");
      expect(response.items[0]?.id).toBe("sab_song_bundle");
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  test("requires an auth header for study payload reads", async () => {
    let request: Request | null = null;
    globalThis.fetch = async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
      request = input instanceof Request ? input : new Request(input, init);
      return Response.json({
        object: "song_study_payload",
        post_id: "post_pst_test",
        community_id: "com_cmt_test",
        access: "processing",
        title: "Study",
        exercise_count: 0,
        exercises: [],
      });
    };

    try {
      const client = new ApiClient({
        baseUrl: "http://pirate.test",
        getToken: () => "session-token",
      });

      await client.communities.getPostStudy("cmt_test", "post_pst_test", { targetLanguage: "es" });

      const capturedRequest = requireRequest(request);
      expect(capturedRequest.method).toBe("GET");
      expect(capturedRequest.url).toBe("http://pirate.test/communities/cmt_test/posts/post_pst_test/study?target_language=es");
      expect(capturedRequest.headers.get("authorization")).toBe("Bearer session-token");
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  test("posts study attempts with body idempotency", async () => {
    let request: Request | null = null;
    globalThis.fetch = async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
      request = input instanceof Request ? input : new Request(input, init);
      return Response.json({
        object: "song_study_attempt_result",
        exercise_id: "ex_say_1",
        outcome: "correct",
        attempts_remaining: 1,
      });
    };

    try {
      const client = new ApiClient({
        baseUrl: "http://pirate.test",
        getToken: () => "session-token",
      });

      await client.communities.submitPostStudyAttempt("cmt_test", "post_pst_test", {
        idempotency_key: "study-attempt-1",
        exercise_id: "ex_say_1",
        type: "say_it_back",
        attempt_number: 1,
        transcript: "I was lost in the midnight waves",
      });

      const capturedRequest = requireRequest(request);
      expect(capturedRequest.method).toBe("POST");
      expect(capturedRequest.url).toBe("http://pirate.test/communities/cmt_test/posts/post_pst_test/study/attempts");
      expect(capturedRequest.headers.get("authorization")).toBe("Bearer session-token");
      expect(await capturedRequest.json()).toEqual({
        idempotency_key: "study-attempt-1",
        exercise_id: "ex_say_1",
        type: "say_it_back",
        attempt_number: 1,
        transcript: "I was lost in the midnight waves",
      });
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  test("posts study transcription audio as form data", async () => {
    let request: Request | null = null;
    globalThis.fetch = async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
      request = input instanceof Request ? input : new Request(input, init);
      return Response.json({
        object: "song_study_transcription",
        provider: "elevenlabs",
        model: "scribe_v2",
        text: "I was lost in the midnight waves",
        confidence: null,
        language_code: "en",
        language_probability: null,
        duration_seconds: 2,
      });
    };

    try {
      const client = new ApiClient({
        baseUrl: "http://pirate.test",
        getToken: () => "session-token",
      });

      await client.communities.transcribePostStudyAudio("cmt_test", "post_pst_test", {
        file: new File([new Blob(["audio"], { type: "audio/webm" })], "study.webm", { type: "audio/webm" }),
      });

      const capturedRequest = requireRequest(request);
      expect(capturedRequest.method).toBe("POST");
      expect(capturedRequest.url).toBe("http://pirate.test/communities/cmt_test/posts/post_pst_test/study/transcriptions");
      expect(capturedRequest.headers.get("authorization")).toBe("Bearer session-token");
      expect(capturedRequest.headers.get("content-type")).toContain("multipart/form-data");
      const form = await capturedRequest.formData();
      expect(form.get("file")).toBeInstanceOf(File);
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  test("requires an auth header for live-room replay draft reads", async () => {
    let request: Request | null = null;
    globalThis.fetch = async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
      request = input instanceof Request ? input : new Request(input, init);
      return Response.json({
        object: "live_room_replay_draft",
        live_room: "liv_test",
        recording_enabled: true,
        replay_status: "review_pending",
        status: "ready",
        replay_asset: null,
        recording: null,
      });
    };

    try {
      const client = new ApiClient({
        baseUrl: "http://pirate.test",
        getToken: () => "session-token",
      });

      await client.communities.getLiveRoomReplayDraft("cmt_test", "liv_test");

      const capturedRequest = requireRequest(request);
      expect(capturedRequest.method).toBe("GET");
      expect(capturedRequest.url).toBe("http://pirate.test/communities/cmt_test/live-rooms/liv_test/replay-draft");
      expect(capturedRequest.headers.get("authorization")).toBe("Bearer session-token");
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  test("publishes live-room replay drafts with the selected access mode", async () => {
    let request: Request | null = null;
    globalThis.fetch = async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
      request = input instanceof Request ? input : new Request(input, init);
      return Response.json({
        object: "live_room_replay_draft",
        live_room: "liv_test",
        recording_enabled: true,
        replay_status: "published",
        status: "published",
        replay_asset: null,
        recording: null,
      });
    };

    try {
      const client = new ApiClient({
        baseUrl: "http://pirate.test",
        getToken: () => "session-token",
      });

      await client.communities.publishLiveRoomReplayDraft("cmt_test", "liv_test", { access_mode: "included_with_ticket" });

      const capturedRequest = requireRequest(request);
      expect(capturedRequest.method).toBe("POST");
      expect(capturedRequest.url).toBe("http://pirate.test/communities/cmt_test/live-rooms/liv_test/replay-draft/publish");
      expect(capturedRequest.headers.get("authorization")).toBe("Bearer session-token");
      await expect(capturedRequest.json()).resolves.toEqual({ access_mode: "included_with_ticket" });
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  test("can fetch live-room replay content as a raw response", async () => {
    let request: Request | null = null;
    globalThis.fetch = async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
      request = input instanceof Request ? input : new Request(input, init);
      return new Response("encrypted replay", {
        status: 200,
        headers: { "content-type": "application/octet-stream" },
      });
    };

    try {
      const client = new ApiClient({
        baseUrl: "http://pirate.test",
        getToken: () => "session-token",
      });

      const response = await client.communities.getLiveRoomReplayContent("cmt_test", "liv_test");

      const capturedRequest = requireRequest(request);
      expect(capturedRequest.method).toBe("GET");
      expect(capturedRequest.url).toBe("http://pirate.test/communities/cmt_test/live-rooms/liv_test/replay/content");
      expect(capturedRequest.headers.get("authorization")).toBe("Bearer session-token");
      expect(response).toBeInstanceOf(Response);
      await expect(response.text()).resolves.toBe("encrypted replay");
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  test("can read public live-room replay access and content without an auth header", async () => {
    const requests: Request[] = [];
    globalThis.fetch = async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
      const request = input instanceof Request ? input : new Request(input, init);
      requests.push(request);
      if (request.url.endsWith("/replay/content")) {
        return new Response("public replay", {
          status: 200,
          headers: { "content-type": "video/mp4" },
        });
      }
      return Response.json({
        live_room: "liv_test",
        replay_asset: "lra_test",
        replay_listing: null,
        replay_status: "published",
        access_mode: "free",
        locked_delivery_status: "none",
        access_granted: true,
        decision_reason: "free",
        delivery_kind: "primary_content_ref",
        delivery_ref: "/public-communities/cmt_test/live-rooms/liv_test/replay/content",
        story_cdr_access: null,
      });
    };

    try {
      const client = new ApiClient({
        baseUrl: "http://pirate.test",
        getToken: () => "session-token",
      });

      const access = await client.publicCommunities.getLiveRoomReplayAccess("cmt_test", "liv_test");
      const response = await client.publicCommunities.getLiveRoomReplayContent("cmt_test", "liv_test");

      expect(requests[0]?.method).toBe("GET");
      expect(requests[0]?.url).toBe("http://pirate.test/public-communities/cmt_test/live-rooms/liv_test/replay/access");
      expect(requests[0]?.headers.has("authorization")).toBe(false);
      expect(access.access_granted).toBe(true);
      expect(access.delivery_kind).toBe("primary_content_ref");
      expect(requests[1]?.method).toBe("GET");
      expect(requests[1]?.url).toBe("http://pirate.test/public-communities/cmt_test/live-rooms/liv_test/replay/content");
      expect(requests[1]?.headers.has("authorization")).toBe(false);
      expect(response).toBeInstanceOf(Response);
      await expect(response.text()).resolves.toBe("public replay");
    } finally {
      globalThis.fetch = originalFetch;
    }
  });
});
});
