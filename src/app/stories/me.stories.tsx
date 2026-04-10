import type { Meta, StoryObj } from "@storybook/react-vite";
import * as React from "react";

import { PirateApp } from "@/app";

const meta = {
  title: "Pages/Me",
  component: PirateApp,
  args: {
    initialPath: "/me",
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

export const MobileArabic: Story = {
  globals: {
    direction: "auto",
    locale: "ar",
  },
  parameters: {
    viewport: { defaultViewport: "mobile1" },
  },
};
