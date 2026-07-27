import { expect, test, type Page, type Route } from "@playwright/test";

import { installAuthenticatedApiMocks, installMockSession } from "./fixtures/api-mocks";
import {
  createPaidBookingMockState,
  installPaidBookingApiMocks,
} from "./fixtures/booking-mocks";
import {
  createMockHomeFeedItem,
  mockCommunityId,
  mockProfile,
} from "./fixtures/auth-session";
import { expectNoBrowserError } from "./fixtures/e2e-helpers";

const HOST = "usr_feed_booking_host";
const FEED_PRICE_CENTS = 3500;
const SLOT_PRICE_CENTS = 5000;
const pirateApiPattern = /https?:\/\/(?:api-staging\.pirate\.sc|api\.pirate\.sc|127\.0\.0\.1:8787)\/.*/u;

function json(body: unknown, status = 200) {
  return { body: JSON.stringify(body), contentType: "application/json", status };
}

function bookableVideoItem() {
  const item = createMockHomeFeedItem({
    id: "pst_feed_booking_e2e",
    title: "Book a class from this video",
  });
  item.post.post.author_user = HOST;
  item.post.post.caption = "A deterministic bookable video.";
  item.post.post.media_refs = [{
    mime_type: "video/mp4",
    size_bytes: 12,
    storage_ref: "data:video/mp4;base64,AAAA",
  }];
  item.post.post.post_type = "video";
  return {
    ...item,
    booking: {
      base_price_cents: FEED_PRICE_CENTS,
      currency: "USDC",
      has_available_slot: true,
      host_user_id: HOST,
      starting_price_cents: SLOT_PRICE_CENTS,
    },
  };
}

function unavailableVideoItem() {
  const item = bookableVideoItem();
  item.post.post.id = "pst_feed_booking_unavailable";
  item.post.post.post = "pst_feed_booking_unavailable";
  return { ...item, booking: undefined };
}

async function installFeedBookingFixture(
  page: Page,
  options: { authenticated?: boolean; items?: unknown[] } = {},
): Promise<void> {
  await installAuthenticatedApiMocks(page);
  if (options.authenticated !== false) await installMockSession(page);
  const booking = createPaidBookingMockState({
    basePriceCents: FEED_PRICE_CENTS,
    hostUserId: HOST,
    slotPriceCents: SLOT_PRICE_CENTS,
  });
  await installPaidBookingApiMocks(page, booking);
  await page.route(pirateApiPattern, async (route: Route) => {
    const request = route.request();
    const url = new URL(request.url());
    if (
      request.method() === "GET"
      && (
        url.pathname === "/feed/home/videos"
        || url.pathname === "/feed/home/videos/public"
      )
    ) {
      await route.fulfill(json({
        items: options.items ?? [bookableVideoItem()],
        next_cursor: null,
        top_communities: [],
      }));
      return;
    }
    if (request.method() === "GET" && url.pathname === `/profiles/${HOST}`) {
      await route.fulfill(json({
        ...mockProfile,
        id: HOST,
        display_name: "Feed Booking Host",
        global_handle: {
          ...mockProfile.global_handle,
          id: "gh_feed_booking_host",
          label: "feed-booking-host.pirate",
        },
      }));
      return;
    }
    await route.fallback();
  });
}

for (const viewport of [
  { name: "desktop", width: 1440, height: 900 },
  { name: "mobile", width: 390, height: 844 },
] as const) {
  test(`Home → Book → slot → checkout works on ${viewport.name}`, async ({ page }) => {
    await page.setViewportSize(viewport);
    await installFeedBookingFixture(page);
    await page.goto("/");

    const book = page.getByRole("button", { name: "Book" });
    await expect(book).toBeVisible({ timeout: 30_000 });
    await expect(page.getByText("$50+")).toBeVisible();
    await expect(page.getByText("$35+")).toHaveCount(0);

    await book.click();
    await expect(page.getByRole("heading", { name: "Book feed-booking-host.pirate" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Play video" })).toBeVisible();

    await page.getByRole("button", { name: "Close" }).click();
    await expect(page.getByRole("button", { name: "Pause video" })).toBeVisible();
    await book.click();

    const slot = page.getByRole("link", { name: /\$50/u }).first();
    await expect(slot).toBeVisible();
    await expect(page.getByText("50.00 USDC")).toHaveCount(0);
    await slot.click();

    await expect(page.getByRole("heading", { name: "Confirm booking" })).toBeVisible();
    const checkout = new URL(page.url());
    expect(checkout.pathname).toBe(`/c/${mockCommunityId}/book/${HOST}/checkout`);
    expect(checkout.searchParams.get("start")).toBe("2099-01-05T10:00:00.000Z");
    expect(checkout.searchParams.get("end")).toBe("2099-01-05T10:30:00.000Z");
    await expectNoBrowserError(page);
  });
}

test("a feed item without current booking discovery never renders a dead Book action", async ({ page }) => {
  await installFeedBookingFixture(page, { items: [unavailableVideoItem()] });
  await page.goto("/");
  await expect(page.getByRole("button", { name: "Book" })).toHaveCount(0);
});

test("logged-out viewers can discover a bookable host and inspect real slots", async ({ page }) => {
  await installFeedBookingFixture(page, { authenticated: false });
  await page.goto("/");

  const book = page.getByRole("button", { name: "Book" });
  await expect(book).toBeVisible({ timeout: 30_000 });
  await expect(page.getByText("$50+")).toBeVisible();
  await book.click();
  await expect(page.getByRole("heading", { name: "Book feed-booking-host.pirate" })).toBeVisible();
  await expect(page.getByRole("link", { name: /\$50/u }).first()).toBeVisible();
  await expectNoBrowserError(page);
});
