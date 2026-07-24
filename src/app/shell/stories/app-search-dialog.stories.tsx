import type { Meta, StoryObj } from "@storybook/react-vite";
import * as React from "react";

import { Button } from "@/components/primitives/button";

import { AppSearchDialog, type AppSearchCommunity } from "../app-search-dialog";

const RESULTS: AppSearchCommunity[] = [
  { community: "cmt_builders", display_name: "Builders of Pirate", route_slug: "builders" },
  { community: "cmt_music", display_name: "Pirate Radio", route_slug: "pirate-radio" },
  { community: "cmt_language", display_name: "Language Exchange", route_slug: "language-exchange" },
];

const meta = {
  title: "Shell/AppSearchDialog",
  component: AppSearchDialog,
  parameters: { layout: "fullscreen" },
} satisfies Meta<typeof AppSearchDialog>;

export default meta;
type Story = StoryObj<typeof meta>;

function SearchReview({
  initialQuery = "",
  mobile = false,
  searchCommunities = async () => RESULTS,
}: {
  initialQuery?: string;
  mobile?: boolean;
  searchCommunities?: (query: string) => Promise<AppSearchCommunity[]>;
}) {
  const [open, setOpen] = React.useState(true);
  return (
    <div className="grid min-h-dvh place-items-center bg-background p-6">
      <Button onClick={() => setOpen(true)}>Open search</Button>
      <AppSearchDialog
        initialQuery={initialQuery}
        onNavigate={() => setOpen(false)}
        onOpenChange={setOpen}
        open={open}
        searchCommunities={searchCommunities}
      />
      {mobile ? <span className="sr-only">Mobile review state</span> : null}
    </div>
  );
}

export const DesktopResults: Story = {
  args: { onNavigate: () => {}, onOpenChange: () => {}, open: true },
  render: () => <SearchReview initialQuery="pirate" />,
};

export const Mobile: Story = {
  args: { onNavigate: () => {}, onOpenChange: () => {}, open: true },
  parameters: { viewport: { defaultViewport: "mobile1" } },
  render: () => <SearchReview initialQuery="pirate" mobile />,
};

export const EmptyResults: Story = {
  args: { onNavigate: () => {}, onOpenChange: () => {}, open: true },
  render: () => <SearchReview initialQuery="nothing" searchCommunities={async () => []} />,
};

export const ErrorState: Story = {
  args: { onNavigate: () => {}, onOpenChange: () => {}, open: true },
  render: () => (
    <SearchReview
      initialQuery="error"
      searchCommunities={async () => {
        throw new Error("Search unavailable");
      }}
    />
  ),
};
