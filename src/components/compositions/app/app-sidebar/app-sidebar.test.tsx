import "@/test/setup-runtime";

import { describe, expect, test } from "bun:test";
import { renderToStaticMarkup } from "react-dom/server";
import { Bell, ChatCircle, House } from "@phosphor-icons/react";

import { SidebarProvider } from "@/components/compositions/system/sidebar/sidebar";

import { AppSidebar, filterPrimaryItemsForLayout, type AppSidebarPrimaryItem, type AppSidebarSection } from "./app-sidebar";

function renderSidebar(primaryItems: AppSidebarPrimaryItem[]) {
  return renderToStaticMarkup(
    <SidebarProvider>
      <AppSidebar appearance="media" primaryItems={primaryItems} />
    </SidebarProvider>,
  );
}

describe("AppSidebar spine badges", () => {
  test("renders the unread badge on the item and folds the count into the aria label", () => {
    const markup = renderSidebar([
      { icon: House, id: "home", label: "For You" },
      { badgeCount: 3, icon: Bell, id: "activity", label: "Activity" },
    ]);

    expect(markup).toContain("notification-count-badge");
    expect(markup).toContain(">3</span>");
    expect(markup).toContain('aria-label="Activity, 3"');
  });

  test("caps large counts at 99+", () => {
    const markup = renderSidebar([
      { badgeCount: 128, icon: ChatCircle, id: "chat", label: "Chat" },
    ]);

    expect(markup).toContain(">99+</span>");
    expect(markup).not.toContain(">128</span>");
  });

  test("hides the badge when the count is zero or unset", () => {
    const markup = renderSidebar([
      { badgeCount: 0, icon: Bell, id: "activity", label: "Activity" },
      { icon: ChatCircle, id: "chat", label: "Chat" },
    ]);

    expect(markup).not.toContain("notification-count-badge");
    expect(markup).not.toContain('aria-label="Activity, 0"');
  });
});

describe("AppSidebar sections", () => {
  function renderSections(sections: AppSidebarSection[]) {
    return renderToStaticMarkup(
      <SidebarProvider>
        <AppSidebar appearance="media" primaryItems={[]} sections={sections} />
      </SidebarProvider>,
    );
  }

  test("shows the empty label instead of a bare header when a section has no items", () => {
    const markup = renderSections([
      { defaultOpen: true, emptyLabel: "No communities yet", id: "communities", items: [], label: "Communities" },
    ]);

    expect(markup).toContain("No communities yet");
  });

  test("drops the empty label once the section has items", () => {
    const markup = renderSections([
      {
        defaultOpen: true,
        emptyLabel: "No communities yet",
        id: "communities",
        items: [{ id: "c/com_cmt_1", label: "Garage Tapes" }],
        label: "Communities",
      },
    ]);

    expect(markup).toContain("Garage Tapes");
    expect(markup).not.toContain("No communities yet");
  });

  // The Communities header already reads "Communities"; a nested "Your Communities"
  // row under it rendered as a bare, avatar-less line that looked like a subheading.
  test("does not reintroduce a Your Communities row inside the Communities section", () => {
    const markup = renderSections([
      {
        defaultOpen: true,
        emptyLabel: "No communities yet",
        id: "communities",
        items: [{ id: "c/com_cmt_1", label: "Garage Tapes" }],
        label: "Communities",
      },
    ]);

    expect(markup).not.toContain("Your Communities");
  });
});

describe("AppSidebar mobile drawer", () => {
  test("keeps footer destinations out of the primary drawer list", () => {
    const items = [
      { icon: House, id: "home", label: "For You" },
      { icon: House, id: "popular", label: "Best" },
      { icon: Bell, id: "activity", label: "Activity" },
      { icon: ChatCircle, id: "chat", label: "Chat" },
      { icon: House, id: "community-feed", label: "Explore" },
      { icon: House, id: "live", label: "Live" },
      { icon: House, id: "wallet", label: "Wallet" },
      { icon: House, id: "upload", label: "Upload" },
      { icon: House, id: "profile", label: "Profile" },
    ] as AppSidebarPrimaryItem[];

    expect(filterPrimaryItemsForLayout(items, true).map((item) => item.id)).toEqual([
      "community-feed",
      "live",
      "upload",
    ]);
    expect(filterPrimaryItemsForLayout(items, false)).toEqual(items);
  });
});
