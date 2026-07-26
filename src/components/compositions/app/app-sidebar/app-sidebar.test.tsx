import "@/test/setup-runtime";

import { describe, expect, test } from "bun:test";
import { renderToStaticMarkup } from "react-dom/server";
import { Bell, ChatCircle, House } from "@phosphor-icons/react";

import { SidebarProvider } from "@/components/compositions/system/sidebar/sidebar";

import { AppSidebar, type AppSidebarPrimaryItem } from "./app-sidebar";

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
