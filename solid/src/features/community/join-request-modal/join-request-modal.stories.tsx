import { Show, createSignal } from "solid-js";
import type { Meta, StoryObj } from "storybook-solidjs-vite";
import { expect, userEvent, within } from "storybook/test";

import { Type } from "../../../design-system";
import {
  CommunityJoinRequestModal,
  type CommunityJoinRequestModalProps,
} from "./community-join-request-modal";

function JoinRequestStory(props: Pick<CommunityJoinRequestModalProps, "initialNote" | "submitted" | "submitting">) {
  const [open, setOpen] = createSignal(true);
  const [submitted, setSubmitted] = createSignal(props.submitted ?? false);
  const [lastNote, setLastNote] = createSignal("");
  const [submitCount, setSubmitCount] = createSignal(0);
  let opener: HTMLButtonElement | undefined;

  const handleSubmit = (note: string) => {
    if (props.submitting) return;
    setLastNote(note);
    setSubmitCount((count) => count + 1);
    setSubmitted(true);
  };

  const handleOpenChange = (nextOpen: boolean) => {
    if (nextOpen) setSubmitted(false);
    setOpen(nextOpen);
    if (!nextOpen) queueMicrotask(() => opener?.focus());
  };

  const reopen = () => {
    setSubmitted(false);
    setOpen(true);
    queueMicrotask(() => opener?.focus());
  };

  return (
    <div class="min-h-[680px] bg-background p-6 text-foreground" dir="rtl">
      <Show when={!open()}>
        <button
          ref={opener}
          id="join-request-reopen"
          onClick={reopen}
          type="button"
        >
          Reopen request
        </button>
      </Show>
      <CommunityJoinRequestModal
        communityName="Signal Room"
        initialNote={props.initialNote}
        onOpenChange={handleOpenChange}
        onSubmit={handleSubmit}
        open={open()}
        submitted={submitted()}
        submitting={props.submitting}
      />
      <Show when={lastNote()}>
        {(note) => (
          <Type aria-live="polite" class="sr-only" variant="caption">
            Submitted note: {note()} ({note().length} characters); submitted {submitCount()} times
          </Type>
        )}
      </Show>
    </div>
  );
}

const meta = {
  title: "Compositions/Community/JoinRequestModal",
  component: CommunityJoinRequestModal,
  args: {
    communityName: "Signal Room",
    onOpenChange: () => undefined,
    onSubmit: () => undefined,
    open: true,
  },
  parameters: {
    layout: "fullscreen",
    a11y: { test: "error" },
  },
} satisfies Meta<typeof CommunityJoinRequestModal>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  name: "Default",
  globals: { direction: "rtl" },
  render: () => <JoinRequestStory />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const dialog = await within(document.body).findByRole("dialog");
    const note = within(dialog).getByRole("textbox", { name: "Message (Optional)" });
    await expect(note).toHaveFocus();
    await userEvent.type(note, "  I would like to contribute to Signal Room.  ");
    await expect(note).toHaveValue("  I would like to contribute to Signal Room.  ");
    await expect(within(dialog).getByText("46/500")).toBeInTheDocument();
    await userEvent.click(within(dialog).getByRole("button", { name: "Submit" }));
    await expect(within(document.body).getByText("Submitted note: I would like to contribute to Signal Room. (42 characters); submitted 1 times")).toBeInTheDocument();
    await expect(within(document.body).getByRole("heading", { name: "Request submitted" })).toBeInTheDocument();
    await userEvent.click(within(document.body).getByRole("button", { name: "Done" }));
    await expect(within(document.body).queryByRole("dialog")).toBeNull();
    await expect(canvas.getByRole("button", { name: "Reopen request" })).toHaveFocus();
    await userEvent.click(canvas.getByRole("button", { name: "Reopen request" }));
    await expect(within(document.body).getByRole("textbox", { name: "Message (Optional)" })).toHaveFocus();
  },
};

export const WithPrefilledNote: Story = {
  name: "With prefilled note",
  globals: { direction: "rtl" },
  render: () => <JoinRequestStory initialNote="I have been following the community and would like to participate." />,
  play: async () => {
    const dialog = await within(document.body).findByRole("dialog");
    const note = within(dialog).getByRole("textbox", { name: "Message (Optional)" });
    await expect(note).toHaveValue("I have been following the community and would like to participate.");
    await userEvent.keyboard("{Escape}");
    await expect(within(document.body).queryByRole("dialog")).toBeNull();
    await userEvent.click(within(document.body).getByRole("button", { name: "Reopen request" }));
    await expect(within(document.body).getByRole("textbox", { name: "Message (Optional)" })).toHaveValue("I have been following the community and would like to participate.");
  },
};

export const Submitting: Story = {
  name: "Submitting",
  globals: { direction: "rtl" },
  render: () => <JoinRequestStory submitting />,
  play: async () => {
    const dialog = await within(document.body).findByRole("dialog");
    const note = within(dialog).getByRole("textbox", { name: "Message (Optional)" });
    const submit = within(dialog).getByRole("button", { name: "Submit" });
    await expect(note).toBeDisabled();
    await expect(submit).toBeDisabled();
    await expect(submit).toHaveAttribute("aria-busy", "true");
  },
};

export const Submitted: Story = {
  name: "Submitted",
  globals: { direction: "rtl" },
  render: () => <JoinRequestStory submitted />,
  play: async () => {
    const dialog = await within(document.body).findByRole("dialog");
    await expect(within(dialog).getByRole("heading", { name: "Request submitted" })).toBeInTheDocument();
    await expect(within(dialog).getByText("The moderators will review your request.")).toBeInTheDocument();
    await userEvent.keyboard("{Escape}");
    await expect(within(document.body).queryByRole("dialog")).toBeNull();
    await expect(within(document.body).getByRole("button", { name: "Reopen request" })).toHaveFocus();
  },
};
