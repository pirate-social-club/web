import { within } from "@testing-library/dom";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";

import { expectNoA11yViolations, render } from "@/test/test-utils";

import { MobilePageHeader } from "./mobile-page-header";

describe("MobilePageHeader", () => {
  it("renders the centered title", () => {
    const container = render(() => <MobilePageHeader title="Notifications" />);

    expect(within(container).getByText("Notifications")).toBeVisible();
  });

  it("renders a close affordance that fires onCloseClick", async () => {
    const user = userEvent.setup();
    let closed = 0;
    const container = render(() => (
      <MobilePageHeader title="Compose" onCloseClick={() => (closed += 1)} />
    ));

    await user.click(within(container).getByRole("button", { name: "Close" }));
    expect(closed).toBe(1);
  });

  it("renders a tappable title when onTitleClick is set", async () => {
    const user = userEvent.setup();
    let opened = 0;
    const container = render(() => (
      <MobilePageHeader title="wavemaker" onTitleClick={() => (opened += 1)} />
    ));

    await user.click(within(container).getByRole("button", { name: "Open wavemaker" }));
    expect(opened).toBe(1);
  });

  it("has no automated a11y violations", async () => {
    render(() => (
      <MobilePageHeader title="Notifications" onBackClick={() => {}} />
    ));

    await expectNoA11yViolations();
  });
});
