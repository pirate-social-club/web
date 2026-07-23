import type { Meta, StoryObj } from "@storybook/react-vite";
import * as React from "react";

import { Avatar } from "@/components/primitives/avatar";
import { Button } from "@/components/primitives/button";
import { Type } from "@/components/primitives/type";
import { FeedPanelLayout, FeedSidePanel } from "../feed-side-panel";

const meta = {
  title: "Compositions/Posts/FeedSidePanel",
  component: FeedSidePanel,
  parameters: { layout: "fullscreen" },
} satisfies Meta<typeof FeedSidePanel>;

export default meta;
type Story = StoryObj<typeof meta>;

function CommentPreview() {
  return (
    <div className="flex h-full flex-col">
      <div className="flex-1 space-y-5 p-5">
        {["mara.english", "songs.pirate", "listener.one"].map((handle, index) => (
          <div className="flex gap-3" key={handle}>
            <Avatar fallback={handle} size="sm" />
            <div>
              <Type variant="body-strong">{handle}</Type>
              <Type variant="body">{index === 0 ? "That second verse is the tricky part." : "Saving this for practice later."}</Type>
            </div>
          </div>
        ))}
      </div>
      <form className="flex gap-2 border-t border-border-soft p-4" onSubmit={(event) => event.preventDefault()}>
        <input aria-label="Write a comment" className="h-11 min-w-0 flex-1 rounded-full border border-border px-4" placeholder="Write a comment" />
        <Button type="submit">Post</Button>
      </form>
    </div>
  );
}

function ReviewSurface() {
  const [open, setOpen] = React.useState(true);
  return (
    <FeedPanelLayout
      className="h-dvh bg-black"
      panel={(
        <FeedSidePanel closeLabel="Close" description="86 comments" onOpenChange={setOpen} open={open} title="Comments">
          <CommentPreview />
        </FeedSidePanel>
      )}
    >
      <div className="grid h-full place-items-center bg-gradient-to-b from-muted to-black text-white">
        <div className="text-center">
          <Type as="h1" className="text-white" variant="display">Video stage</Type>
          {!open ? <Button className="mt-4" onClick={() => setOpen(true)}>Open comments</Button> : null}
        </div>
      </div>
    </FeedPanelLayout>
  );
}

export const DesktopDock: Story = {
  name: "Comments / Desktop dock",
  args: { children: null, closeLabel: "Close", onOpenChange: () => undefined, open: true, title: "Comments" },
  parameters: { viewport: { defaultViewport: "desktop" } },
  render: () => <ReviewSurface />,
};

export const MobileSheet: Story = {
  name: "Comments / Mobile bottom sheet",
  args: { children: null, closeLabel: "Close", onOpenChange: () => undefined, open: true, title: "Comments" },
  parameters: { viewport: { defaultViewport: "mobile1" } },
  render: () => <ReviewSurface />,
};
