import type { Meta, StoryObj } from "@storybook/react-vite";
import * as React from "react";
import type { MembershipGateSummary } from "@pirate/api-contracts";

import { Button } from "@/components/primitives/button";
import { Checkbox } from "@/components/primitives/checkbox";
import { Spinner } from "@/components/primitives/spinner";
import { Type } from "@/components/primitives/type";
import { VotePill } from "@/components/primitives/vote-pill";
import { CommunityJoinRequestModal } from "@/components/compositions/community/join-request-modal/community-join-request-modal";
import { cn } from "@/lib/utils";

import {
  CommunityInteractionGateModal,
  type CommunityInteractionGateModalProps,
} from "../community-interaction-gate-modal";

const selfRequirements: MembershipGateSummary[] = [
  { gate_type: "age_over_18" },
];

const veryRequirements: MembershipGateSummary[] = [
  { gate_type: "unique_human" },
];

const passportRequirements: MembershipGateSummary[] = [
  { gate_type: "wallet_score", minimum_score: 20 },
];

const failedRequirements: MembershipGateSummary[] = [
  { gate_type: "nationality", required_value: "ET" },
];

const proofOfWorkRequirements: MembershipGateSummary[] = [
  { gate_type: "altcha_pow" },
];

const meta = {
  title: "Compositions/Community/InteractionGateModal",
  component: CommunityInteractionGateModal,
  args: {
    description: "Join Local Transit before you vote.",
    onOpenChange: () => {},
    open: true,
    title: "Join to vote",
  },
  decorators: [
    (Story: () => React.ReactNode) => (
      <div className="min-h-[720px] bg-background p-6 text-foreground">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof CommunityInteractionGateModal>;

export default meta;

type Story = StoryObj<typeof meta>;

function GateModalStory(
  props: Omit<CommunityInteractionGateModalProps, "onOpenChange" | "open">,
) {
  const [open, setOpen] = React.useState(true);

  return (
    <>
      {!open ? (
        <Button onClick={() => setOpen(true)}>Reopen gate</Button>
      ) : null}
      <CommunityInteractionGateModal
        {...props}
        onOpenChange={setOpen}
        open={open}
      />
    </>
  );
}

function RequestableToReplyStory() {
  const [requestOpen, setRequestOpen] = React.useState(true);

  return (
    <>
      {!requestOpen ? (
        <Button onClick={() => setRequestOpen(true)}>Request to Join</Button>
      ) : null}
      <CommunityJoinRequestModal
        communityName="Neighborhood Planning"
        onOpenChange={setRequestOpen}
        onSubmit={() => {}}
        open={requestOpen}
      />
    </>
  );
}

function StorybookAltchaCheckbox({
  onVerified,
}: {
  onVerified?: () => void | Promise<void>;
}) {
  const [state, setState] = React.useState<"idle" | "verifying" | "verified">("idle");
  const stateRef = React.useRef(state);
  const timerRef = React.useRef<number | null>(null);

  React.useEffect(() => {
    stateRef.current = state;
  }, [state]);

  React.useEffect(() => () => {
    if (timerRef.current != null) {
      window.clearTimeout(timerRef.current);
    }
  }, []);

  const startVerification = React.useCallback(() => {
    if (stateRef.current !== "idle") return;

    stateRef.current = "verifying";
    setState("verifying");
    timerRef.current = window.setTimeout(() => {
      timerRef.current = null;
      stateRef.current = "verified";
      setState("verified");
      if (onVerified) {
        timerRef.current = window.setTimeout(() => {
          timerRef.current = null;
          void onVerified();
        }, 450);
      }
    }, 3000);
  }, [onVerified]);

  const statusCopy = state === "verifying"
    ? "Verifying..."
    : state === "verified"
      ? "Verified"
      : "I'm not a robot";

  return (
    <div
      className={cn(
        "flex min-h-16 w-full items-center gap-3 rounded-[var(--radius-lg)] border border-border-soft bg-card px-4 py-3 text-left text-foreground shadow-sm transition-colors",
        state === "idle" ? "cursor-pointer hover:bg-card/90" : "cursor-default",
      )}
      onClick={startVerification}
    >
      <span className="relative inline-flex size-5 shrink-0 items-center justify-center">
        {state === "verifying" ? (
          <Spinner
            aria-label="Verifying"
            className="size-5 text-muted-foreground"
          />
        ) : (
          <Checkbox
            aria-label="I'm not a robot"
            checked={state === "verified"}
            className="disabled:cursor-default disabled:opacity-100"
            disabled={state !== "idle"}
            onCheckedChange={(next) => {
              if (next === true) startVerification();
            }}
          />
        )}
      </span>
      <span className="min-w-0 flex-1 truncate text-base font-medium">{statusCopy}</span>
    </div>
  );
}

function ProofOfWorkVoteFlowStory() {
  const [modalOpen, setModalOpen] = React.useState(false);
  const [viewerVote, setViewerVote] = React.useState<"up" | "down" | null>(null);
  const [score, setScore] = React.useState(18);
  const [flowState, setFlowState] = React.useState<"idle" | "checking" | "voted">("idle");

  const handleVote = React.useCallback((direction: "up" | "down" | null) => {
    if (direction !== "up") return;
    setFlowState("checking");
    setModalOpen(true);
  }, []);

  const completeVote = React.useCallback(() => {
    setModalOpen(false);
    setViewerVote("up");
    setScore(19);
    setFlowState("voted");
  }, []);

  return (
    <div className="mx-auto flex min-h-[620px] w-full max-w-xl flex-col items-center justify-center gap-5">
      <div className="flex w-full items-center justify-between rounded-[var(--radius-lg)] border border-border-soft bg-card p-4">
        <div className="min-w-0">
          <Type as="p" className="text-foreground" variant="body">
            Post in a PoW-only community
          </Type>
          <Type as="p" className="text-muted-foreground" variant="caption">
            {flowState === "voted" ? "Vote submitted with proof." : "Click upvote to open the browser check."}
          </Type>
        </div>
        <VotePill
          onVote={handleVote}
          score={score}
          viewerVote={viewerVote}
        />
      </div>

      <CommunityInteractionGateModal
        body={(
          <StorybookAltchaCheckbox onVerified={completeVote} />
        )}
        description="This runs locally and usually takes a few seconds."
        icon="blocked"
        onOpenChange={setModalOpen}
        open={modalOpen}
        requirements={proofOfWorkRequirements}
        requirementStatuses={["unmet"]}
        title="Browser anti-bot check required"
      />
    </div>
  );
}

export const JoinableToVote: Story = {
  name: "States / Joinable to vote",
  render: () => (
    <GateModalStory
      description="You meet this community's requirements. Join to vote."
      icon="join"
      primaryAction={{
        label: "Join",
        onClick: () => {},
      }}
      requirements={selfRequirements}
      requirementStatuses={["met"]}
      title="Join to Vote"
    />
  ),
};

export const ProofOfWorkVoteFlow: Story = {
  name: "Flow / Proof of work vote",
  render: () => <ProofOfWorkVoteFlowStory />,
};

export const RequestableToReply: Story = {
  name: "States / Requestable to reply",
  render: () => <RequestableToReplyStory />,
};

export const VerificationRequiredSelf: Story = {
  name: "States / Verification required Self",
  render: () => (
    <GateModalStory
      description="Self.xyz lets you prove you are over 18 without sharing your name, photo, or document details with anyone."
      icon="self"
      primaryAction={{
        label: "Verify with ID",
        onClick: () => {},
      }}
      requirements={selfRequirements}
      requirementStatuses={["unmet"]}
      title="Verify to vote"
    />
  ),
};

export const VerificationRequiredVery: Story = {
  name: "States / Verification required Very",
  render: () => (
    <GateModalStory
      description="Scan your palm once with VeryAI to join any community that requires it. The photo is not saved anywhere."
      icon="very"
      primaryAction={{
        label: "Verify with palm scan",
        onClick: () => {},
      }}
      requirements={veryRequirements}
      requirementStatuses={["unmet"]}
      title="Verify to vote"
    />
  ),
};

export const VerificationRequiredPassport: Story = {
  name: "States / Verification required Passport",
  render: () => (
    <GateModalStory
      description="Are you human? Improve your wallet score and try again."
      icon="passport"
      primaryAction={{
        href: "https://app.passport.xyz/",
        label: "Visit Passport.xyz",
        rel: "noopener noreferrer",
        target: "_blank",
      }}
      requirements={passportRequirements}
      requirementStatuses={["unmet"]}
      title="Higher Score Required"
    />
  ),
};

export const ProofOfWorkRequired: Story = {
  name: "States / Browser anti-bot check required",
  render: () => (
    <GateModalStory
      body={(
        <StorybookAltchaCheckbox />
      )}
      description="This runs locally and usually takes a few seconds."
      icon="blocked"
      requirements={proofOfWorkRequirements}
      requirementStatuses={["unmet"]}
      title="Browser anti-bot check required"
    />
  ),
};

export const PendingRequest: Story = {
  name: "States / Pending request",
  render: () => (
    <GateModalStory
      description="The moderators will review your request."
      icon="pending"
      title="Request pending"
    />
  ),
};

export const GateFailed: Story = {
  name: "States / Gate failed",
  render: () => (
    <GateModalStory
      description="Your verified ID does not match this community's requirements."
      icon="blocked"
      requirements={failedRequirements}
      requirementStatuses={["unmet"]}
      title="You can't vote here"
    />
  ),
};

export const ReadyAfterVerification: Story = {
  name: "States / Ready after verification",
  render: () => (
    <GateModalStory
      description="You can now vote in Local Transit."
      icon="ready"
      primaryAction={{
        label: "Vote now",
        onClick: () => {},
      }}
      title="Ready"
    />
  ),
};

export const MobileVerificationRequiredSelf: Story = {
  name: "Mobile / Verification required Self",
  parameters: {
    viewport: { defaultViewport: "mobile1" },
  },
  render: () => (
    <GateModalStory
      description="Self.xyz lets you prove you are over 18 without sharing your name, photo, or document details with anyone."
      icon="self"
      primaryAction={{
        label: "Verify with ID",
        onClick: () => {},
      }}
      requirements={selfRequirements}
      requirementStatuses={["unmet"]}
      title="Verify to vote"
    />
  ),
};

export const MobileVerificationRequiredPassport: Story = {
  name: "Mobile / Verification required Passport",
  parameters: {
    viewport: { defaultViewport: "mobile1" },
  },
  render: () => (
    <GateModalStory
      description="Are you human? Improve your wallet score and try again."
      icon="passport"
      primaryAction={{
        href: "https://app.passport.xyz/",
        label: "Visit Passport.xyz",
        rel: "noopener noreferrer",
        target: "_blank",
      }}
      requirements={passportRequirements}
      requirementStatuses={["unmet"]}
      title="Higher Score Required"
    />
  ),
};
