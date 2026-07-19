import type { Meta, StoryObj } from "@storybook/react-vite";
import * as React from "react";

import { Button } from "@/components/primitives/button";

import { HandleClaimModal } from "../handle-claim-modal";
import type {
  HandleClaimModalProps,
  HandleSearchResult,
} from "../handle-claim-modal.types";

const meta = {
  title: "Compositions/Community/HandleClaimModal",
  component: HandleClaimModal,
  args: {
    communityName: "Ethiopia",
    communityHandle: "ethiopia",
    communityRouteLabel: "c/ethiopia",
    onClaim: () => {},
    onNotNow: () => {},
    onOpenChange: () => {},
    onSearchChange: () => {},
    onSelfVerificationClick: () => {},
    open: true,
    phase: "intro",
    processing: false,
    searchValue: "",
  },
  decorators: [
    (Story: () => React.ReactNode) => (
      <div className="min-h-[720px] bg-background p-6 text-foreground">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof HandleClaimModal>;

export default meta;

type Story = StoryObj<typeof meta>;

function mockCheckAvailability(value: string): HandleSearchResult {
  const normalized = value.trim().toLowerCase();
  if (!normalized) {
    return { availability: "unavailable", priceCents: null, reason: "Enter a name" };
  }
  if (normalized === "alice") {
    return { availability: "taken", priceCents: null, reason: "This name is already taken" };
  }
  if (normalized === "admin" || normalized === "mod") {
    return { availability: "reserved", priceCents: null, reason: "This name is reserved" };
  }
  if (normalized.length <= 3) {
    return { availability: "available", priceCents: 999, pricingTier: "premium" };
  }
  if (normalized.length <= 5) {
    return { availability: "available", priceCents: 499 };
  }
  return { availability: "available", priceCents: 0 };
}

function InteractiveModalStory({
  phase: initialPhase = "intro",
  initialSearchValue = "",
  confirmedDiscountPercent = null,
  selfVerificationSavingsPercent = null,
  error = null,
  forceMobile = false,
  walletBalanceCents = null,
}: {
  phase?: HandleClaimModalProps["phase"];
  initialSearchValue?: string;
  confirmedDiscountPercent?: number | null;
  selfVerificationSavingsPercent?: number | null;
  error?: string | null;
  forceMobile?: boolean;
  walletBalanceCents?: number | null;
}) {
  const [open, setOpen] = React.useState(true);
  const [searchValue, setSearchValue] = React.useState(initialSearchValue);
  const [phase, setPhase] = React.useState(initialPhase);
  const [searchResult, setSearchResult] = React.useState<HandleSearchResult | undefined>(
    initialSearchValue && initialPhase !== "intro"
      ? mockCheckAvailability(initialSearchValue)
      : undefined,
  );
  const [isQuoting, setIsQuoting] = React.useState(false);
  const [claimedLabel, setClaimedLabel] = React.useState<string | null>(null);
  const timeoutRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);

  React.useEffect(() => {
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, []);

  const handleSearchChange = (value: string) => {
    setSearchValue(value);
    setSearchResult(undefined);
    setPhase("search");

    if (timeoutRef.current) clearTimeout(timeoutRef.current);

    const trimmed = value.trim();
    if (!trimmed) {
      setPhase("intro");
      return;
    }

    setIsQuoting(true);
    timeoutRef.current = setTimeout(() => {
      setIsQuoting(false);
      const result = mockCheckAvailability(trimmed);
      setSearchResult(result);
      setPhase(result.availability === "available" ? "confirm" : "confirm");
    }, 600);
  };

  const handleClaim = () => {
    if (!searchResult || searchResult.availability !== "available") return;
    setPhase("processing");
    timeoutRef.current = setTimeout(() => {
      setClaimedLabel(searchValue);
      setPhase("success");
    }, 1500);
  };

  const currentPhase = isQuoting && phase !== "processing" && phase !== "success"
    ? "quoting"
    : phase;

  return (
    <>
      {!open ? <Button onClick={() => setOpen(true)}>Reopen claim modal</Button> : null}
      <HandleClaimModal
        claimedLabel={claimedLabel ?? undefined}
        communityHandle="ethiopia"
        communityName="Ethiopia"
        communityRouteLabel="c/ethiopia"
        confirmedDiscountPercent={confirmedDiscountPercent}
        error={error}
        forceMobile={forceMobile}
        onClaim={handleClaim}
        onNotNow={() => setOpen(false)}
        onOpenChange={setOpen}
        onSearchChange={handleSearchChange}
        onSelfVerificationClick={() => {}}
        onAddFunds={() => {}}
        open={open}
        phase={currentPhase}
        processing={currentPhase === "processing"}
        searchResult={searchResult}
        searchValue={searchValue}
        selfVerificationSavingsPercent={selfVerificationSavingsPercent}
        walletBalanceCents={walletBalanceCents}
      />
    </>
  );
}

export const Interactive: Story = {
  name: "Interactive / Type to explore",
  parameters: {
    viewport: { defaultViewport: "desktop" },
  },
  render: () => <InteractiveModalStory />,
};

export const MobileInteractive: Story = {
  name: "Mobile / Interactive",
  parameters: {
    viewport: { defaultViewport: "mobile1" },
  },
  render: () => <InteractiveModalStory forceMobile />,
};

export const DesktopIntro: Story = {
  name: "Snapshot / Intro",
  parameters: {
    viewport: { defaultViewport: "desktop" },
  },
  render: () => <InteractiveModalStory phase="intro" />,
};

export const DesktopChecking: Story = {
  name: "Snapshot / Checking availability",
  parameters: {
    viewport: { defaultViewport: "desktop" },
  },
  render: () => <InteractiveModalStory phase="quoting" initialSearchValue="alice" />,
};

export const DesktopAvailableFree: Story = {
  name: "Snapshot / Available — Free",
  parameters: {
    viewport: { defaultViewport: "desktop" },
  },
  render: () => (
    <InteractiveModalStory
      phase="confirm"
      initialSearchValue="freename"
    />
  ),
};

export const DesktopAvailablePaid: Story = {
  name: "Snapshot / Available — Paid",
  parameters: {
    viewport: { defaultViewport: "desktop" },
  },
  render: () => (
    <InteractiveModalStory
      phase="confirm"
      initialSearchValue="bob"
    />
  ),
};

export const DesktopAvailablePaidWithDiscount: Story = {
  name: "Snapshot / Available — Paid with Self discount",
  parameters: {
    viewport: { defaultViewport: "desktop" },
  },
  render: () => (
    <InteractiveModalStory
      phase="confirm"
      initialSearchValue="bob"
      confirmedDiscountPercent={20}
    />
  ),
};

export const DesktopAvailableWithSelfNudge: Story = {
  name: "Snapshot / Available — Self verification nudge",
  parameters: {
    viewport: { defaultViewport: "desktop" },
  },
  render: () => (
    <InteractiveModalStory
      phase="confirm"
      initialSearchValue="bob"
      selfVerificationSavingsPercent={20}
    />
  ),
};

export const DesktopTaken: Story = {
  name: "Snapshot / Taken",
  parameters: {
    viewport: { defaultViewport: "desktop" },
  },
  render: () => (
    <InteractiveModalStory
      phase="confirm"
      initialSearchValue="alice"
    />
  ),
};

export const DesktopReserved: Story = {
  name: "Snapshot / Reserved",
  parameters: {
    viewport: { defaultViewport: "desktop" },
  },
  render: () => (
    <InteractiveModalStory
      phase="confirm"
      initialSearchValue="admin"
    />
  ),
};

export const DesktopProcessing: Story = {
  name: "Snapshot / Processing",
  parameters: {
    viewport: { defaultViewport: "desktop" },
  },
  render: () => (
    <InteractiveModalStory
      phase="processing"
      initialSearchValue="bob"
    />
  ),
};

export const DesktopSuccess: Story = {
  name: "Snapshot / Success",
  parameters: {
    viewport: { defaultViewport: "desktop" },
  },
  render: () => (
    <InteractiveModalStory
      phase="success"
      initialSearchValue="bob"
      confirmedDiscountPercent={20}
    />
  ),
};

export const DesktopError: Story = {
  name: "Snapshot / Error",
  parameters: {
    viewport: { defaultViewport: "desktop" },
  },
  render: () => (
    <InteractiveModalStory
      phase="confirm"
      initialSearchValue="bob"
      error="Checkout transaction was rejected. Please try again."
    />
  ),
};

export const DesktopInsufficientFunds: Story = {
  name: "Snapshot / Insufficient funds",
  parameters: {
    viewport: { defaultViewport: "desktop" },
  },
  render: () => (
    <InteractiveModalStory
      phase="confirm"
      initialSearchValue="bob"
      walletBalanceCents={0}
    />
  ),
};

export const DesktopInsufficientFundsWithSelf: Story = {
  name: "Snapshot / Insufficient funds — Self nudge",
  parameters: {
    viewport: { defaultViewport: "desktop" },
  },
  render: () => (
    <InteractiveModalStory
      phase="confirm"
      initialSearchValue="bob"
      walletBalanceCents={100}
      selfVerificationSavingsPercent={20}
    />
  ),
};
