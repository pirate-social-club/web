import type { Meta, StoryObj } from "@storybook/react-vite";
import * as React from "react";

import { PirateApp } from "@/app";

const meta = {
  title: "Pages/UserProfile",
  component: PirateApp,
  args: {
    initialPath: "/u/usr_01_kevin_parker",
  },
  parameters: {
    layout: "fullscreen",
  },
  decorators: [
    (Story: () => React.ReactNode) => (
      <div style={{ minHeight: "100vh", width: "100%" }}>
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof PirateApp>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Desktop: Story = {};

export const Mobile: Story = {
  parameters: {
    viewport: { defaultViewport: "mobile1" },
  },
};
