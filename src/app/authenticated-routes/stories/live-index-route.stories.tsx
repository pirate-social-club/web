import type { Meta, StoryObj } from "@storybook/react-vite";

import { LiveIndexPage } from "../live-index-route";

const meta = {
  title: "Routes/Live index",
  component: LiveIndexPage,
  parameters: { layout: "fullscreen" },
} satisfies Meta<typeof LiveIndexPage>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Empty: Story = {};
