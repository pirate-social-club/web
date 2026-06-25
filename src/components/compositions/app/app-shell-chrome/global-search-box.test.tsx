import "@/test/setup-runtime";

import { afterEach, describe, expect, test } from "bun:test";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, cleanup, fireEvent, render, waitFor } from "@testing-library/react";
import * as React from "react";

import { ApiProvider } from "@/lib/api";
import { GlobalSearchBox, rememberRecentSearchQuery } from "./global-search-box";

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
const storageKey = "pirate:test:search-recents";

function renderSearchBox(options: {
  onNavigate?: (href: string) => void;
  onSubmit?: (query: string) => void;
} = {}) {
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
        <GlobalSearchBox
          debounceMs={0}
          onNavigate={options.onNavigate}
          onSubmit={options.onSubmit}
          storageKey={storageKey}
        />
      </ApiProvider>
    </QueryClientProvider>,
  );
}

function installSearchFetch(data: unknown[] = [], suggestions: string[] = []) {
  const requests: string[] = [];
  globalThis.fetch = async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
    const request = input instanceof Request ? input : new Request(input, init);
    requests.push(request.url);
    return Response.json({
      object: "search_results",
      query: new URL(request.url).searchParams.get("q") ?? "",
      suggestions,
      data,
      has_more: false,
      next_cursor: null,
    });
  };
  return requests;
}

function editSearchInput(element: HTMLElement, value: string) {
  if (!("value" in element)) {
    throw new Error("Expected an editable input element");
  }
  const input = element as HTMLInputElement;
  input.value = value;
  const reactPropsKey = Object.keys(input).find((key) => key.startsWith("__reactProps$"));
  const reactProps = reactPropsKey
    ? (input as unknown as Record<string, { onChange?: (event: { currentTarget: HTMLInputElement; target: HTMLInputElement }) => void }>)[reactPropsKey]
    : null;

  act(() => {
    reactProps?.onChange?.({
      currentTarget: input,
      target: input,
    });
  });
}

function pressSearchKey(element: HTMLElement, key: string) {
  const reactPropsKey = Object.keys(element).find((propKey) => propKey.startsWith("__reactProps$"));
  const reactProps = reactPropsKey
    ? (element as unknown as Record<string, { onKeyDown?: (event: { key: string; preventDefault: () => void }) => void }>)[reactPropsKey]
    : null;

  act(() => {
    reactProps?.onKeyDown?.({
      key,
      preventDefault: () => undefined,
    });
  });
}

afterEach(() => {
  cleanup();
  localStorage.removeItem(storageKey);
  globalThis.fetch = originalFetch;
});

