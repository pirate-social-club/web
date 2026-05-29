import { describe, expect, test } from "bun:test";

import {
  buildBasePostRequest,
  buildCreatePostEventRequest,
  resolveCreatePostIdentity,
  signIfAgent,
} from "./base";

describe("create post submit base helpers", () => {
  test("buildBasePostRequest includes shared create-post fields", () => {
    expect(buildBasePostRequest({
      idempotencyKey: "idem_test",
      identityMode: "public",
      visibility: "members_only",
    })).toEqual({
      anonymous_scope: undefined,
      disclosed_qualifier_ids: undefined,
      identity_mode: "public",
      idempotency_key: "idem_test",
      translation_policy: "machine_allowed",
      visibility: "members_only",
    });
  });

  test("buildBasePostRequest includes anonymous identity details", () => {
    expect(buildBasePostRequest({
      anonymousScope: "community_stable",
      disclosedQualifierIds: ["qual_one", "qual_two"],
      idempotencyKey: "idem_test",
      identityMode: "anonymous",
      visibility: "public",
    })).toEqual({
      anonymous_scope: "community_stable",
      disclosed_qualifier_ids: ["qual_one", "qual_two"],
      identity_mode: "anonymous",
      idempotency_key: "idem_test",
      translation_policy: "machine_allowed",
      visibility: "public",
    });
  });

  test("resolveCreatePostIdentity preserves allowed anonymous identity", () => {
    expect(resolveCreatePostIdentity({
      allowAnonymousIdentity: true,
      anonymousIdentityScope: "thread_stable",
      authorMode: "human",
      composerMode: "text",
      requestedIdentityMode: "anonymous",
      selectedQualifierIds: ["qual_one"],
    })).toEqual({
      anonymousScope: "thread_stable",
      disclosedQualifierIds: ["qual_one"],
      identityMode: "anonymous",
    });
  });

  test("resolveCreatePostIdentity forces public identity for agent authorship", () => {
    expect(resolveCreatePostIdentity({
      allowAnonymousIdentity: true,
      anonymousIdentityScope: "community_stable",
      authorMode: "agent",
      composerMode: "text",
      requestedIdentityMode: "anonymous",
      selectedQualifierIds: ["qual_one"],
    })).toEqual({
      anonymousScope: undefined,
      disclosedQualifierIds: undefined,
      identityMode: "public",
    });
  });

  test("buildCreatePostEventRequest converts datetime-local values in the selected timezone", () => {
    expect(buildCreatePostEventRequest({
      enabled: true,
      startsAt: "2026-06-12T20:00",
      endsAt: "2026-06-12T23:30",
      timezone: "Asia/Tbilisi",
      locationName: "Left Bank",
      address: "Dedaena Park, Tbilisi",
      eventUrl: "ra.co/events/test",
      place: {
        label: "Left Bank",
        lat: 41.7033,
        lon: 44.8024,
        source: "geoapify",
      },
    })).toEqual({
      starts_at: 1_781_280_000,
      ends_at: 1_781_292_600,
      timezone: "Asia/Tbilisi",
      location_name: "Left Bank",
      address: "Dedaena Park, Tbilisi",
      is_online: false,
      event_url: "https://ra.co/events/test",
      status: "scheduled",
      place: {
        label: "Left Bank",
        lat: 41.7033,
        lon: 44.8024,
        source: "geoapify",
      },
    });
  });

  test("buildCreatePostEventRequest rejects incomplete enabled events", () => {
    expect(() => buildCreatePostEventRequest({
      enabled: true,
      startsAt: "2026-06-12T20:00",
      timezone: "Asia/Tblisi",
      isOnline: true,
    })).toThrow("Choose a valid event timezone.");

    expect(() => buildCreatePostEventRequest({
      enabled: true,
      startsAt: "2026-06-12T20:00",
      timezone: "Asia/Tbilisi",
    })).toThrow("Add an event location or mark the event online.");
  });

  test("signIfAgent passes through human-authored requests", async () => {
    const request = { post_type: "text" as const, title: "Hello" };
    let signCalls = 0;

    const result = await signIfAgent({
      authorMode: "human",
      path: "/communities/com_test/posts",
      request,
      signAgentAuthoredBody: async (path, body) => {
        signCalls += 1;
        return { ...body, signed_path: path };
      },
    });

    expect(result).toBe(request);
    expect(signCalls).toBe(0);
  });

  test("signIfAgent signs agent-authored requests", async () => {
    const request = { post_type: "text" as const, title: "Hello" };
    const result = await signIfAgent({
      authorMode: "agent",
      path: "/communities/com_test/posts",
      request,
      signAgentAuthoredBody: async (path, body) => ({
        ...body,
        signed_path: path,
      }),
    });

    expect(result).toEqual({
      post_type: "text",
      signed_path: "/communities/com_test/posts",
      title: "Hello",
    });
  });
});
