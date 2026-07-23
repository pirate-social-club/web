import "@/test/setup-runtime";

import * as React from "react";
import { afterEach, describe, expect, test } from "bun:test";
import { cleanup, render } from "@testing-library/react";

import { VideoHomeChromeContext, useVideoHomeChrome } from "./video-home-chrome-context";

function Registration({ active }: { active: boolean }) {
  useVideoHomeChrome(active);
  return null;
}

function Harness({ active }: { active: boolean }) {
  const [overlay, setOverlay] = React.useState(false);
  return (
    <VideoHomeChromeContext.Provider value={setOverlay}>
      <Registration active={active} />
      <output>{overlay ? "overlay" : "default"}</output>
    </VideoHomeChromeContext.Provider>
  );
}

afterEach(cleanup);

describe("useVideoHomeChrome", () => {
  test("activates only for the resolved video surface and clears on cleanup", () => {
    const view = render(<Harness active={false} />);
    expect(view.getByText("default")).toBeTruthy();

    view.rerender(<Harness active />);
    expect(view.getByText("overlay")).toBeTruthy();

    view.unmount();
    const fallback = render(<Harness active={false} />);
    expect(fallback.getByText("default")).toBeTruthy();
  });
});
