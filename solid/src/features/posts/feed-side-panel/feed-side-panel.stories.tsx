import { For, Show, createSignal } from "solid-js";
import type { Meta, StoryObj } from "storybook-solidjs-vite";
import { expect, userEvent, waitFor, within } from "storybook/test";

import { Avatar, Button, Spinner, Type } from "../../../design-system";
import { FeedPanelLayout, FeedSidePanel } from "./feed-side-panel";

type ReviewState = "comments" | "empty" | "error" | "loading" | "logged-out" | "long";

const meta = {
  title: "Compositions/Posts/FeedSidePanel",
  component: FeedSidePanel,
  parameters: { layout: "fullscreen" },
} satisfies Meta<typeof FeedSidePanel>;

export default meta;
type Story = StoryObj<typeof meta>;

function CommentPreview(props: { composerFocused?: boolean; state?: ReviewState }) {
  const handles = () => props.state === "long"
    ? Array.from({ length: 18 }, (_, index) => `listener.${index + 1}`)
    : ["mara.english", "songs.pirate", "listener.one"];
  return (
    <div class="flex h-full flex-col">
      <div aria-label="Comment thread" class="min-h-0 flex-1 space-y-5 overflow-y-auto p-5" tabindex="0">
        <Show when={props.state === "loading"}>
          <div class="grid h-full place-items-center"><Spinner label="Loading comments" size="lg" /></div>
        </Show>
        <Show when={props.state === "empty"}><Type variant="caption">No comments yet.</Type></Show>
        <Show when={props.state === "error"}><Type variant="body">Comments could not be loaded right now.</Type></Show>
        <Show when={props.state === "logged-out"}><Type variant="body">Comments remain readable. Connect when you want to reply.</Type></Show>
        <Show when={props.state === "comments" || props.state === "long"}>
          <For each={handles()}>
            {(handle, index) => (
              <div class="flex gap-3">
                <Avatar fallback={handle} size="sm" />
                <div>
                  <Type variant="body-strong">{handle}</Type>
                  <Type variant="body">{index() === 0 ? "That second verse is the tricky part." : "Saving this for practice later."}</Type>
                </div>
              </div>
            )}
          </For>
        </Show>
      </div>
      <form class="flex gap-2 border-t border-border-soft p-4" onSubmit={(event) => event.preventDefault()}>
        <input aria-label="Write a comment" autofocus={props.composerFocused} class="h-11 min-w-0 flex-1 rounded-full border border-border bg-background px-4" placeholder={props.state === "logged-out" ? "Connect to join the conversation" : "Write a comment"} />
        <Button type="submit">Post</Button>
      </form>
    </div>
  );
}

function ReviewSurface(props: { composerFocused?: boolean; state?: ReviewState }) {
  const [open, setOpen] = createSignal(true);
  return (
    <FeedPanelLayout
      class="h-dvh bg-black"
      panel={
        <FeedSidePanel closeLabel="Close" description="86 comments" onOpenChange={setOpen} open={open()} title="Comments">
          <CommentPreview composerFocused={props.composerFocused} state={props.state ?? "comments"} />
        </FeedSidePanel>
      }
    >
      <div class="grid h-full place-items-center bg-gradient-to-b from-muted to-black">
        <div class="text-center">
          <Type as="h1" class="text-white" variant="display">Video stage</Type>
          <Show when={!open()}><Button class="mt-4" onClick={() => setOpen(true)} type="button">Open comments</Button></Show>
        </div>
      </div>
    </FeedPanelLayout>
  );
}

export const DesktopDock: Story = {
  args: { children: null, closeLabel: "Close", onOpenChange: () => undefined, open: true, title: "Comments" },
  globals: { viewport: { value: "desktop", isRotated: false } },
  render: () => <ReviewSurface />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const close = await waitFor(() => canvas.getByRole("button", { name: "Close" }));
    close.focus();
    await expect(close).toHaveFocus();
    await userEvent.click(close);
    await expect(canvas.getByRole("button", { name: "Open comments" })).toBeVisible();
    await userEvent.click(canvas.getByRole("button", { name: "Open comments" }));
    await expect(canvas.getByRole("heading", { name: "Comments" })).toBeVisible();
  },
};

export const MobileSheet: Story = {
  args: { children: null, closeLabel: "Close", onOpenChange: () => undefined, open: true, title: "Comments" },
  globals: { viewport: { value: "mobile1", isRotated: false } },
  render: () => <ReviewSurface />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const body = within(document.body);
    const close = body.getByRole("button", { name: "Close" });
    await expect(close).toBeVisible();
    await userEvent.click(close);
    await expect(canvas.getByRole("button", { name: "Open comments" })).toBeVisible();
  },
};

export const LongThread: Story = {
  args: { children: null, closeLabel: "Close", onOpenChange: () => undefined, open: true, title: "Comments" },
  render: () => <ReviewSurface state="long" />,
};

export const Empty: Story = {
  args: { children: null, closeLabel: "Close", onOpenChange: () => undefined, open: true, title: "Comments" },
  render: () => <ReviewSurface state="empty" />,
};

export const Loading: Story = {
  args: { children: null, closeLabel: "Close", onOpenChange: () => undefined, open: true, title: "Comments" },
  render: () => <ReviewSurface state="loading" />,
};

export const ErrorState: Story = {
  args: { children: null, closeLabel: "Close", onOpenChange: () => undefined, open: true, title: "Comments" },
  render: () => <ReviewSurface state="error" />,
};

export const LoggedOut: Story = {
  args: { children: null, closeLabel: "Close", onOpenChange: () => undefined, open: true, title: "Comments" },
  render: () => <ReviewSurface state="logged-out" />,
};

export const ComposerFocused: Story = {
  args: { children: null, closeLabel: "Close", onOpenChange: () => undefined, open: true, title: "Comments" },
  render: () => <ReviewSurface composerFocused />,
};
