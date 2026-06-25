import { afterEach, describe, expect, test } from "bun:test";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook, waitFor } from "@testing-library/react";
import * as React from "react";

import { installDomGlobals } from "@/test/setup-dom";
import { ApiProvider } from "@/lib/api";
import { usePagedSearchResults, useSearchAutocomplete } from "./use-search-results";

installDomGlobals();

const originalFetch = globalThis.fetch;

function wrapper({ children }: { children: React.ReactNode }) {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  });

  return (
    <QueryClientProvider client={queryClient}>
      <ApiProvider baseUrl="http://pirate.test">
        {children}
      </ApiProvider>
    </QueryClientProvider>
  );
}

afterEach(() => {
  globalThis.fetch = originalFetch;
});

describe("useSearchAutocomplete", () => {
  test("does not fetch for queries shorter than two characters", async () => {
    const requests: string[] = [];
    globalThis.fetch = async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
      const request = input instanceof Request ? input : new Request(input, init);
      requests.push(request.url);
      return Response.json({ object: "search_results", query: "", suggestions: [], data: [], has_more: false, next_cursor: null });
    };

    const { result } = renderHook(() => useSearchAutocomplete({ debounceMs: 0, query: "a" }), { wrapper });

    expect(result.current.enabled).toBe(false);
    expect(result.current.results).toEqual([]);
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(requests).toEqual([]);
  });

  test("fetches the first page for eligible autocomplete queries", async () => {
    const requests: string[] = [];
    globalThis.fetch = async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
      const request = input instanceof Request ? input : new Request(input, init);
      requests.push(request.url);
      return Response.json({
        object: "search_results",
        query: "blackbeard",
        suggestions: ["Blackbeard Club"],
        data: [{
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
        has_more: false,
        next_cursor: null,
      });
    };

    const { result } = renderHook(() => useSearchAutocomplete({
      debounceMs: 0,
      kinds: ["profile", "post"],
      limit: 4,
      query: " blackbeard ",
    }), { wrapper });

    await waitFor(() => {
      expect(result.current.results.map((item) => item.title)).toEqual(["Blackbeard"]);
      expect(result.current.suggestions).toEqual(["Blackbeard Club"]);
    });

    const url = new URL(requests[0] ?? "");
    expect(url.pathname).toBe("/search");
    expect(url.searchParams.get("q")).toBe("blackbeard");
    expect(url.searchParams.get("limit")).toBe("4");
    expect(url.searchParams.get("kinds")).toBe("profile,post");
  });
});

describe("usePagedSearchResults", () => {
  test("appends cursor pages", async () => {
    const requests: string[] = [];
    globalThis.fetch = async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
      const request = input instanceof Request ? input : new Request(input, init);
      requests.push(request.url);
      const cursor = new URL(request.url).searchParams.get("cursor");
      return Response.json(cursor ? {
        object: "search_results",
        query: "blackbeard",
        suggestions: [],
        data: [{
          object: "search_result",
          id: "search_post_post_blackbeard",
          kind: "post",
          title: "Blackbeard Notes",
          subtitle: null,
          excerpt: null,
          href: "/p/post_blackbeard",
          image_ref: null,
          resource: { object: "post", id: "post_blackbeard" },
          matched_fields: ["title"],
          score_decimal: "0.600000",
        }],
        has_more: false,
        next_cursor: null,
      } : {
        object: "search_results",
        query: "blackbeard",
        suggestions: ["Blackbeard Club"],
        data: [{
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
        has_more: true,
        next_cursor: "next_cursor",
      });
    };

    const { result } = renderHook(() => usePagedSearchResults({ limit: 1, query: "blackbeard" }), { wrapper });

    await waitFor(() => {
      expect(result.current.results.map((item) => item.title)).toEqual(["Blackbeard"]);
    });
    await result.current.fetchNextPage();

    await waitFor(() => {
      expect(result.current.results.map((item) => item.title)).toEqual(["Blackbeard", "Blackbeard Notes"]);
    });

    expect(new URL(requests[1] ?? "").searchParams.get("cursor")).toBe("next_cursor");
  });
});
