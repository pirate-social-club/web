import type { Meta, StoryObj } from "@storybook/react-vite";
import * as React from "react";

import { Avatar } from "@/components/primitives/avatar";
import { Button } from "@/components/primitives/button";
import { Spinner } from "@/components/primitives/spinner";
import { Type } from "@/components/primitives/type";
import { FeedPanelLayout, FeedSidePanel } from "../feed-side-panel";

const meta = {
  title: "Compositions/Posts/FeedSidePanel",
  component: FeedSidePanel,
  parameters: { layout: "fullscreen" },
} satisfies Meta<typeof FeedSidePanel>;

export default meta;
type Story = StoryObj<typeof meta>;

type ReviewState = "comments" | "empty" | "error" | "loading" | "logged-out" | "long";

function CommentPreview({ composerFocused = false, state = "comments" }: { composerFocused?: boolean; state?: ReviewState }) {
  const comments = state === "long"
    ? Array.from({ length: 18 }, (_, index) => `listener.${index + 1}`)
    : ["mara.english", "songs.pirate", "listener.one"];
  return (
    <div className="flex h-full flex-col">
      <div className="min-h-0 flex-1 space-y-5 overflow-y-auto p-5">
        {state === "loading" ? <div className="grid h-full place-items-center"><Spinner className="size-6" /></div> : null}
        {state === "empty" ? <Type variant="caption">No comments yet.</Type> : null}
        {state === "error" ? <Type variant="body">Comments could not be loaded right now.</Type> : null}
        {state === "logged-out" ? <Type variant="body">Comments remain readable. Connect when you want to reply.</Type> : null}
        {state === "comments" || state === "long" ? comments.map((handle, index) => (
          <div className="flex gap-3" key={handle}>
            <Avatar fallback={handle} size="sm" />
            <div>
              <Type variant="body-strong">{handle}</Type>
              <Type variant="body">{index === 0 ? "That second verse is the tricky part." : "Saving this for practice later."}</Type>
            </div>
          </div>
        )) : null}
      </div>
      <form className="flex gap-2 border-t border-border-soft p-4" onSubmit={(event) => event.preventDefault()}>
        <input aria-label="Write a comment" autoFocus={composerFocused} className="h-11 min-w-0 flex-1 rounded-full border border-border px-4" placeholder={state === "logged-out" ? "Connect to join the conversation" : "Write a comment"} />
        <Button type="submit">Post</Button>
      </form>
    </div>
  );
}

function ReviewSurface({ composerFocused = false, state = "comments" }: { composerFocused?: boolean; state?: ReviewState }) {
  const [open, setOpen] = React.useState(true);
  return (
    <FeedPanelLayout
      className="h-dvh bg-black"
      panel={(
        <FeedSidePanel closeLabel="Close" description="86 comments" onOpenChange={setOpen} open={open} title="Comments">
          <CommentPreview composerFocused={composerFocused} state={state} />
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

export const LongThread: Story = {
  name: "Comments / Long thread",
  args: { children: null, closeLabel: "Close", onOpenChange: () => undefined, open: true, title: "Comments" },
  parameters: { viewport: { defaultViewport: "desktop" } },
  render: () => <ReviewSurface state="long" />,
};

export const Empty: Story = {
  name: "Comments / Empty",
  args: { children: null, closeLabel: "Close", onOpenChange: () => undefined, open: true, title: "Comments" },
  render: () => <ReviewSurface state="empty" />,
};

export const Loading: Story = {
  name: "Comments / Loading",
  args: { children: null, closeLabel: "Close", onOpenChange: () => undefined, open: true, title: "Comments" },
  render: () => <ReviewSurface state="loading" />,
};

export const ErrorState: Story = {
  name: "Comments / Error",
  args: { children: null, closeLabel: "Close", onOpenChange: () => undefined, open: true, title: "Comments" },
  render: () => <ReviewSurface state="error" />,
};

export const LoggedOut: Story = {
  name: "Comments / Logged out",
  args: { children: null, closeLabel: "Close", onOpenChange: () => undefined, open: true, title: "Comments" },
  render: () => <ReviewSurface state="logged-out" />,
};

export const ComposerFocused: Story = {
  name: "Comments / Composer focused",
  args: { children: null, closeLabel: "Close", onOpenChange: () => undefined, open: true, title: "Comments" },
  render: () => <ReviewSurface composerFocused />,
};
