import "@/test/setup-runtime";

import * as React from "react";
import { afterEach, describe, expect, mock, test } from "bun:test";
import { cleanup, render, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

mock.module("@/app/authenticated-helpers/route-shell", () => ({
  FullPageSpinner: () => <p>Checking scope</p>,
  NotFoundRouteState: () => <p>Not found</p>,
  RouteLoadFailureState: () => <p>Scope failed</p>,
}));

import { SovereignRouteBoundary } from "@/app/sovereign-route-boundary";
import { ApiProvider } from "@/lib/api";
import type { ApiClient } from "@/lib/api/client";

afterEach(cleanup);

function renderBoundary(input: {
  community: string;
  sovereignCommunityId?: string;
}) {
  let reads = 0;
  const client = {
    publicPosts: {
      get: async () => {
        reads += 1;
        return { post: { community: input.community } };
      },
    },
  } as unknown as ApiClient;
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  const view = render(
    <QueryClientProvider client={queryClient}>
      <ApiProvider client={client}>
        <SovereignRouteBoundary
          route={{
            kind: "post",
            path: "/p/pst_test",
            postId: "pst_test",
            sovereignCommunityId: input.sovereignCommunityId,
          }}
        >
          <p>Post content</p>
        </SovereignRouteBoundary>
      </ApiProvider>
    </QueryClientProvider>,
  );
  return { reads: () => reads, view };
}

describe("SovereignRouteBoundary", () => {
  test("renders a post that belongs to the forwarded community", async () => {
    const { reads, view } = renderBoundary({
      community: "com_expected",
      sovereignCommunityId: "com_expected",
    });

    await waitFor(() => expect(view.getByText("Post content")).toBeTruthy());
    expect(reads()).toBe(1);
  });

  test("returns not found for a post from another community", async () => {
    const { view } = renderBoundary({
      community: "com_foreign",
      sovereignCommunityId: "com_expected",
    });

    await waitFor(() => expect(view.getByText("Not found")).toBeTruthy());
    expect(view.queryByText("Post content")).toBeNull();
  });

  test("does not add a lookup to canonical post routes", () => {
    const { reads, view } = renderBoundary({ community: "com_any" });

    expect(view.getByText("Post content")).toBeTruthy();
    expect(reads()).toBe(0);
  });
});
