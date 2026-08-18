import type { Meta, StoryObj } from "storybook-solidjs-vite";
import { expect, fn, userEvent, within } from "storybook/test";

import { MobilePageHeader } from "./mobile-page-header";

const meta = {
  title: "Patterns/Navigation/MobilePageHeader",
  component: MobilePageHeader,
  tags: ["autodocs"],
  args: { title: "Settings", onBackClick: fn() },
  argTypes: { backIcon: { table: { disable: true } }, closeIcon: { table: { disable: true } }, class: { table: { disable: true } }, trailingAction: { table: { disable: true } } },
  parameters: { viewport: { defaultViewport: "mobile1" }, docs: { description: { component: "A compact page header with a leading navigation affordance, centered title, optional avatar/title action, and trailing slot." } } },
} satisfies Meta<typeof MobilePageHeader>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
  play: async ({ canvasElement, args }) => {
    const canvas = within(canvasElement);
    await userEvent.click(canvas.getByRole("button", { name: "Back" }));
    await expect(args.onBackClick).toHaveBeenCalledTimes(1);
  },
};

export const CloseAndAction: Story = {
  args: { onBackClick: undefined, onCloseClick: fn(), trailingAction: <button type="button">Save</button> },
  play: async ({ canvasElement, args }) => {
    const canvas = within(canvasElement);
    await userEvent.click(canvas.getByRole("button", { name: "Close" }));
    await expect(args.onCloseClick).toHaveBeenCalledTimes(1);
  },
};

export const AvatarTitle: Story = {
  args: { title: "Atlas Gardens", titleAvatarFallback: "Atlas Gardens", titleAvatarSeed: "Atlas Gardens", onTitleClick: fn() },
  play: async ({ canvasElement, args }) => {
    const canvas = within(canvasElement);
    await userEvent.click(canvas.getByRole("button", { name: "Open Atlas Gardens" }));
    await expect(args.onTitleClick).toHaveBeenCalledTimes(1);
  },
};
