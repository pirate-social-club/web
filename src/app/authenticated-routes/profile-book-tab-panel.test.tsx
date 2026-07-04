import * as React from "react";
import { afterEach, beforeEach, describe, expect, mock, test } from "bun:test";
import { cleanup, fireEvent, render, waitFor } from "@testing-library/react";

import { installDomGlobals } from "@/test/setup-dom";
import type { ResolvedSlot } from "@/components/compositions/bookings/view-models";

installDomGlobals();

let fakeSession: unknown = null;
const requestAuth = mock((_m: string) => {});

mock.module("@/lib/api/session-store", () => ({ useSession: () => fakeSession }));
mock.module("@/hooks/use-request-auth", () => ({ useRequestAuth: () => requestAuth }));

const { ProfileBookTabPanel } = await import("./profile-book-tab-panel");

const SLOTS: ResolvedSlot[] = [
  { startUtc: "2099-01-05T10:00:00.000Z" as ResolvedSlot["startUtc"], endUtc: "2099-01-05T10:30:00.000Z" as ResolvedSlot["endUtc"], priceCents: 5000 as ResolvedSlot["priceCents"], available: true },
];

beforeEach(() => {
  fakeSession = null;
  requestAuth.mockClear();
});

afterEach(() => {
  cleanup();
});

describe("ProfileBookTabPanel viewer slot gate", () => {
  // The anchor-bypass fix: a logged-out tap on a profile Book-tab slot must open the sign-in modal and
  // NOT follow the checkout link (which would 401 into a sign-in page).
  test("logged-out slot tap prompts sign-in and prevents navigation", async () => {
    const { container } = render(<ProfileBookTabPanel hostUserId="usr_host" slots={SLOTS} loading={false} />);
    const anchor = await waitFor(() => {
      const a = container.querySelector("a[href*='/checkout']") as HTMLAnchorElement | null;
      if (!a) throw new Error("slot link not rendered");
      return a;
    });
    // fireEvent.click returns false when the handler called preventDefault (i.e. navigation blocked).
    const notPrevented = fireEvent.click(anchor);
    expect(requestAuth).toHaveBeenCalledTimes(1);
    expect(notPrevented).toBe(false);
  });

  test("signed-in slot tap does not prompt sign-in (link navigates normally)", async () => {
    fakeSession = { accessToken: "tok" };
    const { container } = render(<ProfileBookTabPanel hostUserId="usr_host" slots={SLOTS} loading={false} />);
    const anchor = await waitFor(() => {
      const a = container.querySelector("a[href*='/checkout']") as HTMLAnchorElement | null;
      if (!a) throw new Error("slot link not rendered");
      return a;
    });
    const notPrevented = fireEvent.click(anchor);
    expect(requestAuth).not.toHaveBeenCalled();
    expect(notPrevented).toBe(true);
  });
});
