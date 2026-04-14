import type { Meta, StoryObj } from "@storybook/react-vite";

import { SearchTrigger } from "./search-trigger";

const meta = {
  title: "Primitives/SearchTrigger",
  component: SearchTrigger,
  args: {
    placeholder: "Search Pirate",
  },
} satisfies Meta<typeof SearchTrigger>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const Compact: Story = {
  args: {
    placeholder: "Search communities",
    size: "compact",
  },
};
