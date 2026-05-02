import type { Meta, StoryObj } from "@storybook/react-vite"
import * as React from "react"

import {
  GateExpressionBuilder,
  type GateExpression,
  type GateExpressionScope,
} from "../gate-expression-builder"
import { Type } from "@/components/primitives/type"

const meta = {
  title: "Compositions/GateExpressionBuilder",
  component: GateExpressionBuilder,
  args: {
    scope: "handle_claim",
    maxDepth: 2,
  },
  parameters: {
    layout: "fullscreen",
  },
  decorators: [
    (Story: () => React.ReactNode) => (
      <div className="mx-auto max-w-2xl p-6">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof GateExpressionBuilder>

export default meta

type Story = StoryObj<typeof meta>

function InteractiveBuilder({
  initialExpression,
  scope,
  maxDepth,
}: {
  initialExpression: GateExpression
  scope: GateExpressionScope
  maxDepth?: number
}) {
  const [expression, setExpression] = React.useState<GateExpression>(initialExpression)

  return (
    <div className="space-y-4">
      <GateExpressionBuilder
        expression={expression}
        scope={scope}
        maxDepth={maxDepth ?? 2}
        onChange={setExpression}
      />
      <Type as="pre" variant="caption" className="rounded border border-border-soft bg-muted/30 p-3 text-muted-foreground">
        {JSON.stringify(expression, null, 2)}
      </Type>
    </div>
  )
}

export const SimpleAnd: Story = {
  name: "Simple — ALL of",
  render: () => (
    <InteractiveBuilder
      scope="handle_claim"
      initialExpression={{
        op: "and",
        children: [
          { op: "gate", gate: { type: "community_membership" } },
          { op: "gate", gate: { type: "community_karma", min_karma: 50 } },
        ],
      }}
    />
  ),
}

export const SimpleOr: Story = {
  name: "Simple — ANY of",
  render: () => (
    <InteractiveBuilder
      scope="handle_claim"
      initialExpression={{
        op: "or",
        children: [
          { op: "gate", gate: { type: "unique_human", provider: "very" } },
          { op: "gate", gate: { type: "wallet_score", provider: "passport", minimum_score: 20 } },
        ],
      }}
    />
  ),
}

export const Threshold: Story = {
  name: "Threshold — X of Y",
  render: () => (
    <InteractiveBuilder
      scope="handle_claim"
      initialExpression={{
        op: "threshold",
        count: 2,
        children: [
          { op: "gate", gate: { type: "metadata_match", chain_namespace: "eip155:8453", contract_address: "0x1234", min_quantity: 1, match: { franchise: "pokemon", subject: "charizard" } } },
          { op: "gate", gate: { type: "community_karma", min_karma: 50 } },
          { op: "gate", gate: { type: "community_membership" } },
        ],
      }}
    />
  ),
}

export const NestedGroups: Story = {
  name: "Nested — Group A OR Group B",
  render: () => (
    <InteractiveBuilder
      scope="handle_claim"
      initialExpression={{
        op: "or",
        children: [
          {
            op: "and",
            children: [
              { op: "gate", gate: { type: "metadata_match", chain_namespace: "eip155:8453", contract_address: "0xCourtyard", min_quantity: 1, match: { franchise: "pokemon", subject: "charizard" } } },
              { op: "gate", gate: { type: "community_karma", min_karma: 50 } },
            ],
          },
          {
            op: "and",
            children: [
              { op: "gate", gate: { type: "community_membership" } },
              { op: "gate", gate: { type: "account_age", min_days: 90 } },
            ],
          },
        ],
      }}
    />
  ),
}

export const CommunityMembershipScope: Story = {
  name: "Scope: membership",
  render: () => (
    <InteractiveBuilder
      scope="membership"
      initialExpression={{
        op: "or",
        children: [
          { op: "gate", gate: { type: "unique_human", provider: "very" } },
          { op: "gate", gate: { type: "wallet_score", provider: "passport", minimum_score: 20 } },
        ],
      }}
    />
  ),
}

export const EmptyStart: Story = {
  name: "Empty — start building",
  render: () => (
    <InteractiveBuilder
      scope="handle_claim"
      initialExpression={{
        op: "and",
        children: [
          { op: "gate", gate: { type: "unique_human", provider: "very" } },
        ],
      }}
    />
  ),
}

export const PokemonCharizardRule: Story = {
  name: "Example: Pokemon Charizard gate",
  render: () => (
    <InteractiveBuilder
      scope="handle_claim"
      initialExpression={{
        op: "and",
        children: [
          {
            op: "gate",
            gate: {
              type: "metadata_match",
              chain_namespace: "eip155:8453",
              contract_address: "0xCourtyardPokemon",
              min_quantity: 1,
              match: { category: "trading_card", franchise: "pokemon", subject: "charizard" },
            },
          },
          { op: "gate", gate: { type: "community_karma", min_karma: 50 } },
        ],
      }}
    />
  ),
}

export const UnconfiguredTokenGate: Story = {
  name: "Unconfigured token gate",
  render: () => (
    <InteractiveBuilder
      scope="handle_claim"
      initialExpression={{
        op: "and",
        children: [
          { op: "gate", gate: { type: "contract_any", chain_namespace: "eip155:8453", contract_address: "" } },
          { op: "gate", gate: { type: "community_membership" } },
        ],
      }}
    />
  ),
}

export const ConfiguredContractAny: Story = {
  name: "Configured token holder",
  render: () => (
    <InteractiveBuilder
      scope="handle_claim"
      initialExpression={{
        op: "and",
        children: [
          { op: "gate", gate: { type: "contract_any", chain_namespace: "eip155:8453", contract_address: "0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045" } },
          { op: "gate", gate: { type: "community_karma", min_karma: 25 } },
        ],
      }}
    />
  ),
}

export const ConfiguredMetadataMatch: Story = {
  name: "Configured metadata match — Charizard",
  render: () => (
    <InteractiveBuilder
      scope="handle_claim"
      initialExpression={{
        op: "and",
        children: [
          {
            op: "gate",
            gate: {
              type: "metadata_match",
              chain_namespace: "eip155:8453",
              contract_address: "0x1a2b3c4d5e6f7890abcdef1234567890abcdef12",
              min_quantity: 1,
              match: { category: "trading_card", franchise: "pokemon", subject: "charizard" },
            },
          },
        ],
      }}
    />
  ),
}

export const TokenIdAllowlist: Story = {
  name: "Token ID allowlist with several IDs",
  render: () => (
    <InteractiveBuilder
      scope="handle_claim"
      initialExpression={{
        op: "or",
        children: [
          {
            op: "gate",
            gate: {
              type: "token_id_allowlist",
              chain_namespace: "eip155:8453",
              contract_address: "0x1a2b3c4d5e6f7890abcdef1234567890abcdef12",
              token_ids: ["42", "1337", "9999", "7"],
            },
          },
          { op: "gate", gate: { type: "community_membership" } },
        ],
      }}
    />
  ),
}

export const ThresholdWithTokenAndKarma: Story = {
  name: "Threshold — token + karma + membership",
  render: () => (
    <InteractiveBuilder
      scope="handle_claim"
      initialExpression={{
        op: "threshold",
        count: 2,
        children: [
          {
            op: "gate",
            gate: {
              type: "metadata_match",
              chain_namespace: "eip155:8453",
              contract_address: "0xCourtyardPokemon",
              min_quantity: 1,
              match: { franchise: "pokemon", subject: "charizard" },
            },
          },
          { op: "gate", gate: { type: "community_karma", min_karma: 50 } },
          { op: "gate", gate: { type: "community_membership" } },
        ],
      }}
    />
  ),
}
