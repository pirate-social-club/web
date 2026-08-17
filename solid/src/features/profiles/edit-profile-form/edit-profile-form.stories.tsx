/** @jsxImportSource @solidjs/web */

import { createSignal } from "solid-js";
import type { JSX } from "@solidjs/web";
import type { Meta, StoryObj } from "storybook-solidjs-vite";
import { expect, userEvent, within } from "storybook/test";
import { fixtureImage } from "../../posts/post-card/fixtures";

import {
  Button,
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
  Type,
} from "../../../design-system";
import {
  EditProfileDialog,
  EditProfileForm,
  GlobalHandleField,
} from "./edit-profile-form";
import type {
  EditProfileFormProps,
  EditProfileHandleFlow,
  HandleRenameState,
} from "./edit-profile-form.types";

const baseValues = {
  displayName: "Pampa_of_Argentina",
  bio: "Buenos Aires, bookstores, football, and a listening history that should probably count as public infrastructure.",
};

const baseArgs: EditProfileFormProps = {
  currentBio: baseValues.bio,
  currentDisplayName: baseValues.displayName,
  currentHandle: "pampa_of_argentina.pirate",
  currentAvatarSeed: "pampa",
  currentAvatarSrc: fixtureImage("profile-avatar", 160, 160),
  fieldErrors: [],
  submitState: { kind: "idle" },
  values: baseValues,
};

function makeFlow(state: HandleRenameState, draft = "", preview?: string): EditProfileHandleFlow {
  return { draft, onCheckAvailability: () => undefined, onDraftChange: () => undefined, onResetState: () => undefined, onSubmitRename: () => undefined, preview, state };
}

const meta = {
  title: "Compositions/Profiles/EditProfileForm",
  component: EditProfileForm,
  args: baseArgs,
  parameters: { layout: "fullscreen", a11y: { test: "error" } },
  decorators: [(Story: () => JSX.Element) => <div class="mx-auto w-full max-w-lg px-4 py-10"><Story /></div>],
} satisfies Meta<typeof EditProfileForm>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const DirtyValid: Story = {
  args: { values: { displayName: "Pampa", bio: "Bookstores and football." } },
  play: async ({ canvasElement }) => {
    await expect(within(canvasElement).getByRole("button", { name: "Save profile" })).toBeEnabled();
  },
};

export const DisplayNameEmptyError: Story = {
  args: {
    fieldErrors: [{ field: "displayName", message: "Display name is required." }],
    values: { displayName: "", bio: baseValues.bio },
  },
};

export const DisplayNameWhitespaceOnly: Story = {
  args: { values: { displayName: "   ", bio: baseValues.bio } },
};

export const BioFilled: Story = {
  args: {
    values: { displayName: baseValues.displayName, bio: "Synths, tape, and too many alternate mixes. Currently living in Buenos Aires and building things on the internet." },
  },
};

export const HandleFieldAvailable: Story = {
  render: () => <GlobalHandleField currentHandle="pampa_of_argentina.pirate" handleFlow={makeFlow({ kind: "available", freeRenameRemaining: true })} />,
  play: async ({ canvasElement }) => {
    await userEvent.click(within(canvasElement).getByRole("button", { name: "Rename handle" }));
  },
};

export const HandleFieldConflict: Story = {
  render: () => <GlobalHandleField currentHandle="pampa_of_argentina.pirate" handleFlow={makeFlow({ kind: "unavailable", reason: "This handle is already taken." })} />,
};

export const HandleFieldRateLimited: Story = {
  render: () => <GlobalHandleField currentHandle="pampa_of_argentina.pirate" handleFlow={makeFlow({ kind: "unavailable", reason: "You have renamed your handle recently. Try again later." })} />,
};

export const HandleFieldChecking: Story = {
  render: () => <GlobalHandleField currentHandle="pampa_of_argentina.pirate" handleFlow={makeFlow({ kind: "checking" })} />,
};

export const HandleFieldSaving: Story = {
  render: () => <GlobalHandleField currentHandle="pampa_of_argentina.pirate" handleFlow={makeFlow({ kind: "saving" })} />,
};

export const HandleFieldSuccess: Story = {
  render: () => <GlobalHandleField currentHandle="pampa_of_argentina.pirate" handleFlow={makeFlow({ kind: "success", newHandle: "pampa.pirate" })} />,
};

export const Saving: Story = {
  args: { submitState: { kind: "saving" }, values: { displayName: "Pampa", bio: "Bookstores and football." } },
};

export const SaveFailure: Story = {
  args: { submitState: { kind: "error", message: "Failed to save. Try again." }, values: { displayName: "Pampa", bio: "Bookstores and football." } },
};

export const DesktopDialog: Story = {
  render: (args) => <EditProfileDialog {...args} fieldIdPrefix="desktop-dialog">Edit profile</EditProfileDialog>,
};

export const DesktopDialogWithHandleFlow: Story = {
  render: (args) => <EditProfileDialog {...args} currentHandle="pampa-of-argentina.pirate" fieldIdPrefix="desktop-dialog-handle" handleFlow={makeFlow({ kind: "available", freeRenameRemaining: true }, "captain", "captain.pirate")}>Edit profile</EditProfileDialog>,
};

function MobileSheetStory(props: { args: EditProfileFormProps; withHandle?: boolean }) {
  const [open, setOpen] = createSignal(false);
  const [values, setValues] = createSignal(props.args.values);
  return (
    <Sheet onOpenChange={setOpen} open={open()}>
      <SheetTrigger>Edit profile</SheetTrigger>
      <SheetContent class="max-h-[90vh] overflow-y-auto rounded-t-[var(--radius-xl)]" side="bottom">
        <SheetHeader>
          <SheetTitle>Edit profile</SheetTitle>
          <Type variant="caption">Update your display name, bio, or handle.</Type>
        </SheetHeader>
        <EditProfileForm
          {...props.args}
          currentHandle={props.withHandle ? "pampa-of-argentina.pirate" : props.args.currentHandle}
          fieldIdPrefix="mobile-sheet"
          handleFlow={props.withHandle ? makeFlow({ kind: "available", freeRenameRemaining: true }, "captain", "captain.pirate") : undefined}
          onChange={setValues}
          values={values()}
        />
        <Type aria-live="polite" class="sr-only" variant="caption">{values().displayName}</Type>
      </SheetContent>
    </Sheet>
  );
}

export const MobileSheet: Story = {
  globals: { viewport: { value: "mobile1", isRotated: false } },
  render: (args) => <MobileSheetStory args={args} />,
};

export const MobileSheetWithHandleFlow: Story = {
  globals: { viewport: { value: "mobile1", isRotated: false } },
  render: (args) => <MobileSheetStory args={args} withHandle />,
};

export const MobileSheetDefault: Story = {
  args: baseArgs,
  globals: { viewport: { value: "mobile1", isRotated: false } },
  render: (args) => <MobileSheetStory args={args} />,
};
