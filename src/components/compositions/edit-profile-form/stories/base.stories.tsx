import type { Meta, StoryObj } from "@storybook/react-vite";
import * as React from "react";

import { Button } from "@/components/primitives/button";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from "@/components/primitives/sheet";
import { EditProfileDialog, EditProfileForm, GlobalHandleField } from "../edit-profile-form";
import type { EditProfileFormProps } from "../edit-profile-form.types";
import type { HandleRenameState } from "@/hooks/use-global-handle-flow";

type MockHandleFlow = {
  draft: string;
  preview: string;
  state: HandleRenameState;
  setDraft: (v: string) => void;
  checkAvailability: () => void;
  submitRename: () => Promise<void>;
  resetState: () => void;
};

function makeMockHandleFlow(overrides: Partial<MockHandleFlow> = {}): MockHandleFlow {
  return {
    draft: "",
    preview: "",
    state: { kind: "idle" },
    setDraft: () => {},
    checkAvailability: () => {},
    submitRename: async () => {},
    resetState: () => {},
    ...overrides,
  };
}

const BASE_PROPS: EditProfileFormProps = {
  currentDisplayName: "Pampa_of_Argentina",
  currentBio: "Buenos Aires, bookstores, football, and a listening history that should probably count as public infrastructure.",
  currentAvatarSrc: "https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=300&q=80",
  values: {
    displayName: "Pampa_of_Argentina",
    bio: "Buenos Aires, bookstores, football, and a listening history that should probably count as public infrastructure.",
  },
  fieldErrors: [],
  submitState: { kind: "idle" },
};

