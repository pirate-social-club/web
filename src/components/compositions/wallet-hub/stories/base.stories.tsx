import type { Meta, StoryObj } from "@storybook/react-vite";

import { WalletHub } from "../wallet-hub";
import type { WalletHubProps } from "../wallet-hub.types";

const baseArgs: WalletHubProps = {
  title: "Wallet",
  walletLabel: "Connected EVM wallet",
  walletAddress: "0x42a5f77f2d06c9a7e304817b3c177b91e0c2f3a8",
  chainSections: [
    {
      chainId: "ethereum",
      title: "Ethereum",
      availability: "ready",
      tokens: [
        { id: "eth", symbol: "ETH", name: "Ether", balance: "1.28" },
        { id: "usdc-eth", symbol: "USDC", name: "USD Coin", balance: "420.00" },
      ],
    },
    {
      chainId: "base",
      title: "Base",
      availability: "ready",
      tokens: [
        { id: "eth-base", symbol: "ETH", name: "Ether", balance: "0.64" },
        { id: "usdc-base", symbol: "USDC", name: "USD Coin", balance: "126.40" },
      ],
    },
    {
      chainId: "story",
      title: "Story",
      availability: "ready",
      tokens: [
        { id: "wip", symbol: "WIP", name: "Wrapped IP", balance: "18.20" },
      ],
    },
    {
      chainId: "tempo",
      title: "Tempo",
      availability: "ready",
      tokens: [
        { id: "tempo", symbol: "TEMPO", name: "Tempo", balance: "Later" },
      ],
    },
    {
      chainId: "solana",
      title: "Solana",
      availability: "later",
      tokens: [
        { id: "sol", symbol: "SOL", name: "Solana" },
      ],
    },
    {
      chainId: "bitcoin",
      title: "Bitcoin",
      availability: "later",
      tokens: [
        { id: "btc", symbol: "BTC", name: "Bitcoin" },
      ],
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
    chainSections: [
      {
        chainId: "ethereum",
        title: "Ethereum",
        availability: "ready",
        tokens: [
          { id: "eth", symbol: "ETH", name: "Ether", balance: "0.82" },
        ],
      },
      {
        chainId: "base",
        title: "Base",
        availability: "ready",
        tokens: [
          { id: "usdc-base", symbol: "USDC", name: "USD Coin", balance: "96.00" },
        ],
      },
      {
        chainId: "story",
        title: "Story",
        availability: "ready",
        tokens: [
          { id: "wip", symbol: "WIP", name: "Wrapped IP", balance: "Later" },
        ],
      },
      {
        chainId: "tempo",
        title: "Tempo",
        availability: "later",
        tokens: [
          { id: "tempo", symbol: "TEMPO", name: "Tempo" },
        ],
      },
      {
        chainId: "solana",
        title: "Solana",
        availability: "later",
        tokens: [
          { id: "sol", symbol: "SOL", name: "Solana" },
        ],
      },
      {
        chainId: "bitcoin",
        title: "Bitcoin",
        availability: "later",
        tokens: [
          { id: "btc", symbol: "BTC", name: "Bitcoin" },
        ],
      },
    ],
  },
};

export const Mobile: Story = {
  parameters: {
    viewport: { defaultViewport: "mobile1" },
  },
};
