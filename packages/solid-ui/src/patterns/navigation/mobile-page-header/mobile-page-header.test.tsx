import { within } from "@testing-library/dom";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { expectNoA11yViolations, render } from "@/test/test-utils";

import { MobilePageHeader } from "./mobile-page-header";

describe("MobilePageHeader", () => {
  it("renders a centered title and back callback", async () => {
    const user = userEvent.setup();
    const onBackClick = vi.fn();
    const container = render(() => <MobilePageHeader onBackClick={onBackClick} title="Settings" />);
    expect(within(container).getByText("Settings")).toBeInTheDocument();
    expect(within(container).getByRole("banner")).toHaveClass("fixed");
    await user.click(within(container).getByRole("button", { name: "Back" }));
    expect(onBackClick).toHaveBeenCalledTimes(1);
  });

  it("prefers close over back and supports a tappable title", async () => {
    const user = userEvent.setup();
    const onCloseClick = vi.fn();
    const onTitleClick = vi.fn();
    const container = render(() => (
      <MobilePageHeader onBackClick={vi.fn()} onCloseClick={onCloseClick} onTitleClick={onTitleClick} title="Atlas" titleActionAriaLabel="Open community" />
    ));
    await user.click(within(container).getByRole("button", { name: "Close" }));
    await user.click(within(container).getByRole("button", { name: "Open community" }));
    expect(onCloseClick).toHaveBeenCalledTimes(1);
    expect(onTitleClick).toHaveBeenCalledTimes(1);
  });

  it("has no axe violations", async () => {
    render(() => <MobilePageHeader title="Settings" />);
    await expectNoA11yViolations();
    document.documentElement.classList.add("light");
    await expectNoA11yViolations();
    document.documentElement.classList.remove("light");
  });
});
