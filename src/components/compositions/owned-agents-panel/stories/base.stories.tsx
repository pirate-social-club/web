import * as React from "react";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { OwnedAgentsPanel } from "../owned-agents-panel";
import type { OwnedAgentsPanelProps, OwnedAgent } from "../owned-agents-panel.types";

const sampleAgent: OwnedAgent = {
  agentId: "agt_abc123",
  displayName: "Captain Bot",
  status: "active",
  createdAt: "2026-03-15T10:00:00Z",
  currentOwnership: {
    ownershipProvider: "clawkey",
    verifiedAt: "2026-03-15T10:05:00Z",
    expiresAt: null,
  },
};

const sampleAgents: OwnedAgent[] = [
  sampleAgent,
  {
    agentId: "agt_def456",
    displayName: "Parrot Assistant",
    status: "active",
    createdAt: "2026-02-10T08:00:00Z",
    currentOwnership: {
      ownershipProvider: "clawkey",
      verifiedAt: "2026-02-10T08:03:00Z",
      expiresAt: null,
    },
  },
];

function InteractiveStory(args: OwnedAgentsPanelProps) {
  const [agents, setAgents] = React.useState(args.agents);
  const [regState, setRegState] = React.useState(args.registrationState);
  const [importValue, setImportValue] = React.useState(args.importValue ?? "");

  return (
    <div className="w-full max-w-xl">
      <OwnedAgentsPanel
        {...args}
        agents={agents}
        importValue={importValue}
        registrationState={regState}
        onImportRegistration={() => {
          setRegState({ kind: "verifying" });
          setTimeout(() => {
            setAgents((prev) => [
              ...prev,
              {
                agentId: "agt_new_" + Date.now(),
                displayName: "New Agent",
                status: "active",
                createdAt: new Date().toISOString(),
                currentOwnership: {
                  ownershipProvider: "clawkey",
                  verifiedAt: new Date().toISOString(),
                  expiresAt: null,
                },
              },
            ]);
            setRegState({ kind: "idle" });
          }, 2000);
        }}
        onImportValueChange={setImportValue}
        onDeregister={(agentId) => {
          setAgents((prev) =>
            prev.map((a) =>
              a.agentId === agentId
                ? { ...a, status: "deregistered" as const, currentOwnership: null }
                : a,
            ),
          );
        }}
      />
    </div>
  );
}

const meta = {
  title: "Compositions/OwnedAgentsPanel",
  component: OwnedAgentsPanel,
  parameters: {
    layout: "centered",
  },
  render: (args) => <InteractiveStory {...args} />,
} satisfies Meta<typeof OwnedAgentsPanel>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Empty: Story = {
  args: {
    agents: [],
    canRegister: true,
    registrationState: { kind: "idle" },
  },
};

export const SingleAgent: Story = {
  args: {
    agents: [sampleAgent],
    canRegister: false,
    registrationState: { kind: "idle" },
  },
};

export const MultipleAgents: Story = {
  args: {
    agents: sampleAgents,
    canRegister: false,
    registrationState: { kind: "idle" },
  },
};

export const WithInactive: Story = {
  args: {
    agents: [
      ...sampleAgents,
      {
        agentId: "agt_old789",
        displayName: "Retired Bot",
        status: "deregistered",
        createdAt: "2025-12-01T12:00:00Z",
        currentOwnership: null,
      },
    ],
    canRegister: false,
    registrationState: { kind: "idle" },
  },
};

export const EmptyNotAllowed: Story = {
  args: {
    agents: [],
    canRegister: false,
    registrationState: { kind: "idle" },
  },
};

export const Mobile: Story = {
  args: {
    agents: [sampleAgent],
    canRegister: false,
    registrationState: { kind: "idle" },
  },
  parameters: {
    viewport: { defaultViewport: "mobile1" },
  },
};

export const AwaitingOwner: Story = {
  args: {
    agents: [],
    canRegister: false,
    registrationState: {
      kind: "awaiting_owner",
      registrationUrl: "https://app.clawkey.ai/register/cks_demo_123",
      sessionId: "cks_demo_123",
      expiresAt: "2026-04-20T12:00:00Z",
    },
  },
};
