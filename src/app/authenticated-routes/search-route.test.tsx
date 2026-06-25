import "@/test/setup-runtime";

import { afterEach, describe, expect, test } from "bun:test";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup, fireEvent, render, waitFor } from "@testing-library/react";
import * as React from "react";

import { ApiProvider } from "@/lib/api";
import { SearchPage } from "./search-route";

Object.defineProperty(window, "getComputedStyle", {
  configurable: true,
  value: () => ({
    display: "block",
    getPropertyValue: (property: string) =>
      property === "display" ? "block" : property === "visibility" ? "visible" : "",
    visibility: "visible",
  }),
});
Object.defineProperty(globalThis, "getComputedStyle", {
  configurable: true,
  value: window.getComputedStyle,
});

const originalFetch = globalThis.fetch;

function setLocation(href: string) {
  Object.defineProperty(window, "location", {
    configurable: true,
    value: new URL(href),
  });
}

function renderSearchPage() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  });

  return render(
    <QueryClientProvider client={queryClient}>
      <ApiProvider baseUrl="http://pirate.test">
        <SearchPage />
      </ApiProvider>
    </QueryClientProvider>,
  );
}

afterEach(() => {
  cleanup();
  globalThis.fetch = originalFetch;
});

describe("SearchPage", () => {
  test("reads the query string and appends cursor pages", async () => {
    setLocation("https://pirate.test/search?q=blackbeard");
    const requests: string[] = [];
    globalThis.fetch = async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
      const request = input instanceof Request ? input : new Request(input, init);
      const url = new URL(request.url);
      requests.push(`${url.pathname}${url.search}`);
      const cursor = url.searchParams.get("cursor");

      return Response.json({
        object: "search_results",
        query: url.searchParams.get("q") ?? "",
        suggestions: [],
        data: cursor ? [{
          object: "search_result",
          id: "search_post_post_rigging",
          kind: "post",
          title: "Rigging notes",
          subtitle: "Pirate Logs",
          excerpt: "A public projected post.",
          href: "/p/post_rigging",
          image_ref: null,
          resource: { object: "post", id: "post_rigging" },
          matched_fields: ["title"],
          score_decimal: "0.650000",
        }] : [{
          object: "search_result",
          id: "search_profile_usr_blackbeard",
          kind: "profile",
          title: "Blackbeard",
          subtitle: "@blackbeard.pirate",
          excerpt: null,
          href: "/u/blackbeard",
          image_ref: null,
          resource: { object: "profile", id: "usr_blackbeard" },
          matched_fields: ["handle"],
          score_decimal: "1.000000",
        }],
        has_more: !cursor,
        next_cursor: cursor ? null : "cursor_1",
      });
    };

    const view = renderSearchPage();

    expect(await view.findByText("Blackbeard")).toBeTruthy();
    expect((view.getByLabelText("Search Pirate") as HTMLInputElement).value).toBe("blackbeard");

    fireEvent.click(view.getByRole("button", { name: "Load more" }));

    expect(await view.findByText("Rigging notes")).toBeTruthy();
    await waitFor(() => {
      expect(requests).toContain("/search?q=blackbeard&limit=20");
      expect(requests).toContain("/search?q=blackbeard&limit=20&cursor=cursor_1");
    });
  });

  test("syncs the controlled input when browser navigation changes the query", async () => {
    setLocation("https://pirate.test/search?q=blackbeard");
    globalThis.fetch = async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
      const request = input instanceof Request ? input : new Request(input, init);
      return Response.json({
        object: "search_results",
        query: new URL(request.url).searchParams.get("q") ?? "",
        suggestions: [],
        data: [],
        has_more: false,
        next_cursor: null,
      });
    };

    const view = renderSearchPage();
    const input = view.getByLabelText("Search Pirate") as HTMLInputElement;
    expect(input.value).toBe("blackbeard");

    setLocation("https://pirate.test/search?q=pirate+radio");
    fireEvent(window, new window.Event("popstate"));
    await waitFor(() => expect(input.value).toBe("pirate radio"));

    setLocation("https://pirate.test/search?q=blackbeard");
    fireEvent(window, new window.Event("popstate"));
    await waitFor(() => expect(input.value).toBe("blackbeard"));
  });
});
