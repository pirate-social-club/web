import type { Meta, StoryObj } from "@storybook/react-vite";

import { WalletHub } from "../wallet-hub";
import type { WalletHubProps } from "../wallet-hub.types";

const baseArgs: WalletHubProps = {
  walletLabel: "Manage your addresses and assets across chains.",
  walletAddress: "0x42a5f77f2d06c9a7e304817b3c177b91e0c2f3a8",
  chainSections: [
    {
      chainId: "ethereum",
      title: "Ethereum",
      availability: "ready",
      walletAddress: "0xc74e2d06c9a7e304817b3c177b91e0c1f4873",
      tokens: [
        { id: "eth", symbol: "ETH", name: "Ethereum", balance: "4.1267", fiatValue: "$10,943.82" },
        { id: "usdc-eth", symbol: "USDC", name: "USD Coin", balance: "512.36", fiatValue: "$512.36" },
        { id: "usdt-eth", symbol: "USDT", name: "Tether USD", balance: "250.00", fiatValue: "$250.00" },
        { id: "dai-eth", symbol: "DAI", name: "Dai Stablecoin", balance: "120.00", fiatValue: "$120.00" },
        { id: "wbtc-eth", symbol: "WBTC", name: "Wrapped Bitcoin", balance: "0.0125", fiatValue: "$869.82" },
        { id: "link-eth", symbol: "LINK", name: "Chainlink", balance: "35.72", fiatValue: "$388.99" },
      ],
    },
    {
      chainId: "story",
      title: "Story",
      availability: "ready",
      walletAddress: "0xc74e2d06c9a7e304817b3c177b91e0c1f4873",
      tokens: [
        { id: "ip", symbol: "IP", name: "Story", balance: "96.40", fiatValue: "$173.52" },
        { id: "wip", symbol: "WIP", name: "Wrapped IP", balance: "18.20", fiatValue: "$32.76" },
      ],
    },
    {
      chainId: "bitcoin",
      title: "Bitcoin",
      availability: "ready",
      walletAddress: "bc1qflgh4s9q8qg7d8e83a5fd",
      tokens: [
        { id: "btc", symbol: "BTC", name: "Bitcoin", balance: "0.2864", fiatValue: "$19,910.87" },
      ],
    },
    {
      chainId: "solana",
      title: "Solana",
      availability: "ready",
      walletAddress: "8Bv3n4Jcw7pQZsVJwX7nXcK",
      tokens: [
        { id: "sol", symbol: "SOL", name: "Solana", balance: "22.40", fiatValue: "$3,280.48" },
        { id: "usdc-sol", symbol: "USDC", name: "USD Coin", balance: "840.15", fiatValue: "$840.15" },
      ],
    },
    {
      chainId: "tempo",
      title: "Tempo",
      availability: "ready",
      walletAddress: "tempo1q90p4q7kkd8a56a2z7p",
      tokens: [
        { id: "tempo-pathusd", symbol: "pathUSD", name: "pathUSD", balance: "1,204.11", fiatValue: "$1,204.11" },
      ],
    },
    {
      chainId: "cosmos",
      title: "Cosmos",
      availability: "ready",
      walletAddress: "cosmos1cv8e7h3lt5x0r3d5z",
      tokens: [
        { id: "p2p", symbol: "P2P", name: "Sentinel", balance: "4,820.00", fiatValue: "$192.80" },
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
        chainId: "optimism",
        title: "Optimism",
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
        note: "Coming soon",
      },
    ],
  },
};

export const Mobile: Story = {
  parameters: {
    viewport: { defaultViewport: "mobile1" },
  },
};
