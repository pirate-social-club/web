import type { Meta, StoryObj } from "@storybook/react-vite";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import * as React from "react";

import { ApiProvider } from "@/lib/api";
import type { ApiSearchResult, ApiSearchResultsResponse } from "@/lib/api/client-api-types";
import { GlobalSearchBox } from "../global-search-box";

const STORAGE_KEY = "pirate:storybook:search-recents";

const communityResults: ApiSearchResult[] = [
  {
    object: "search_result",
    id: "search_community_com_music",
    kind: "community",
    title: "Pirate Radio",
    subtitle: "/c/pirate-radio",
    excerpt: null,
    href: "/c/pirate-radio",
    image_ref: null,
    resource: { object: "community", id: "com_music" },
    matched_fields: ["title"],
    score_decimal: "0.820000",
  },
  {
    object: "search_result",
    id: "search_community_com_shanties",
    kind: "community",
    title: "Sea Shanties",
    subtitle: "/c/sea-shanties",
    excerpt: "Songs, recordings, and old harbor stories.",
    href: "/c/sea-shanties",
    image_ref: null,
    resource: { object: "community", id: "com_shanties" },
    matched_fields: ["title"],
    score_decimal: "0.760000",
  },
  {
    object: "search_result",
    id: "search_community_com_rigging",
    kind: "community",
    title: "Rigging Notes",
    subtitle: "/c/rigging-notes",
    excerpt: null,
    href: "/c/rigging-notes",
    image_ref: null,
    resource: { object: "community", id: "com_rigging" },
    matched_fields: ["title"],
    score_decimal: "0.700000",
  },
];

const profileResults: ApiSearchResult[] = [
  {
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
  },
  {
    object: "search_result",
    id: "search_profile_usr_blackbeard_ii",
    kind: "profile",
    title: "Blackbeard II",
    subtitle: "@blackbeard-ii.pirate",
    excerpt: null,
    href: "/u/blackbeard-ii",
    image_ref: null,
    resource: { object: "profile", id: "usr_blackbeard_ii" },
    matched_fields: ["handle"],
    score_decimal: "0.940000",
  },
];

type SearchFixture =
  | { mode: "results"; results: ApiSearchResult[]; suggestions: string[] }
  | { mode: "suggestions-only"; suggestions: string[] }
  | { mode: "error" }
  | { mode: "loading" };

function buildResponse(query: string, fixture: SearchFixture): ApiSearchResultsResponse {
  if (fixture.mode === "error") {
    throw new Error("search unavailable");
  }
  if (fixture.mode === "loading") {
    return new Promise(() => undefined) as unknown as ApiSearchResultsResponse;
  }
  if (fixture.mode === "suggestions-only") {
    return {
      object: "search_results",
      query,
      suggestions: fixture.suggestions,
      data: [],
      has_more: false,
      next_cursor: null,
    };
  }
  return {
    object: "search_results",
    query,
    suggestions: fixture.suggestions,
    data: fixture.results,
    has_more: false,
    next_cursor: null,
  };
}

function fireInputChange(input: HTMLInputElement, value: string) {
  const reactPropsKey = Object.keys(input).find((key) => key.startsWith("__reactProps$"));
  const reactProps = reactPropsKey
    ? (input as unknown as Record<string, { onChange?: (event: { currentTarget: HTMLInputElement; target: HTMLInputElement }) => void }>)[reactPropsKey]
    : null;
  input.value = value;
  input.focus();
  reactProps?.onChange?.({ currentTarget: input, target: input });
}

function SearchBoxStory({
  fixture,
  widthClass = "w-[min(90vw,28rem)]",
  initialValue,
}: {
  fixture: SearchFixture;
  widthClass?: string;
  initialValue?: string;
}) {
  const [queryClient] = React.useState(
    () => new QueryClient({ defaultOptions: { queries: { retry: false } } }),
  );
  const rootRef = React.useRef<HTMLDivElement | null>(null);
  const originalFetchRef = React.useRef<typeof globalThis.fetch>(globalThis.fetch);

  React.useEffect(() => {
    globalThis.fetch = (async (input: RequestInfo | URL): Promise<Response> => {
      const request = input instanceof Request ? input : new Request(input);
      const url = new URL(request.url);
      if (!url.pathname.endsWith("/search")) {
        return new Response("not found", { status: 404 });
      }
      if (fixture.mode === "error") {
        return new Response("search unavailable", { status: 500 });
      }
      const query = url.searchParams.get("q") ?? "";
      return Response.json(buildResponse(query, fixture));
    }) as typeof globalThis.fetch;

    return () => {
      globalThis.fetch = originalFetchRef.current;
    };
  }, [fixture]);

  React.useEffect(() => {
    if (!initialValue) {
      return;
    }
    const input = rootRef.current?.querySelector('input[role="combobox"]');
    if (input instanceof HTMLInputElement) {
      fireInputChange(input, initialValue);
    }
  }, [initialValue]);

  return (
    <div className={widthClass} ref={rootRef}>
      <QueryClientProvider client={queryClient}>
        <ApiProvider baseUrl="http://pirate.storybook">
          <GlobalSearchBox debounceMs={0} storageKey={STORAGE_KEY} />
        </ApiProvider>
      </QueryClientProvider>
    </div>
  );
}

const meta = {
  title: "Compositions/App/GlobalSearchBox",
  parameters: {
    layout: "centered",
  },
} satisfies Meta;

export default meta;

type Story = StoryObj<typeof meta>;

export const Idle: Story = {
  render: () => <SearchBoxStory fixture={{ mode: "results", results: [], suggestions: [] }} />,
};

export const FocusedRecents: Story = {
  render: () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(["blackbeard", "pirate radio", "rigging notes"]));
    return <SearchBoxStory fixture={{ mode: "results", results: [], suggestions: [] }} />;
  },
};

export const Loading: Story = {
  render: () => (
    <SearchBoxStory fixture={{ mode: "loading" }} initialValue="pirate" />
  ),
};

export const Results: Story = {
  render: () => (
    <SearchBoxStory
      fixture={{ mode: "results", results: communityResults, suggestions: ["pirate radio", "pirate songs", "pirate crews"] }}
      initialValue="pirate"
    />
  ),
};

export const Profiles: Story = {
  render: () => (
    <SearchBoxStory
      fixture={{ mode: "results", results: profileResults, suggestions: [] }}
      initialValue="u/blackbeard"
    />
  ),
};

export const Empty: Story = {
  render: () => (
    <SearchBoxStory
      fixture={{ mode: "results", results: [], suggestions: [] }}
      initialValue="zzzz"
    />
  ),
};

export const SuggestionsOnly: Story = {
  render: () => (
    <SearchBoxStory
      fixture={{ mode: "suggestions-only", suggestions: ["pirate radio", "pirate songs"] }}
      initialValue="pirate"
    />
  ),
};

export const Error: Story = {
  render: () => (
    <SearchBoxStory fixture={{ mode: "error" }} initialValue="pirate" />
  ),
};

export const Narrow: Story = {
  render: () => (
    <SearchBoxStory
      fixture={{ mode: "results", results: communityResults, suggestions: ["a long query", "a long lost ship"] }}
      initialValue="a long query"
      widthClass="w-80"
    />
  ),
};
