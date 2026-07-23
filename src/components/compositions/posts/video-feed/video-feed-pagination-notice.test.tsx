import "@/test/setup-runtime";

import { afterEach, describe, expect, test } from "bun:test";
import { cleanup, fireEvent, render } from "@testing-library/react";

import { VideoFeedPaginationNotice } from "./video-feed-pagination-notice";

afterEach(cleanup);

describe("VideoFeedPaginationNotice", () => {
  test("reports the failure without blocking the feed and retries on demand", () => {
    let retries = 0;
    const view = render(
      <VideoFeedPaginationNotice
        actionLabel="Retry"
        message="Couldn't load more videos."
        onAction={() => { retries += 1; }}
      />,
    );
    const status = view.getByRole("status");

    expect(status.textContent).toContain("Couldn't load more videos.");
    expect(status.className).toContain("pointer-events-none");

    fireEvent.click(view.getByRole("button", { name: "Retry" }));
    expect(retries).toBe(1);
  });
});
