import type { Meta, StoryObj } from "@storybook/react-vite";

import {
  telegramVerifyReadyMessage,
  telegramVerifyReadyTitle,
  telegramVerifyWaitingMessage,
  telegramVerifyWaitingTitle,
  TelegramMiniAppVerifyView,
} from "../telegram-mini-app-route";

const noop = () => {};

const meta = {
  title: "Routes/Telegram Mini App/Verify",
  component: TelegramMiniAppVerifyView,
  parameters: {
    layout: "fullscreen",
    viewport: { defaultViewport: "mobile1" },
  },
  args: {
    busy: false,
    canRetry: false,
    externalLaunchOpened: false,
    message: "Verifying access...",
    onCheckStatus: noop,
    onClose: noop,
    onOpenBoard: noop,
    onOpenPendingLaunch: noop,
    onRetry: noop,
    pendingLaunch: null,
    status: "loading",
    title: "Checking...",
  },
} satisfies Meta<typeof TelegramMiniAppVerifyView>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Checking: Story = {
  args: {
    busy: true,
    message: "Verifying access...",
    status: "loading",
    title: "Checking...",
  },
};

export const ReadyForSelfVerification: Story = {
  name: "Ready / Self verification",
  args: {
    message: telegramVerifyReadyMessage("self"),
    pendingLaunch: {
      href: "https://self.xyz/verify?scope=community",
      provider: "self",
    },
    status: "waiting",
    title: telegramVerifyReadyTitle("self"),
  },
};

export const WaitingForSelfReturn: Story = {
  name: "Waiting / Self return",
  args: {
    externalLaunchOpened: true,
    message: telegramVerifyWaitingMessage("self"),
    pendingLaunch: {
      href: "https://self.xyz/verify?scope=community",
      provider: "self",
    },
    status: "waiting",
    title: telegramVerifyWaitingTitle("self"),
  },
};

export const ReadyForZkPassport: Story = {
  name: "Ready / ZKPassport",
  args: {
    message: telegramVerifyReadyMessage("zkpassport"),
    pendingLaunch: {
      href: "https://z.noah.com/verify?scope=community",
      provider: "zkpassport",
    },
    status: "waiting",
    title: telegramVerifyReadyTitle("zkpassport"),
  },
};

export const Joining: Story = {
  args: {
    busy: true,
    message: "Joining community...",
    status: "joining",
    title: "Verify to join",
  },
};

export const Joined: Story = {
  args: {
    message: "Joined.",
    status: "success",
    title: "Done",
  },
};

export const AlreadyMember: Story = {
  name: "Already member",
  args: {
    message: "You're already a member.",
    status: "success",
    title: "Done",
  },
};

export const PendingRequest: Story = {
  name: "Pending request",
  args: {
    message: "Your join request is pending.",
    status: "success",
    title: "Done",
  },
};

export const NationalityGateFailed: Story = {
  name: "Blocked / Nationality gate",
  args: {
    canRetry: true,
    message: "This account does not meet the community requirements.",
    status: "blocked",
    title: "Not eligible yet",
  },
};

export const LinkFailed: Story = {
  name: "Error / Telegram identity",
  args: {
    canRetry: true,
    message: "Could not verify Telegram identity.",
    status: "error",
    title: "Verification failed",
  },
};
