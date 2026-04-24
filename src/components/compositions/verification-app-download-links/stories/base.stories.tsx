import type { Meta, StoryObj } from "@storybook/react-vite";
import * as React from "react";

import { VerificationAppDownloadLinks } from "../verification-app-download-links";

const meta = {
  title: "Compositions/VerificationAppDownloadLinks",
  component: VerificationAppDownloadLinks,
  decorators: [
    (Story: () => React.ReactNode) => (
      <div className="w-full max-w-sm bg-background p-6 text-foreground">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof VerificationAppDownloadLinks>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Self: Story = {
  args: {
    app: "self",
  },
};

export const Very: Story = {
  args: {
    app: "very",
  },
};

export const MobileSelf: Story = {
  name: "Mobile / Self",
  args: {
    app: "self",
  },
  parameters: {
    viewport: { defaultViewport: "mobile1" },
  },
};

export const MobileVery: Story = {
  name: "Mobile / Very",
  args: {
    app: "very",
  },
  parameters: {
    viewport: { defaultViewport: "mobile1" },
  },
};
