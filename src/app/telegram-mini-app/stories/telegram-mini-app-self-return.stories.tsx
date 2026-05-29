import type { Meta, StoryObj } from "@storybook/react-vite";

import { TelegramMiniAppSelfReturnView } from "../telegram-mini-app-verify-view";

const meta = {
  title: "Routes/Telegram Mini App/Self Return",
  component: TelegramMiniAppSelfReturnView,
  parameters: {
    layout: "fullscreen",
    viewport: { defaultViewport: "mobile1" },
  },
} satisfies Meta<typeof TelegramMiniAppSelfReturnView>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Returning: Story = {
  args: {
    hasCommunityId: true,
  },
};

export const MissingCommunity: Story = {
  name: "Missing community",
  args: {
    hasCommunityId: false,
  },
};
