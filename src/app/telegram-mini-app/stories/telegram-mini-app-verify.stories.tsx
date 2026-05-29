import type { Meta, StoryObj } from "@storybook/react-vite";

import { TelegramMiniAppVerifyView } from "../telegram-mini-app-verify-view";

const noop = () => {};

const meta = {
  title: "Routes/Telegram Mini App/Verify",
  component: TelegramMiniAppVerifyView,
  parameters: {
    layout: "fullscreen",
    viewport: { defaultViewport: "mobile1" },
  },
  args: {
    onOpenBoard: noop,
    onOpenPendingLaunch: noop,
    onRetry: noop,
    providerBusy: false,
    screen: { kind: "booting" },
  },
} satisfies Meta<typeof TelegramMiniAppVerifyView>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Idle: Story = {
  args: {
    screen: { kind: "idle" },
  },
};

export const Checking: Story = {
  args: {
    screen: { kind: "booting" },
  },
};

export const CheckingStatus: Story = {
  name: "Checking / Status refresh",
  args: {
    screen: { kind: "checking" },
  },
};

export const PreparingSelfVerification: Story = {
  name: "Preparing / Self verification",
  args: {
    screen: { kind: "preparing", provider: "self" },
  },
};

export const PreparingVeryVerification: Story = {
  name: "Preparing / Very verification",
  args: {
    screen: { kind: "preparing", provider: "very" },
  },
};

export const ReadyForSelfVerification: Story = {
  name: "Ready / Self verification",
  args: {
    screen: {
      href: "https://self.xyz/verify?scope=community",
      kind: "ready",
      message: "Prove United States nationality anonymously with Self.xyz.",
      provider: "self",
    },
  },
};

export const WaitingForSelfReturn: Story = {
  name: "Waiting / Self return",
  args: {
    screen: {
      href: "https://self.xyz/verify?scope=community",
      kind: "external_started",
      provider: "self",
    },
  },
};

export const ReadyForZkPassport: Story = {
  name: "Ready / ZKPassport",
  args: {
    screen: {
      href: "https://z.noah.com/verify?scope=community",
      kind: "ready",
      message: "Use the ZKPassport App to continue.",
      provider: "zkpassport",
    },
  },
};

export const Joining: Story = {
  args: {
    screen: { kind: "joining" },
  },
};

export const JoiningBusy: Story = {
  name: "Joining / Provider busy",
  args: {
    providerBusy: true,
    screen: { kind: "joining" },
  },
};

export const Joined: Story = {
  args: {
    screen: { kind: "done", result: "joined" },
  },
};

export const AlreadyMember: Story = {
  name: "Already member",
  args: {
    screen: { kind: "done", result: "already_member" },
  },
};

export const PendingRequest: Story = {
  name: "Pending request",
  args: {
    screen: { kind: "done", result: "pending_request" },
  },
};

export const NationalityGateFailed: Story = {
  name: "Blocked / Nationality gate",
  args: {
    screen: {
      canRetry: true,
      kind: "blocked",
      message: "Required: United States nationality",
    },
  },
};

export const TerminalBlocked: Story = {
  name: "Blocked / No retry",
  args: {
    screen: {
      canRetry: false,
      kind: "blocked",
      message: "This account cannot join this community.",
    },
  },
};

export const LinkFailed: Story = {
  name: "Error / Telegram identity",
  args: {
    screen: {
      canRetry: true,
      kind: "error",
      message: "Could not verify Telegram identity.",
    },
  },
};
