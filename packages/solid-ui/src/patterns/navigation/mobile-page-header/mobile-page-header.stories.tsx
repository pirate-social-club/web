import type { Meta, StoryObj } from "storybook-solidjs-vite";
import { expect, userEvent, within } from "storybook/test";

import { IconButton } from "@/components/actions/icon-button/icon-button";
import { IconBell } from "@/components/media/icons";

import { MobilePageHeader } from "./mobile-page-header";

const meta = {
  title: "Patterns/Navigation/MobilePageHeader",
  component: MobilePageHeader,
  parameters: {
    layout: "fullscreen",
    docs: {
      description: {
        component:
          "Mobile sub-page header on top of AppHeader: close or back leading affordance, centered title (optionally tappable, optionally with avatar), trailing action slot.",
      },
    },
  },
  globals: {
    viewport: { value: "mobile1", isRotated: false },
  },
} satisfies Meta<typeof MobilePageHeader>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    title: "Notifications",
  },
};

export const WithBack: Story = {
  args: {
    title: "Post",
    onBackClick: () => {},
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByRole("button", { name: "Go back" })).toBeVisible();
  },
};

export const WithCloseAndTrailingAction: Story = {
  args: {
    title: "Compose",
    onCloseClick: () => {},
    trailingAction: (
      <IconButton aria-label="Drafts" variant="ghost">
        <IconBell class="size-6" />
      </IconButton>
    ),
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.click(canvas.getByRole("button", { name: "Close" }));
    await expect(canvas.getByRole("button", { name: "Drafts" })).toBeVisible();
  },
};

export const WithAvatarTitle: Story = {
  args: {
    title: "wavemaker",
    titleAvatarFallback: "wavemaker",
    onTitleClick: () => {},
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(
      canvas.getByRole("button", { name: "Open wavemaker" }),
    ).toBeVisible();
  },
};
