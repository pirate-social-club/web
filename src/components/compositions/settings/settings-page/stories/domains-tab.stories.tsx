import * as React from "react";
import type { Meta, StoryObj } from "@storybook/react-vite";

import { generateRedditFallbackHandle } from "@/lib/reddit-handle-suggestion";

import { DomainsTab } from "../panels/settings-page-domains-tab";
import type { DomainsTabProps, DomainsTabPhase } from "../panels/settings-page-domains-tab";
import type { HandleUpgradeQuoteResponse } from "@/lib/api/client-api-types";

const base: DomainsTabProps = {
  currentHandle: "suspicious-code-7234.pirate",
  handleTier: "generated",
  redditImportDone: false,
  phase: "options",
  redditVerification: {
    usernameValue: "",
    verificationState: "not_started",
  },
  importJob: {
    status: "not_started",
  },
};

const baseQuote = {
  quote_ttl_seconds: 900,
  quoted_at: 1770000000,
  expires_at: 1770000900,
  currency: "USD",
  eligible: true,
  reason: null,
  policy_version: "global_handle_paid_v1",
  payment_instructions: {
    chain: {
      chain_namespace: "eip155",
      chain_id: 8453,
      display_name: "Base",
    },
    token_address: "0x833589fcd6edb6e08f4c7c32d4f71b54bda02913",
    recipient_address: "0x053228674F055FBb94d1B8118638F61a4a6ee512",
    amount_atomic: "5000000",
    amount_display: "5.00",
  },
} satisfies Partial<HandleUpgradeQuoteResponse>;

function paidQuote(input: {
  label: string;
  priceCents: number;
  pricingTier: string;
  tier?: HandleUpgradeQuoteResponse["tier"];
}): HandleUpgradeQuoteResponse {
  return {
    ...baseQuote,
    quote: `ghq_story_${input.label.replace(/[^a-z0-9]/gu, "_")}`,
    desired_label: `${input.label}.pirate`,
    tier: input.tier ?? "premium",
    price_cents: input.priceCents,
    pricing_tier: input.pricingTier,
    payment_instructions: {
      ...baseQuote.payment_instructions,
      amount_atomic: String(BigInt(input.priceCents) * 10_000n),
      amount_display: (input.priceCents / 100).toFixed(2),
    },
  };
}

function nonPayableQuote(input: {
  label: string;
  reason: string;
  pricingTier: string;
}): HandleUpgradeQuoteResponse {
  return {
    quote: null,
    desired_label: `${input.label}.pirate`,
    tier: "premium",
    price_cents: 0,
    currency: "USD",
    eligible: false,
    reason: input.reason,
    policy_version: "global_handle_paid_v1",
    pricing_tier: input.pricingTier,
    quote_ttl_seconds: null,
    payment_instructions: null,
  };
}

function quoteForLabel(rawLabel: string): HandleUpgradeQuoteResponse {
  const label = rawLabel.trim().toLowerCase().replace(/\.pirate$/u, "");
  if (!label) {
    return nonPayableQuote({
      label: "",
      reason: "Enter a name",
      pricingTier: "invalid",
    });
  }
  if (label === "pirate" || label === "admin" || label === "crown") {
    return nonPayableQuote({
      label,
      reason: "Desired label is reserved",
      pricingTier: "reserved",
    });
  }
  if (label === "taken") {
    return nonPayableQuote({
      label,
      reason: "Desired label is unavailable",
      pricingTier: "unavailable",
    });
  }
  if (label === "king") {
    return paidQuote({
      label,
      priceCents: 100_000,
      pricingTier: "trophy",
    });
  }
  if (label === "olivia") {
    return paidQuote({
      label,
      priceCents: 10_000,
      pricingTier: "first_name",
    });
  }
  if (label === "oliviia") {
    return paidQuote({
      label,
      priceCents: 1_000,
      pricingTier: "base",
    });
  }
  return paidQuote({
    label,
    priceCents: label.length >= 8 ? 500
      : label.length === 7 ? 1_000
        : label.length === 6 ? 2_500
          : label.length === 5 ? 5_000
            : label.length === 4 ? 10_000
              : 25_000,
    pricingTier: "base",
    tier: label.length >= 8 ? "standard" : "premium",
  });
}

