import { act, renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, mock, test } from "bun:test";

import { installDomGlobals } from "@/test/setup-dom";
import type {
  AvailabilityException,
  AvailabilityRule,
  BookingProfileResponse,
  PriceRule,
} from "@/lib/api/bookings-types";

installDomGlobals();

class FakeApiError extends Error {}

const calls: string[] = [];
let ruleStore: AvailabilityRule[] = [];
let exceptionStore: AvailabilityException[] = [];
let priceRuleStore: PriceRule[] = [];
let profileResponse: BookingProfileResponse = { object: "booking_profile", exists: false, host: "usr_self" };
let appWalletAddress: string | null = "0xAppWallet0000000000000000000000000000beef";

function rule(id: string): AvailabilityRule {
  return { object: "availability_rule", id, by_weekday: [1], start_local: "09:00", end_local: "17:00", slot_duration_seconds: 1800, effective_from: null, effective_until: null, created: 0, updated: 0 };
}

const updateArgs: unknown[] = [];
const createRuleArgs: unknown[] = [];

const fakeApi = {
  hostBookings: {
    getBookingProfile: async () => { calls.push("getBookingProfile"); return profileResponse; },
    listAvailabilityRules: async () => ({ data: ruleStore }),
    listAvailabilityExceptions: async () => ({ data: exceptionStore }),
    listPriceRules: async () => ({ data: priceRuleStore }),
    updateBookingProfile: async (body: unknown) => { calls.push("updateBookingProfile"); updateArgs.push(body); return profileResponse; },
    publishBookingProfile: async () => { calls.push("publishBookingProfile"); return { object: "booking_profile", host: "usr_self", is_published: true } as unknown as BookingProfileResponse; },
    unpublishBookingProfile: async () => { calls.push("unpublishBookingProfile"); return { object: "booking_profile", host: "usr_self", is_published: false } as unknown as BookingProfileResponse; },
    createAvailabilityRule: async (body: unknown) => { calls.push("createAvailabilityRule"); createRuleArgs.push(body); ruleStore = [...ruleStore, rule("bar_new")]; return rule("bar_new"); },
    deleteAvailabilityRule: async (id: string) => { calls.push("deleteAvailabilityRule"); ruleStore = ruleStore.filter((r) => r.id !== id); },
    createAvailabilityException: async () => { calls.push("createAvailabilityException"); },
    deleteAvailabilityException: async () => { calls.push("deleteAvailabilityException"); },
    createPriceRule: async () => { calls.push("createPriceRule"); },
    deletePriceRule: async () => { calls.push("deletePriceRule"); },
  },
};

mock.module("@/lib/api", () => ({ useApi: () => fakeApi }));
mock.module("@/lib/api/client", () => ({ ApiError: FakeApiError }));
mock.module("@/lib/api/session-store", () => ({ useSession: () => ({ profile: { primary_wallet_address: appWalletAddress } }) }));
mock.module("@/components/primitives/sonner", () => ({ toast: { success: () => {}, error: () => {} } }));

const { useBookingHostSettings } = await import("./use-booking-host-settings");

async function mountLoaded() {
  const hook = renderHook(() => useBookingHostSettings());
  await waitFor(() => expect(hook.result.current.loading).toBe(false));
  return hook;
}

describe("useBookingHostSettings", () => {
  beforeEach(() => {
    calls.length = 0;
    updateArgs.length = 0;
    createRuleArgs.length = 0;
    ruleStore = [];
    exceptionStore = [];
    priceRuleStore = [];
    profileResponse = { object: "booking_profile", exists: false, host: "usr_self" };
    appWalletAddress = "0xAppWallet0000000000000000000000000000beef";
  });

  test("payoutReady reflects the app wallet (no separate payout field)", async () => {
    const { result } = await mountLoaded();
    expect(result.current.sectionProps.payoutReady).toBe(true);
    // @ts-expect-error — payoutWallet is no longer part of the values shape
    expect(result.current.sectionProps.values.payoutWallet).toBeUndefined();
  });

  test("publish is gated when there is no app wallet", async () => {
    appWalletAddress = null;
    const { result } = await mountLoaded();
    expect(result.current.sectionProps.payoutReady).toBe(false);
  });

  test("save profile persists the app wallet as the payout destination", async () => {
    const { result } = await mountLoaded();
    act(() => result.current.sectionProps.onValuesChange({ priceUsd: "50.00", timezone: "Europe/Vienna" }));
    await act(async () => { await result.current.sectionProps.onSaveProfile?.(); });
    expect(calls).toContain("updateBookingProfile");
    expect(updateArgs[0]).toMatchObject({ base_price_cents: 5000, host_timezone: "Europe/Vienna", payout_wallet_address: appWalletAddress });
  });

  test("invalid base price blocks save and sets an inline error", async () => {
    const { result } = await mountLoaded();
    act(() => result.current.sectionProps.onValuesChange({ priceUsd: "not-a-number" }));
    await act(async () => { await result.current.sectionProps.onSaveProfile?.(); });
    expect(calls).not.toContain("updateBookingProfile");
    expect(result.current.sectionProps.basePriceError).toBeTruthy();
  });

  test("add then remove a weekly availability rule round-trips through the API", async () => {
    const { result } = await mountLoaded();
    await act(async () => { await result.current.sectionProps.onAddRule?.({ byWeekday: [1, 2, 3], startLocal: "09:00", endLocal: "17:00" }); });
    expect(calls).toContain("createAvailabilityRule");
    expect(createRuleArgs[0]).toMatchObject({ by_weekday: [1, 2, 3], start_local: "09:00", end_local: "17:00" });
    expect(result.current.sectionProps.rules).toHaveLength(1);

    await act(async () => { await result.current.sectionProps.onDeleteRule?.("bar_new"); });
    expect(calls).toContain("deleteAvailabilityRule");
    expect(result.current.sectionProps.rules).toHaveLength(0);
  });

  test("publish persists the profile first, then publishes; unpublish flips back", async () => {
    const { result } = await mountLoaded();
    await act(async () => { await result.current.sectionProps.onTogglePublish?.(); });
    expect(calls).toContain("updateBookingProfile"); // persisted before publish (no save-order footgun)
    expect(calls).toContain("publishBookingProfile");
    expect(calls.indexOf("updateBookingProfile")).toBeLessThan(calls.indexOf("publishBookingProfile"));
    expect(result.current.sectionProps.isPublished).toBe(true);

    await act(async () => { await result.current.sectionProps.onTogglePublish?.(); });
    expect(calls).toContain("unpublishBookingProfile");
    expect(result.current.sectionProps.isPublished).toBe(false);
  });
});
