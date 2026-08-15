import { within } from "@testing-library/dom";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";

import { Tabs } from "@/components/disclosure/tabs/tabs";
import { expectNoA11yViolations, render } from "@/test/test-utils";

import { FlatTabBar, FlatTabButton, FlatTabsList, FlatTabsTrigger } from "./flat-tabs";

describe("FlatTabs", () => {
  it("renders tab buttons with the active underline on the active tab", () => {
    const container = render(() => (
      <FlatTabBar columns={2}>
        <FlatTabButton active>Feed</FlatTabButton>
        <FlatTabButton>About</FlatTabButton>
      </FlatTabBar>
    ));

    const feed = within(container).getByRole("button", { name: "Feed" });
    const about = within(container).getByRole("button", { name: "About" });
    expect(feed).toHaveClass("border-primary");
    expect(about).toHaveClass("border-transparent");
  });

  it("calls onClick when a tab button is activated", async () => {
    const user = userEvent.setup();
    let selected = "";
    const container = render(() => (
      <FlatTabBar columns={2}>
        <FlatTabButton active onClick={() => (selected = "feed")}>
          Feed
        </FlatTabButton>
        <FlatTabButton onClick={() => (selected = "about")}>About</FlatTabButton>
      </FlatTabBar>
    ));

    await user.click(within(container).getByRole("button", { name: "About" }));
    expect(selected).toBe("about");
  });

  it("renders the actions slot", () => {
    const container = render(() => (
      <FlatTabBar actions={<button type="button">Sort</button>} columns={1}>
        <FlatTabButton active>Feed</FlatTabButton>
      </FlatTabBar>
    ));

    expect(within(container).getByRole("button", { name: "Sort" })).toBeVisible();
  });

  it("forwards the computed grid columns style to the tab list", () => {
    const container = render(() => (
      <Tabs value="tab1">
        <FlatTabsList columns={3}>
          <FlatTabsTrigger value="tab1">Posts</FlatTabsTrigger>
          <FlatTabsTrigger value="tab2">Comments</FlatTabsTrigger>
          <FlatTabsTrigger value="tab3">Saved</FlatTabsTrigger>
        </FlatTabsList>
      </Tabs>
    ));

    const list = within(container).getByRole("tablist");
    expect(list.style.gridTemplateColumns).toBe(
      "repeat(3, minmax(0, 1fr))",
    );
  });

  it("has no automated a11y violations", async () => {
    render(() => (
      <FlatTabBar columns={2}>
        <FlatTabButton active>Feed</FlatTabButton>
        <FlatTabButton>About</FlatTabButton>
      </FlatTabBar>
    ));

    await expectNoA11yViolations();
  });});
