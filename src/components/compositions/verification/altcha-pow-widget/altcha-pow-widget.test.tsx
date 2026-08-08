import "@/test/setup-runtime";

import { afterEach, describe, expect, mock, test } from "bun:test";

mock.module("altcha", () => ({}));

const { act, cleanup, fireEvent, render, waitFor } = await import("@testing-library/react");
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

  test("runs the challenge as a standard checkbox widget", async () => {
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

    await waitFor(() => expect(challengeLoader).toHaveBeenCalledTimes(1));
    await waitFor(() => expect(container.querySelector("altcha-widget")).toBeTruthy());
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 0));
    });

    const widget = container.querySelector("altcha-widget");
    expect(widget?.getAttribute("display")).toBe("standard");
    expect(widget?.getAttribute("auto")).toBe("off");
    expect(widget?.getAttribute("type")).toBe("checkbox");
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

  test("requests one fresh challenge when the external retry key changes", async () => {
    const challengeLoader = mock(async () => ({
      algorithm: "SHA-256",
      challenge: "challenge",
      maxnumber: 100,
      salt: "salt",
      signature: "signature",
    }));

    const { rerender } = render(
      <AltchaPowWidget
        action="community:com_test"
        challengeLoader={challengeLoader}
        onPayloadChange={() => undefined}
        retryKey={0}
        scope="community_join"
      />,
    );

    await waitFor(() => expect(challengeLoader).toHaveBeenCalledTimes(1));
    rerender(
      <AltchaPowWidget
        action="community:com_test"
        challengeLoader={challengeLoader}
        onPayloadChange={() => undefined}
        retryKey={1}
        scope="community_join"
      />,
    );

    await waitFor(() => expect(challengeLoader).toHaveBeenCalledTimes(2));
  });

  test("reports a solved proof once when ALTCHA emits verified events", async () => {
    const challengeLoader = mock(async () => ({
      algorithm: "SHA-256",
      challenge: "challenge",
      maxnumber: 100,
      salt: "salt",
      signature: "signature",
    }));
    const payloads: Array<string | null> = [];
    const verifiedPayloads: string[] = [];

    const { container } = render(
      <AltchaPowWidget
        action="post:pst_test:1"
        challengeLoader={challengeLoader}
        onPayloadChange={(payload) => payloads.push(payload)}
        onVerified={(payload) => verifiedPayloads.push(payload)}
        scope="vote"
      />,
    );

    await waitFor(() => expect(challengeLoader).toHaveBeenCalledTimes(1));
    await waitFor(() => expect(container.querySelector("altcha-widget")).toBeTruthy());
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 0));
    });

    const widget = container.querySelector("altcha-widget");
    await act(async () => {
      if (!widget) {
        throw new Error("ALTCHA widget did not render");
      }
      fireEvent(widget, new window.CustomEvent("verified", {
        detail: { payload: " proof " },
      }));
      fireEvent(widget, new window.CustomEvent("statechange", {
        detail: { payload: "proof", state: "verified" },
      }));
      await Promise.resolve();
    });

    expect(payloads).toEqual([null, "proof"]);
    expect(verifiedPayloads).toEqual(["proof"]);
  });
});
