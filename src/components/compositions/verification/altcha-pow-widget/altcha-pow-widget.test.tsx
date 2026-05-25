import "@/test/setup-runtime";

import { afterEach, describe, expect, mock, test } from "bun:test";

mock.module("altcha", () => ({}));

const { cleanup, render, waitFor } = await import("@testing-library/react");
const { AltchaPowWidget } = await import("./altcha-pow-widget");

afterEach(() => {
  cleanup();
});

describe("AltchaPowWidget", () => {
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