describe("GlobalSearchBox", () => {
  test("round-trips controlled values through onValueChange", () => {
    const changes: string[] = [];
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });

    function ControlledSearchBox() {
      const [value, setValue] = React.useState("blackbeard");
      return (
        <GlobalSearchBox
          debounceMs={0}
          onValueChange={(next) => {
            changes.push(next);
            setValue(next);
          }}
          storageKey={storageKey}
          value={value}
        />
      );
    }

    const view = render(
      <QueryClientProvider client={queryClient}>
        <ApiProvider baseUrl="http://pirate.test">
          <ControlledSearchBox />
        </ApiProvider>
      </QueryClientProvider>,
    );
    const input = view.getByRole("combobox") as HTMLInputElement;

    expect(input.value).toBe("blackbeard");
    editSearchInput(input, "pirate radio");

    expect(changes).toEqual(["pirate radio"]);
    expect(input.value).toBe("pirate radio");
  });

  test("shows local recents on focus and clears them", async () => {
    rememberRecentSearchQuery("blackbeard", storageKey);
    rememberRecentSearchQuery("pirate radio", storageKey);
    const view = renderSearchBox();
    const input = view.getByRole("combobox");

    fireEvent.focus(input);

    expect(await view.findByText("blackbeard")).toBeTruthy();
    expect(view.getByText("pirate radio")).toBeTruthy();

    fireEvent.click(view.getByRole("button", { name: "Clear" }));

    expect(view.queryByText("blackbeard")).toBeNull();
    expect(localStorage.getItem(storageKey)).toBeNull();
  });

  test("navigates to an autocomplete result with keyboard selection", async () => {
    const navigations: string[] = [];
    const requests = installSearchFetch([{
      object: "search_result",
      id: "search_community_com_blackbeard",
      kind: "community",
      title: "Blackbeard Logs",
      subtitle: "/c/blackbeard-logs",
      excerpt: null,
      href: "/c/blackbeard",
      image_ref: null,
      resource: { object: "community", id: "com_blackbeard" },
      matched_fields: ["title"],
      score_decimal: "1.000000",
    }], ["Blackbeard Clubhouse"]);
    const view = renderSearchBox({ onNavigate: (href) => navigations.push(href) });
    const input = view.getByRole("combobox");

    fireEvent.focus(input);
    editSearchInput(input, "blackbeard");

    expect(await view.findByText("Blackbeard Logs")).toBeTruthy();
    expect(view.getByText("Blackbeard Clubhouse")).toBeTruthy();
    expect(view.getByText("Communities")).toBeTruthy();
    expect(requests.some((request) => new URL(request).searchParams.get("kinds") === "profile,community")).toBe(true);
    await waitFor(() => {
      expect(input.getAttribute("aria-activedescendant")).toBeTruthy();
    });

    pressSearchKey(input, "ArrowDown");
    pressSearchKey(input, "Enter");

    expect(navigations).toEqual(["/c/blackbeard"]);
    expect(view.queryByText("Blackbeard Logs")).toBeNull();
    expect(localStorage.getItem(storageKey)).toContain("blackbeard");
  });

  test("shows profile sections for bare profile matches", async () => {
    const requests = installSearchFetch([{
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
    }, {
      object: "search_result",
      id: "search_community_com_blackbeard",
      kind: "community",
      title: "Blackbeard Logs",
      subtitle: "/c/blackbeard",
      excerpt: null,
      href: "/c/blackbeard",
      image_ref: null,
      resource: { object: "community", id: "com_blackbeard" },
      matched_fields: ["title"],
      score_decimal: "0.800000",
    }]);
    const view = renderSearchBox();
    const input = view.getByRole("combobox");

    fireEvent.focus(input);
    editSearchInput(input, "blackbeard");

    expect(await view.findByText("Blackbeard")).toBeTruthy();
    expect(view.getByText("Profiles")).toBeTruthy();
    expect(view.getByText("Communities")).toBeTruthy();
    expect(requests.some((request) => new URL(request).searchParams.get("kinds") === "profile,community")).toBe(true);
  });

  test("uses profile results for u-prefixed queries", async () => {
    const requests = installSearchFetch([{
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
    }]);
    const view = renderSearchBox();
    const input = view.getByRole("combobox");

    fireEvent.focus(input);
    editSearchInput(input, "u/blackbeard");

    expect(await view.findByText("Blackbeard")).toBeTruthy();
    expect(view.getByText("Profiles")).toBeTruthy();
    expect(requests.some((request) => {
      const url = new URL(request);
      return url.searchParams.get("q") === "blackbeard" && url.searchParams.get("kinds") === "profile";
    })).toBe(true);
  });

  test("keyboard navigation follows the visual section order, not the ranked result order", async () => {
    const navigations: string[] = [];
    installSearchFetch([{
      object: "search_result",
      id: "search_profile_usr_captain",
      kind: "profile",
      title: "Captain Hook",
      subtitle: "@captainhook.pirate",
      excerpt: null,
      href: "/u/captainhook",
      image_ref: null,
      resource: { object: "profile", id: "usr_captain" },
      matched_fields: ["handle"],
      score_decimal: "1.000000",
    }, {
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
      score_decimal: "0.950000",
    }, {
      object: "search_result",
      id: "search_profile_usr_first_mate",
      kind: "profile",
      title: "First Mate",
      subtitle: "@firstmate.pirate",
      excerpt: null,
      href: "/u/firstmate",
      image_ref: null,
      resource: { object: "profile", id: "usr_first_mate" },
      matched_fields: ["handle"],
      score_decimal: "0.900000",
    }]);
    const view = renderSearchBox({ onNavigate: (href) => navigations.push(href) });
    const input = view.getByRole("combobox");

    fireEvent.focus(input);
    editSearchInput(input, "captain");

    await view.findByText("Captain Hook");
    await view.findByText("Rigging Notes");
    await view.findByText("First Mate");

    const allOptions = view.getAllByRole("option");
    const optionTitles = allOptions.map((option) => option.querySelector("span > span")?.textContent ?? "");
    expect(optionTitles).toEqual([
      "Captain Hook",
      "First Mate",
      "Rigging Notes",
    ]);

    const activeId = input.getAttribute("aria-activedescendant");
    expect(activeId).toBeTruthy();
    const activeTitle = document.getElementById(activeId ?? "")
      ?.querySelector("span > span")
      ?.textContent;
    expect(activeTitle).toBe("Captain Hook");

    pressSearchKey(input, "ArrowDown");
    const nextActiveId = input.getAttribute("aria-activedescendant");
    const nextActiveTitle = document.getElementById(nextActiveId ?? "")
      ?.querySelector("span > span")
      ?.textContent;
    expect(nextActiveTitle).toBe("First Mate");

    pressSearchKey(input, "ArrowDown");
    const thirdActiveId = input.getAttribute("aria-activedescendant");
    const thirdActiveTitle = document.getElementById(thirdActiveId ?? "")
      ?.querySelector("span > span")
      ?.textContent;
    expect(thirdActiveTitle).toBe("Rigging Notes");

    pressSearchKey(input, "Enter");
    expect(navigations).toEqual(["/c/rigging-notes"]);
  });

  test("shows suggestions without a no-matches message when results are empty", async () => {
    installSearchFetch([], ["pirate radio", "pirate songs"]);
    const view = renderSearchBox();
    const input = view.getByRole("combobox");

    fireEvent.focus(input);
    editSearchInput(input, "pirate");

    await view.findByText("pirate radio");
    expect(view.getByText("pirate songs")).toBeTruthy();
    expect(view.queryByText(/No matches/u)).toBeNull();
  });

  test("closes the panel when a prefix leaves the search term below the minimum length", async () => {
    const requests = installSearchFetch();
    const view = renderSearchBox();
    const input = view.getByRole("combobox");

    fireEvent.focus(input);
    editSearchInput(input, "u/a");

    await new Promise((resolve) => setTimeout(resolve, 30));
    expect(requests).toEqual([]);
    expect(input.getAttribute("aria-expanded")).toBe("false");
    expect(input.getAttribute("aria-controls")).toBeNull();
    expect(view.queryByRole("listbox")).toBeNull();
  });

  test("enter navigates to the full search page when there are no matches", async () => {
    const navigations: string[] = [];
    installSearchFetch([]);
    const view = renderSearchBox({ onNavigate: (href) => navigations.push(href) });
    const input = view.getByRole("combobox");

    fireEvent.focus(input);
    editSearchInput(input, "zzzz");

    expect(await view.findByText("No matches for zzzz")).toBeTruthy();

    pressSearchKey(input, "Enter");

    expect(navigations).toEqual(["/search?q=zzzz"]);
  });

  test("routes Enter submissions through onSubmit", async () => {
    const submissions: string[] = [];
    installSearchFetch([]);
    const view = renderSearchBox({ onSubmit: (query) => submissions.push(query) });
    const input = view.getByRole("combobox");

    fireEvent.focus(input);
    editSearchInput(input, "  pirate   radio  ");

    expect(await view.findByText("No matches for pirate radio")).toBeTruthy();
    pressSearchKey(input, "Enter");

    expect(submissions).toEqual(["pirate radio"]);
  });

  test("routes recent and suggestion selections through onSubmit", async () => {
    const submissions: string[] = [];
    rememberRecentSearchQuery("blackbeard", storageKey);
    installSearchFetch([], ["pirate radio"]);
    const view = renderSearchBox({ onSubmit: (query) => submissions.push(query) });
    const input = view.getByRole("combobox");

    fireEvent.focus(input);
    fireEvent.click(await view.findByText("blackbeard"));

    fireEvent.focus(input);
    editSearchInput(input, "pirate");
    fireEvent.click(await view.findByText("pirate radio"));

    expect(submissions).toEqual(["blackbeard", "pirate radio"]);
  });

  test("routes pointer-selected results through onNavigate", async () => {
    const navigations: string[] = [];
    installSearchFetch([{
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
    }]);
    const view = renderSearchBox({ onNavigate: (href) => navigations.push(href) });
    const input = view.getByRole("combobox");

    fireEvent.focus(input);
    editSearchInput(input, "blackbeard");
    fireEvent.click(await view.findByText("Blackbeard"));

    expect(navigations).toEqual(["/u/blackbeard"]);
  });

  test("escape and outside click close the panel without clearing the input", async () => {
    installSearchFetch([{
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
    }]);
    const view = renderSearchBox();
    const input = view.getByRole("combobox") as HTMLInputElement;

    fireEvent.focus(input);
    editSearchInput(input, "blackbeard");

    expect(await view.findByText("Blackbeard")).toBeTruthy();

    pressSearchKey(input, "Escape");

    expect(Boolean(view.queryByText("Blackbeard"))).toBe(false);
    expect(input.value).toBe("blackbeard");

    fireEvent.focus(input);
    expect(await view.findByText("Blackbeard")).toBeTruthy();
    fireEvent.mouseDown(document.body);
    expect(Boolean(view.queryByText("Blackbeard"))).toBe(false);
  });
});