function Wrapper({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ maxWidth: 600, margin: "0 auto", padding: "2rem 1rem" }}>
      {children}
    </div>
  );
}

function InteractiveStory(props: DomainsTabProps) {
  const [phase, setPhase] = React.useState<DomainsTabPhase>(props.phase ?? "options");
  const [username, setUsername] = React.useState(props.redditVerification.usernameValue);
  const [handle, setHandle] = React.useState(props.generatedHandle ?? "");
  const [buyNameValue, setBuyNameValue] = React.useState(props.buyNameValue ?? "");
  const [paidQuoteState, setPaidQuoteState] = React.useState<HandleUpgradeQuoteResponse | null>(props.paidQuote ?? null);
  const [claimedHandle, setClaimedHandle] = React.useState<string | null>(props.paidClaimedHandle ?? null);
  const [busy, setBusy] = React.useState(props.busy ?? false);
  const [buyNameChecking, setBuyNameChecking] = React.useState(false);
  const generateCountRef = React.useRef(0);

  React.useEffect(() => {
    if (phase !== "buy_name" || claimedHandle) return;
    const label = buyNameValue.trim();
    if (!label) {
      setBuyNameChecking(false);
      setPaidQuoteState(null);
      return;
    }

    setBuyNameChecking(true);
    setPaidQuoteState(null);
    const timeout = window.setTimeout(() => {
      setPaidQuoteState(quoteForLabel(label));
      setBuyNameChecking(false);
    }, 350);

    return () => {
      window.clearTimeout(timeout);
      setBuyNameChecking(false);
    };
  }, [buyNameValue, claimedHandle, phase]);

  const handleBuyNameChange = (value: string) => {
    setBuyNameValue(value);
    setPaidQuoteState(null);
    setClaimedHandle(null);
  };

  const handleBuyNameQuote = () => {
    setBusy(true);
    window.setTimeout(() => {
      setPaidQuoteState(quoteForLabel(buyNameValue));
      setBusy(false);
    }, 400);
  };

  const handleBuyNameClaim = () => {
    setBusy(true);
    window.setTimeout(() => {
      const label = paidQuoteState?.desired_label ?? `${buyNameValue}.pirate`;
      setClaimedHandle(label);
      setBusy(false);
    }, 400);
  };

  return (
    <DomainsTab
      {...props}
      busy={busy}
      phase={phase}
      generatedHandle={handle}
      buyNameValue={buyNameValue}
      buyNameChecking={buyNameChecking}
      paidClaimedHandle={claimedHandle}
      paidQuote={paidQuoteState}
      redditVerification={{ ...props.redditVerification, usernameValue: username }}
      onPhaseChange={setPhase}
      onRedditUsernameChange={setUsername}
      onHandleChange={setHandle}
      onGenerateHandle={() => {
        const sourceUsername = (props.redditImportSummary?.redditUsername ?? username) || "name";
        const seeds = [0.223764, 0.418907, 0.730451];
        const seed = seeds[generateCountRef.current % seeds.length] ?? 0.223764;
        generateCountRef.current += 1;
        setHandle(generateRedditFallbackHandle(sourceUsername, () => seed));
      }}
      onImportKarmaNext={() => {}}
      onImportKarmaSkip={() => setPhase("options")}
      onChooseNameContinue={() => {}}
      onChooseNameBack={() => setPhase("import_karma")}
      onBuyNameChange={handleBuyNameChange}
      onBuyNameClaim={handleBuyNameClaim}
      onBuyNameQuote={handleBuyNameQuote}
    />
  );
}

const meta = {
  title: "Compositions/Settings/DomainsTab",
  component: DomainsTab,
  decorators: [
    (Story: () => React.ReactNode) => (
      <Wrapper>
        <Story />
      </Wrapper>
    ),
  ],
} satisfies Meta<typeof DomainsTab>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
  name: "Options / Default",
  render: () => <InteractiveStory {...base} />,
};

