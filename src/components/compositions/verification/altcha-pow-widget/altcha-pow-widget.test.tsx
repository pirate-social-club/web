import "@/test/setup-runtime";

import { afterEach, describe, expect, mock, test } from "bun:test";

mock.module("altcha", () => ({}));

const { cleanup, render, waitFor } = await import("@testing-library/react");
const { AltchaPowWidget } = await import("./altcha-pow-widget");

afterEach(() => {
  cleanup();
});

describe("AltchaPowWidget", () => {
  test("renders loading state inline without card framing", () => {
    const { container, getByText } = render(
      <AltchaPowWidget
        action="community:com_test"
        challengeLoader={() => new Promise(() => undefined)}
        onPayloadChange={() => undefined}
        scope="post_create"
      />,
    );

    expect(getByText("Checking your browser\u2026")).toBeTruthy();
    expect(container.innerHTML).not.toContain("rounded");
    expect(container.innerHTML).not.toContain("border");
    expect(container.innerHTML).not.toContain("shadow");
  });

  test("runs the challenge as an invisible widget with inline progress", async () => {
    const challengeLoader = mock(async () => ({
      algorithm: "SHA-256",
      challenge: "challenge",
      maxnumber: 100,
      salt: "salt",
      signature: "signature",
    }));

    const { container, getByText } = render(
      <AltchaPowWidget
        action="community:com_test"
        challengeLoader={challengeLoader}
        onPayloadChange={() => undefined}
        scope="post_create"
      />,
    );

    await waitFor(() => expect(getByText("Checking your browser\u2026")).toBeTruthy());

    const widget = container.querySelector("altcha-widget");
    expect(widget?.getAttribute("display")).toBe("invisible");
    expect(widget?.getAttribute("auto")).toBe("off");
    expect(container.innerHTML).not.toContain("rounded");
    expect(container.innerHTML).not.toContain("border");
    expect(container.innerHTML).not.toContain("shadow");
  });

  test("does not request a new challenge when the payload callback identity changes", async () => {
    const challengeLoader = mock(async () => ({
      algorithm: "SHA-256",
      challenge: "challenge",
      maxnumber: 100,
      salt: "salt",
      signature: "signature",
    }));
    const firstPayloadChange = mock(() => undefined);
    const secondPayloadChange = mock(() => undefined);

    const { rerender } = render(
      <AltchaPowWidget
        action="community:com_test"
        challengeLoader={challengeLoader}
        onPayloadChange={firstPayloadChange}
        scope="post_create"
      />,
    );

    await waitFor(() => expect(challengeLoader).toHaveBeenCalledTimes(1));

    rerender(
      <AltchaPowWidget
        action="community:com_test"
        challengeLoader={challengeLoader}
        onPayloadChange={secondPayloadChange}
        scope="post_create"
      />,
    );

    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(challengeLoader).toHaveBeenCalledTimes(1);
  });
});
