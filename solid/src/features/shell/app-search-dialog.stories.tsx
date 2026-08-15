import { createSignal } from "solid-js";
import type { Meta, StoryObj } from "storybook-solidjs-vite";
import { expect, within } from "storybook/test";

import { Button } from "@pirate/web-solid-ui";

import { AppSearchDialog, type AppSearchCommunity } from "./app-search-dialog";

const RESULTS: AppSearchCommunity[] = [
  { community: "cmt_builders", display_name: "Builders of Pirate", route_slug: "builders" },
  { community: "cmt_music", display_name: "Pirate Radio", route_slug: "pirate-radio" },
  { community: "cmt_language", display_name: "Language Exchange", route_slug: "language-exchange" },
];

const meta = {
  title: "App/Shell/AppSearchDialog",
  parameters: {
    layout: "fullscreen",
    docs: {
      description: {
        component:
          "Community search dialog on the DS Dialog. The host injects searchCommunities and onNavigate; copy arrives via labels. Community route helpers are simplified (no punycode canonicalization) pending the host routing port.",
      },
    },
  },
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

function SearchReview(props: {
  initialQuery?: string;
  searchCommunities?: (query: string) => Promise<AppSearchCommunity[]>;
}) {
  const [open, setOpen] = createSignal(true);
  return (
    <div class="grid min-h-dvh place-items-center bg-background p-6">
      <Button onClick={() => setOpen(true)}>Open search</Button>
      <AppSearchDialog
        initialQuery={props.initialQuery}
        onNavigate={() => setOpen(false)}
        onOpenChange={setOpen}
        open={open()}
        searchCommunities={props.searchCommunities ?? (async () => RESULTS)}
      />
    </div>
  );
}

export const DesktopResults: Story = {
  render: () => <SearchReview initialQuery="pirate" />,
  play: async () => {
    const dialog = await within(document.body).findByRole("dialog");
    await expect(
      await within(dialog).findByRole("button", { name: /Pirate Radio/ }),
    ).toBeVisible();
  },
};

export const Mobile: Story = {
  globals: { viewport: { value: "mobile1", isRotated: false } },
  render: () => <SearchReview initialQuery="pirate" />,
};

export const EmptyResults: Story = {
  render: () => <SearchReview initialQuery="nothing" searchCommunities={async () => []} />,
  play: async () => {
    const dialog = await within(document.body).findByRole("dialog");
    await expect(
      await within(dialog).findByText("No communities found."),
    ).toBeVisible();
  },
};

export const ErrorState: Story = {
  render: () => (
    <SearchReview
      initialQuery="error"
      searchCommunities={async () => {
        throw new Error("Search unavailable");
      }}
    />
  ),
  play: async () => {
    const dialog = await within(document.body).findByRole("dialog");
    await expect(
      await within(dialog).findByText("Search is unavailable right now."),
    ).toBeVisible();
  },
};
