import type { Meta, StoryObj } from "@storybook/react-vite";

import { WalletHub } from "../wallet-hub";
import type { WalletHubProps } from "../wallet-hub.types";

const baseArgs: WalletHubProps = {
  walletLabel: "Manage addresses and assets across networks",
  walletAddress: "0x42a5f77f2d06c9a7e304817b3c177b91e0c2f3a8",
  chainSections: [
    {
      chainId: "ethereum",
      title: "Ethereum",
      availability: "ready",
      tokens: [
        { id: "eth", symbol: "ETH", name: "Ether", balance: "4.1267" },
        { id: "usdc-eth", symbol: "USDC", name: "USD Coin", balance: "512.36" },
      ],
    },
    {
      chainId: "base",
      title: "Base",
      availability: "ready",
      tokens: [
        { id: "eth-base", symbol: "ETH", name: "Ether", balance: "0.6400" },
        { id: "usdc-base", symbol: "USDC", name: "USD Coin", balance: "126.40" },
      ],
    },
    {
      chainId: "story",
      title: "Story",
      availability: "ready",
      tokens: [
        { id: "ip", symbol: "IP", name: "Story Protocol", balance: "96.40" },
        { id: "wip", symbol: "WIP", name: "Wrapped IP", balance: "18.20" },
      ],
    },
    {
      chainId: "tempo",
      title: "Tempo",
      availability: "later",
      tokens: [],
    },
    {
      chainId: "solana",
      title: "Solana",
      availability: "later",
      tokens: [],
    },
    {
      chainId: "bitcoin",
      title: "Bitcoin",
      availability: "later",
      tokens: [],
    },
  ],
};

const meta = {
  title: "Compositions/WalletHub",
  component: WalletHub,
  args: baseArgs,
  parameters: {
    layout: "fullscreen",
  },
  render: (args) => (
    <div className="min-h-screen bg-background">
      <WalletHub {...args} />
    </div>
  ),
} satisfies Meta<typeof WalletHub>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const Deferred: Story = {
  args: {
    walletLabel: "Manage addresses and assets across networks",
    chainSections: [
      {
        chainId: "ethereum",
        title: "Ethereum",
        availability: "ready",
        tokens: [
          { id: "eth", symbol: "ETH", name: "Ether", balance: "0.82" },
          { id: "usdc-eth", symbol: "USDC", name: "USD Coin", balance: "96.00" },
        ],
      },
      {
        chainId: "base",
        title: "Base",
        availability: "ready",
        tokens: [],
      },
      {
        chainId: "story",
        title: "Story",
        availability: "ready",
        tokens: [
          { id: "ip", symbol: "IP", name: "Story Protocol", balance: "12.80" },
        ],
      },
      {
        chainId: "tempo",
        title: "Tempo",
        availability: "later",
        tokens: [],
      },
      {
        chainId: "solana",
        title: "Solana",
        availability: "later",
        tokens: [],
      },
      {
        chainId: "bitcoin",
        title: "Bitcoin",
        availability: "later",
        tokens: [],
      },
    ],
  },
};

export const Mobile: Story = {
  parameters: {
    viewport: { defaultViewport: "mobile1" },
  },
};
