import { screen, within } from "@testing-library/dom";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";

import { expectNoA11yViolations, render } from "@/test/test-utils";

import { ResponsiveOptionSelect } from "./responsive-option-select";

const options = [
  { label: "Best", value: "best" },
  { label: "New", value: "new" },
  { label: "Top", value: "top", disabled: true, disabledReason: "Requires login" },
];

describe("ResponsiveOptionSelect", () => {
  it("renders nothing without a value or options", () => {
    const container = render(() => (
      <ResponsiveOptionSelect
        ariaLabel="Sort"
        drawerTitle="Sort"
        options={options}
      />
    ));

    expect(container.innerHTML).toBe("");
  });

  it("shows the active option label in the triggers", () => {
    const container = render(() => (
      <ResponsiveOptionSelect
        ariaLabel="Sort"
        drawerTitle="Sort"
        options={options}
        value="best"
      />
    ));

    expect(within(container).getAllByText("Best").length).toBeGreaterThan(0);
  });

  it("opens the mobile sheet, reports the selection, and closes", async () => {
    const user = userEvent.setup();
    let selected = "";
    const container = render(() => (
      <ResponsiveOptionSelect
        ariaLabel="Sort"
        drawerTitle="Sort feed"
        onValueChange={(value) => (selected = value)}
        options={options}
        value="best"
      />
    ));

    const triggers = within(container).getAllByRole("button", { name: "Sort" });
    const sheetTrigger = triggers.find(
      (trigger) => trigger.getAttribute("aria-haspopup") === "dialog",
    );
    expect(sheetTrigger).toBeDefined();
    await user.click(sheetTrigger!);
    const dialog = await screen.findByRole("dialog");
    expect(within(dialog).getByText("Sort feed")).toBeVisible();
    expect(within(dialog).getByText("Requires login")).toBeVisible();

    await user.click(within(dialog).getByRole("button", { name: /New/ }));
    expect(selected).toBe("new");
  });

  it("has no automated a11y violations", async () => {
    render(() => (
      <ResponsiveOptionSelect
        ariaLabel="Sort"
        drawerTitle="Sort"
        options={options}
        value="best"
      />
    ));

    await expectNoA11yViolations();
  });
});
