import type { Meta, StoryObj } from "@storybook/react-vite";

import { AdCreator } from "../ad-creator";

const meta = {
  title: "Compositions/Ads/AdCreator",
  component: AdCreator,
  parameters: {
    layout: "fullscreen",
  },
} satisfies Meta<typeof AdCreator>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Overview: Story = {
  name: "Overview",
  render: () => <AdCreator />,
};