const meta = {
  title: "Compositions/EditProfileForm",
  component: EditProfileForm,
  args: BASE_PROPS,
  parameters: {
    layout: "fullscreen",
  },
  decorators: [
    (Story: () => React.ReactNode) => (
      <div className="mx-auto max-w-lg px-4 py-10">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof EditProfileForm>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const DirtyValid: Story = {
  args: {
    values: {
      displayName: "Pampa",
      bio: "Bookstores and football.",
    },
  },
};

export const DisplayNameEmptyError: Story = {
  args: {
    values: {
      displayName: "",
      bio: BASE_PROPS.values.bio,
    },
    fieldErrors: [
      { field: "displayName", message: "Display name is required." },
    ],
  },
};

export const DisplayNameWhitespaceOnly: Story = {
  args: {
    values: {
      displayName: "   ",
      bio: BASE_PROPS.values.bio,
    },
  },
};

export const BioFilled: Story = {
  args: {
    values: {
      displayName: BASE_PROPS.currentDisplayName,
      bio: "Synths, tape, and too many alternate mixes. Currently living in Buenos Aires and building things on the internet.",
    },
  },
};

export const HandleFieldAvailable: Story = {
  render: () => (
    <GlobalHandleField
      currentHandle="pampa_of_argentina.pirate"
      handleFlow={makeMockHandleFlow({
        state: { kind: "available", freeRenameRemaining: true },
      })}
    />
  ),
};

export const HandleFieldConflict: Story = {
  render: () => (
    <GlobalHandleField
      currentHandle="pampa_of_argentina.pirate"
      handleFlow={makeMockHandleFlow({
        state: { kind: "unavailable", reason: "This handle is already taken." },
      })}
    />
  ),
};

export const HandleFieldRateLimited: Story = {
  render: () => (
    <GlobalHandleField
      currentHandle="pampa_of_argentina.pirate"
      handleFlow={makeMockHandleFlow({
        state: { kind: "unavailable", reason: "You have renamed your handle recently. Try again later." },
      })}
    />
  ),
};

export const HandleFieldChecking: Story = {
  render: () => (
    <GlobalHandleField
      currentHandle="pampa_of_argentina.pirate"
      handleFlow={makeMockHandleFlow({
        state: { kind: "checking" },
      })}
    />
  ),
};

export const HandleFieldSaving: Story = {
  render: () => (
    <GlobalHandleField
      currentHandle="pampa_of_argentina.pirate"
      handleFlow={makeMockHandleFlow({
        state: { kind: "saving" },
      })}
    />
  ),
};

export const HandleFieldSuccess: Story = {
  render: () => (
    <GlobalHandleField
      currentHandle="pampa_of_argentina.pirate"
      handleFlow={makeMockHandleFlow({
        state: { kind: "success", newHandle: "pampa.pirate" },
      })}
    />
  ),
};

export const Saving: Story = {
  args: {
    submitState: { kind: "saving" },
    values: {
      displayName: "Pampa",
      bio: "Bookstores and football.",
    },
  },
};

export const SaveFailure: Story = {
  args: {
    submitState: { kind: "error", message: "Failed to save. Try again." },
    values: {
      displayName: "Pampa",
      bio: "Bookstores and football.",
    },
  },
};

export const DesktopDialog: Story = {
  render: (args) => (
    <EditProfileDialog {...args}>
      <Button>Edit profile</Button>
    </EditProfileDialog>
  ),
};

export const DesktopDialogWithHandleFlow: Story = {
  render: (args) => (
    <EditProfileDialog
      {...args}
      currentHandle="pampa-of-argentina.pirate"
      handleFlow={makeMockHandleFlow({
        draft: "captain",
        preview: "captain.pirate",
        state: { kind: "available", freeRenameRemaining: true },
      })}
    >
      <Button>Edit profile</Button>
    </EditProfileDialog>
  ),
};

export const MobileSheet: Story = {
  render: (args) => (
    <Sheet>
      <SheetTrigger asChild>
        <Button>Edit profile</Button>
      </SheetTrigger>
      <SheetContent side="bottom" className="max-h-[90vh] overflow-y-auto rounded-t-[var(--radius-xl)]">
        <SheetHeader>
          <SheetTitle>Edit profile</SheetTitle>
          <SheetDescription>
            Update your display name, bio, or handle.
          </SheetDescription>
        </SheetHeader>
        <EditProfileForm {...args} />
      </SheetContent>
    </Sheet>
  ),
  parameters: {
    viewport: { defaultViewport: "mobile1" },
  },
};

export const MobileSheetWithHandleFlow: Story = {
  render: (args) => (
    <Sheet>
      <SheetTrigger asChild>
        <Button>Edit profile</Button>
      </SheetTrigger>
      <SheetContent side="bottom" className="max-h-[90vh] overflow-y-auto rounded-t-[var(--radius-xl)]">
        <SheetHeader>
          <SheetTitle>Edit profile</SheetTitle>
          <SheetDescription>
            Update your display name, bio, or handle.
          </SheetDescription>
        </SheetHeader>
        <EditProfileForm
          {...args}
          currentHandle="pampa-of-argentina.pirate"
          handleFlow={makeMockHandleFlow({
            draft: "captain",
            preview: "captain.pirate",
            state: { kind: "available", freeRenameRemaining: true },
          })}
        />
      </SheetContent>
    </Sheet>
  ),
  parameters: {
    viewport: { defaultViewport: "mobile1" },
  },
};

export const MobileSheetDefault: Story = {
  render: (args) => (
    <Sheet>
      <SheetTrigger asChild>
        <Button>Edit profile</Button>
      </SheetTrigger>
      <SheetContent side="bottom" className="max-h-[90vh] overflow-y-auto rounded-t-[var(--radius-xl)]">
        <SheetHeader>
          <SheetTitle>Edit profile</SheetTitle>
          <SheetDescription>
            Update your display name, bio, or handle.
          </SheetDescription>
        </SheetHeader>
        <EditProfileForm {...args} />
      </SheetContent>
    </Sheet>
  ),
  args: BASE_PROPS,
  parameters: {
    viewport: { defaultViewport: "mobile1" },
  },
};