export const AlreadyImported: Story = {
  name: "Options / Already Imported",
  render: () => (
    <InteractiveStory
      {...base}
      currentHandle="technohippie.pirate"
      handleTier="standard"
      redditImportDone
    />
  ),
};

export const ImportEmpty: Story = {
  name: "Import Reddit / Empty",
  render: () => (
    <InteractiveStory
      {...base}
      phase="import_karma"
    />
  ),
};

export const ImportUsernameEntered: Story = {
  name: "Import Reddit / Username Entered",
  render: () => (
    <InteractiveStory
      {...base}
      phase="import_karma"
      redditVerification={{
        usernameValue: "technohippie",
        verificationState: "not_started",
      }}
    />
  ),
};

export const ImportCodeReady: Story = {
  name: "Import Reddit / Code Ready",
  render: () => (
    <InteractiveStory
      {...base}
      phase="import_karma"
      redditVerification={{
        usernameValue: "technohippie",
        verificationState: "code_ready",
        verificationHint: "pirate-verify=a3f7c9e2",
        codePlacementSurface: "profile",
      }}
    />
  ),
};

export const ImportChecking: Story = {
  name: "Import Reddit / Checking",
  render: () => (
    <InteractiveStory
      {...base}
      phase="import_karma"
      redditVerification={{
        usernameValue: "technohippie",
        verificationState: "checking",
        verificationHint: "pirate-verify=a3f7c9e2",
        codePlacementSurface: "profile",
      }}
    />
  ),
};

export const ImportImporting: Story = {
  name: "Import Reddit / Importing",
  render: () => (
    <InteractiveStory
      {...base}
      phase="import_karma"
      redditVerification={{
        usernameValue: "technohippie",
        verifiedUsername: "technohippie",
        verificationState: "verified",
      }}
      importJob={{
        status: "running",
      }}
    />
  ),
};

export const ImportDoneChooseName: Story = {
  name: "Import Reddit / Karma Imported / Choose Name",
  render: () => (
    <InteractiveStory
      {...base}
      phase="choose_name"
      generatedHandle="technohippie-223764"
      redditVerification={{
        usernameValue: "technohippie",
        verifiedUsername: "technohippie",
        verificationState: "verified",
      }}
      importJob={{
        status: "succeeded",
      }}
      redditImportSummary={{
        redditUsername: "technohippie",
        importedRedditScore: 42000,
        coverageNote: null,
      }}
    />
  ),
};

export const ImportDoneNoArchiveData: Story = {
  name: "Import Reddit / No Archive Data",
  render: () => (
    <InteractiveStory
      {...base}
      phase="choose_name"
      generatedHandle="quietreader-223764"
      redditVerification={{
        usernameValue: "quietreader",
        verifiedUsername: "quietreader",
        verificationState: "verified",
      }}
      importJob={{
        status: "succeeded",
      }}
      redditImportSummary={{
        redditUsername: "quietreader",
        importedRedditScore: null,
        coverageNote: null,
      }}
    />
  ),
};

export const ImportVerificationFailed: Story = {
  name: "Import Reddit / Verification Failed",
  render: () => (
    <InteractiveStory
      {...base}
      phase="import_karma"
      redditVerification={{
        usernameValue: "technohippie",
        verificationState: "failed",
        errorTitle: "Verification code not found",
      }}
    />
  ),
};

export const ImportRateLimited: Story = {
  name: "Import Reddit / Rate Limited",
  render: () => (
    <InteractiveStory
      {...base}
      phase="import_karma"
      phaseError="Too many verification checks. Wait a minute before trying again."
      redditVerification={{
        usernameValue: "technohippie",
        verificationState: "code_ready",
        verificationHint: "pirate-verification=a3f7c9e2",
        codePlacementSurface: "profile",
        lastCheckedAt: new Date().toISOString(),
      }}
    />
  ),
};

export const BuyNameEmpty: Story = {
  name: "Buy Name / Empty",
  render: () => (
    <InteractiveStory
      {...base}
      phase="buy_name"
      buyNameValue=""
    />
  ),
};

