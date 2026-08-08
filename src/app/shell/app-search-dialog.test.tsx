import "@/test/setup-runtime";

import * as React from "react";
import { afterEach, describe, expect, mock, test } from "bun:test";
import { cleanup, fireEvent, render, waitFor } from "@testing-library/react";

mock.module("@/components/primitives/dialog", () => ({
  Dialog: ({ children, open }: { children: React.ReactNode; open: boolean }) => open ? <>{children}</> : null,
  DialogContent: ({ children }: { children: React.ReactNode }) => <section>{children}</section>,
  DialogDescription: ({ children }: { children: React.ReactNode }) => <p>{children}</p>,
  DialogHeader: ({ children }: { children: React.ReactNode }) => <header>{children}</header>,
  DialogTitle: ({ children }: { children: React.ReactNode }) => <h2>{children}</h2>,
}));

import { AppSearchDialog } from "./app-search-dialog";

afterEach(cleanup);

describe("AppSearchDialog", () => {
  test("searches communities and navigates to the canonical route", async () => {
    const navigations: string[] = [];
    let searches = 0;
    const searchCommunities = async () => {
      searches += 1;
      return [{
        community: "cmt_builders",
        display_name: "Builders",
        route_slug: "builders",
      }];
    };
    const view = render(
      <AppSearchDialog
        initialQuery="build"
        onNavigate={(path) => navigations.push(path)}
        onOpenChange={() => {}}
        open
        searchCommunities={searchCommunities}
      />,
    );

    await waitFor(() => expect(view.getByRole("button", { name: /Builders/ })).toBeTruthy());
    fireEvent.click(view.getByRole("button", { name: /Builders/ }));

    expect(navigations).toEqual(["/c/builders"]);
    expect(searches).toBe(1);
  });

  test("does not issue broad empty searches", async () => {
    let searches = 0;
    const view = render(
      <AppSearchDialog
        onNavigate={() => {}}
        onOpenChange={() => {}}
        open
        searchCommunities={async () => {
          searches += 1;
          return [];
        }}
      />,
    );

    fireEvent.input(view.getByRole("searchbox", { name: "Search Pirate" }), {
      target: { value: "a" },
    });
    await new Promise((resolve) => window.setTimeout(resolve, 220));

    expect(searches).toBe(0);
    expect(view.getByText("Enter at least two characters to search.")).toBeTruthy();
  });
});
