import { within } from "@testing-library/dom";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";

import { expectNoA11yViolations, render } from "@/test/test-utils";

import { MobileFooterNav } from "./mobile-footer-nav";

describe("MobileFooterNav", () => {
  it("renders nothing without forceMobile on a non-mobile viewport", () => {
    const container = render(() => <MobileFooterNav />);

    expect(container.querySelector("nav")).toBeNull();
  });

  it("renders all five destinations with the active item marked", () => {
    const container = render(() => (
      <MobileFooterNav activeItem="inbox" forceMobile />
    ));

    const nav = within(container).getByRole("navigation", {
      name: "Primary navigation",
    });
    expect(within(nav).getByRole("button", { name: "Home" })).toBeVisible();
    expect(within(nav).getByRole("button", { name: "Wallet" })).toBeVisible();
    expect(within(nav).getByRole("button", { name: "Chat" })).toBeVisible();
    expect(within(nav).getByRole("button", { name: "Inbox" })).toHaveAttribute(
      "aria-current",
      "page",
    );
    expect(within(nav).getByRole("button", { name: "Profile" })).toBeVisible();
  });

  it("fires the haptic callback before the item action", async () => {
    const user = userEvent.setup();
    const order: string[] = [];
    const container = render(() => (
      <MobileFooterNav
        forceMobile
        onTapHaptic={() => order.push("haptic")}
        onHomeClick={() => order.push("home")}
      />
    ));

    await user.click(within(container).getByRole("button", { name: "Home" }));
    expect(order).toEqual(["haptic", "home"]);
  });

  it("shows unread badges with accessible counts", () => {
    const container = render(() => (
      <MobileFooterNav forceMobile unreadChatCount={3} unreadInboxCount={120} />
    ));

    expect(within(container).getByRole("button", { name: "Chat, 3" })).toBeVisible();
    const inbox = within(container).getByRole("button", { name: "Inbox, 120" });
    expect(inbox.querySelector(".notification-count-badge")).toHaveTextContent("99+");
  });

  it("has no automated a11y violations", async () => {
    render(() => <MobileFooterNav forceMobile />);

    await expectNoA11yViolations();
  });
});