export const BuyNameBaseQuote: Story = {
  name: "Buy Name / Base Quote",
  render: () => (
    <InteractiveStory
      {...base}
      phase="buy_name"
      buyNameValue="randomname"
      paidQuote={paidQuote({
        label: "randomname",
        priceCents: 500,
        pricingTier: "base",
        tier: "standard",
      })}
    />
  ),
};

export const BuyNameFirstNameQuote: Story = {
  name: "Buy Name / First Name Quote",
  render: () => (
    <InteractiveStory
      {...base}
      phase="buy_name"
      buyNameValue="olivia"
      paidQuote={paidQuote({
        label: "olivia",
        priceCents: 10_000,
        pricingTier: "first_name",
      })}
    />
  ),
};

export const BuyNameTrophyQuote: Story = {
  name: "Buy Name / Trophy Quote",
  render: () => (
    <InteractiveStory
      {...base}
      phase="buy_name"
      buyNameValue="king"
      paidQuote={paidQuote({
        label: "king",
        priceCents: 100_000,
        pricingTier: "trophy",
      })}
    />
  ),
};

export const BuyNameTypoBaseFallback: Story = {
  name: "Buy Name / Typo Base Fallback",
  render: () => (
    <InteractiveStory
      {...base}
      phase="buy_name"
      buyNameValue="oliviia"
      paidQuote={paidQuote({
        label: "oliviia",
        priceCents: 1_000,
        pricingTier: "base",
        tier: "premium",
      })}
    />
  ),
};

export const BuyNameReserved: Story = {
  name: "Buy Name / Reserved",
  render: () => (
    <InteractiveStory
      {...base}
      phase="buy_name"
      buyNameValue="pirate"
      paidQuote={nonPayableQuote({
        label: "pirate",
        reason: "Desired label is reserved",
        pricingTier: "reserved",
      })}
    />
  ),
};

export const BuyNameClaimed: Story = {
  name: "Buy Name / Claimed",
  render: () => (
    <InteractiveStory
      {...base}
      phase="buy_name"
      buyNameValue="olivia"
      paidClaimedHandle="olivia.pirate"
      paidQuote={paidQuote({
        label: "olivia",
        priceCents: 10_000,
        pricingTier: "first_name",
      })}
    />
  ),
};

export const MobileOptions: Story = {
  name: "Mobile / Options",
  parameters: {
    viewport: { defaultViewport: "mobile1" },
  },
  render: () => <InteractiveStory {...base} />,
};

export const MobileImportCodeReady: Story = {
  name: "Mobile / Code Ready",
  parameters: {
    viewport: { defaultViewport: "mobile1" },
  },
  render: () => (
    <InteractiveStory
      {...base}
      phase="import_karma"
      redditVerification={{
        usernameValue: "technohippie",
        verificationState: "code_ready",
        verificationHint: "pirate-verify=a3f7c9e2",
        codePlacementSurface: "profile",
      }}
    />
  ),
};

export const MobileChooseName: Story = {
  name: "Mobile / Choose Name",
  parameters: {
    viewport: { defaultViewport: "mobile1" },
  },
  render: () => (
    <InteractiveStory
      {...base}
      phase="choose_name"
      generatedHandle="technohippie-223764"
      handleSuggestion={{
        suggestedLabel: "technohippie",
        source: "verified_reddit_username",
        availability: "available",
      }}
      redditVerification={{
        usernameValue: "technohippie",
        verifiedUsername: "technohippie",
        verificationState: "verified",
      }}
      importJob={{
        status: "succeeded",
      }}
      redditImportSummary={{
        redditUsername: "technohippie",
        importedRedditScore: 42000,
        coverageNote: null,
      }}
    />
  ),
};

export const MobileBuyNameFirstNameQuote: Story = {
  name: "Mobile / Buy Name First Name Quote",
  parameters: {
    viewport: { defaultViewport: "mobile1" },
  },
  render: () => (
    <InteractiveStory
      {...base}
      phase="buy_name"
      buyNameValue="olivia"
      paidQuote={paidQuote({
        label: "olivia",
        priceCents: 10_000,
        pricingTier: "first_name",
      })}
    />
  ),
};
