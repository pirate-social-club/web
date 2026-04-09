"use client";

import * as React from "react";
import { Handshake } from "@phosphor-icons/react";
import { At } from "@phosphor-icons/react";

import { Button } from "@/components/primitives/button";
import { Card, CardContent, CardFooter } from "@/components/primitives/card";
import { Checkbox } from "@/components/primitives/checkbox";
import { CopyField } from "@/components/primitives/copy-field";
import {
  FormFieldLabel,
  FormNote,
  FormSectionHeading,
} from "@/components/primitives/form-layout";
import { Input } from "@/components/primitives/input";
import { Label } from "@/components/primitives/label";
import { OptionCard } from "@/components/primitives/option-card";
import { PrefixInput } from "@/components/primitives/prefix-input";
import { Chip } from "@/components/primitives/chip";
import { Tabs, TabsList, TabsTrigger } from "@/components/primitives/tabs";
import { Stepper } from "@/components/primitives/stepper";
import { Textarea } from "@/components/primitives/textarea";
import { cn } from "@/lib/utils";

import type {
  AnonymousIdentityScope,
  ComposerStep,
  CreatorVerificationState,
  CreateCommunityComposerProps,
  GateFamily,
  GateType,
  CommunityDefaultAgeGatePolicy,
  CommunityMembershipMode,
  HandlePolicyState,
  HandlePolicyTemplate,
  HandlePricingModel,
  NamespaceFamily,
  NamespaceImportState,
} from "./create-community-composer.types";

const membershipMeta: Record<CommunityMembershipMode, { label: string; detail: string }> = {
  open: {
    label: "Open",
    detail: "Anyone can join immediately.",
  },
  gated: {
    label: "Gated",
    detail: "Joining requires passing one or more gate checks.",
  },
};

const namespaceFamilyMeta: Record<
  NamespaceFamily,
  {
    label: string;
    externalExample: string;
    detail?: string;
    icon: React.ReactNode;
    disabledHint?: string;
  }
> = {
  hns: {
    label: "Handshake",
    externalExample: "kanye",
    detail: "Live now for community creation.",
    icon: <Handshake className="size-5" />,
  },
  spaces: {
    label: "Spaces",
    externalExample: "kanye",
    detail: "Subspaces are stabilizing before launch.",
    icon: <At className="size-5" />,
    disabledHint: "Coming soon. Pirate is launching namespace-backed communities on HNS first.",
  },
};

const handlePolicyTemplateMeta: Record<HandlePolicyTemplate, { label: string; detail: string; pricingModel: HandlePricingModel; disabledHint?: string }> = {
  standard: {
    label: "Standard",
    detail: "Standard is the default launch template. Community-local claims stay off at launch, then 8+ character handles can open first once claims are enabled.",
    pricingModel: "free",
  },
  premium: {
    label: "Premium",
    detail: "Short and high-signal names explicitly monetized. Reserved names individually priced or auctioned.",
    pricingModel: "flat_by_length",
  },
  membership_gated: {
    label: "Membership-gated",
    detail: "Gate or NFT check comes first. Names then free or cheap once eligible.",
    pricingModel: "gated_then_flat",
  },
  custom: {
    label: "Custom",
    detail: "Explicit policy values for advanced use cases.",
    pricingModel: "custom_curve",
    disabledHint: "Custom handle policy configuration is not available in v0.",
  },
};

const anonymousScopeMeta: Record<AnonymousIdentityScope, { label: string; detail: string }> = {
  community_stable: {
    label: "Community-stable",
    detail: "One persistent anonymous label per user across the entire community. Best for moderation continuity.",
  },
  thread_stable: {
    label: "Thread-stable",
    detail: "One persistent anonymous label per user per thread. Different threads produce different labels.",
  },
  post_ephemeral: {
    label: "Post-ephemeral",
    detail: "Random label per post. No cross-post correlation. Limits moderation and strike capability.",
  },
};

const gateTypeMeta: Record<GateType, { label: string; family: GateFamily }> = {
  erc721_holding: { label: "ERC-721 NFT", family: "token_holding" },
  erc1155_holding: { label: "ERC-1155 NFT", family: "token_holding" },
  erc20_balance: { label: "ERC-20 token", family: "token_holding" },
  solana_nft_holding: { label: "Solana NFT", family: "token_holding" },
  unique_human: { label: "Unique human", family: "identity_proof" },
  age_over_18: { label: "Age 18+", family: "identity_proof" },
  nationality: { label: "Nationality", family: "identity_proof" },
  wallet_score: { label: "Wallet score", family: "identity_proof" },
};

const tokenGateTypes: GateType[] = ["erc721_holding", "erc1155_holding", "erc20_balance", "solana_nft_holding"];
const identityGateTypes: GateType[] = ["unique_human", "age_over_18", "nationality", "wallet_score"];

function getGateFamily(type: GateType): GateFamily {
  if (tokenGateTypes.includes(type)) return "token_holding";
  return "identity_proof";
}

function resolveHandlePolicy(template: HandlePolicyTemplate): HandlePolicyState {
  return {
    policyTemplate: template,
    pricingModel: handlePolicyTemplateMeta[template].pricingModel,
    membershipRequiredForClaim: true,
  };
}

function getInitialHandlePolicy(handlePolicy?: HandlePolicyState): HandlePolicyState | null {
  if (!handlePolicy) return null;
  return {
    policyTemplate: handlePolicy.policyTemplate,
    pricingModel: handlePolicy.pricingModel,
    membershipRequiredForClaim: handlePolicy.membershipRequiredForClaim,
  };
}

function Section({
  title,
  hint,
  children,
  className,
}: {
  title: string;
  hint?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section className={cn("space-y-4", className)}>
      <div className="space-y-1.5">
        <h3 className="text-lg font-semibold tracking-tight text-foreground">{title}</h3>
        {hint ? <FormNote>{hint}</FormNote> : null}
      </div>
      {children}
    </section>
  );
}

function FieldLabel({ label }: { label: string }) {
  return <FormFieldLabel className="mb-1.5" label={label} />;
}

function SegmentedControl<T extends string>({
  options,
  value,
  onChange,
  disabledKeys,
}: {
  options: Record<T, { label: string; detail?: string; disabledHint?: string }>;
  value: T;
  onChange: (next: T) => void;
  disabledKeys?: Set<T>;
}) {
  const keys = Object.keys(options) as T[];
  const selectedOption = options[value];

  return (
    <div className="space-y-3">
      <Tabs onValueChange={(next) => onChange(next as T)} value={value}>
        <TabsList
          className="grid h-auto w-full rounded-[calc(var(--radius-lg)+0.25rem)] bg-muted/40 p-1.5"
          style={{ gridTemplateColumns: `repeat(${keys.length}, minmax(0, 1fr))` }}
        >
          {keys.map((key) => (
            <TabsTrigger
              className="min-h-12 rounded-[var(--radius-lg)] px-4 py-2.5 text-base font-medium data-[state=active]:bg-card data-[state=active]:shadow-none"
              disabled={disabledKeys?.has(key) ?? false}
              key={key}
              value={key}
            >
              {options[key].label}
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>
      {selectedOption.detail ? <FormNote>{selectedOption.detail}</FormNote> : null}
    </div>
  );
}

function CheckboxRow({
  checked,
  id,
  label,
  onCheckedChange,
}: {
  checked: boolean;
  id: string;
  label: string;
  onCheckedChange: (checked: boolean) => void;
}) {
  return (
    <div className="flex min-h-14 items-center gap-3 rounded-[var(--radius-lg)] border border-border-soft bg-muted/20 px-4 py-3.5">
      <Checkbox
        checked={checked}
        id={id}
        onCheckedChange={(next) => onCheckedChange(next === true)}
      />
      <Label className="flex-1 text-base leading-6" htmlFor={id}>
        {label}
      </Label>
    </div>
  );
}

const composerSteps = [
  { label: "Namespace" },
  { label: "Community" },
  { label: "Handles" },
  { label: "Access" },
  { label: "Review" },
];

function ReviewField({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="space-y-0.5">
      <p className="text-base text-muted-foreground">{label}</p>
      <p className="text-base font-medium text-foreground">{value || "\u2014"}</p>
    </div>
  );
}

function ReviewSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="space-y-3 rounded-[var(--radius-lg)] border border-border-soft bg-card px-4 py-4">
      <h3 className="text-base font-semibold text-foreground">{title}</h3>
      <div className="grid gap-3 md:grid-cols-2">{children}</div>
    </div>
  );
}

function HnsNamespaceStatus({
  namespace,
  onVerify,
}: {
  namespace: NamespaceImportState;
  onVerify: () => void;
}) {
  const { importStatus } = namespace;
  if (!importStatus || importStatus === "not_imported" || importStatus === "checking") return null;

  const verified = importStatus === "verified";
  const pending = importStatus === "pending";
  const challengeReady = importStatus === "txt_challenge_ready";
  const expired = namespace.expiryDaysRemaining != null && namespace.expiryDaysRemaining < 90;
  const showProof = challengeReady || pending || verified;

  return (
    <div className="space-y-2 rounded-[var(--radius-lg)] border border-border-soft bg-background px-4 py-4">
      <div className="grid gap-3 md:grid-cols-[1fr_auto] md:items-end">
        <div className="space-y-2">
          {verified ? (
            <p className="text-base font-medium text-foreground">Verified.</p>
          ) : null}
          {showProof ? (
            <div className="space-y-2">
              <FormNote tone="default">Add this TXT record, then verify.</FormNote>
              {namespace.txtChallenge ? <CopyField value={namespace.txtChallenge} /> : null}
            </div>
          ) : null}
        </div>
        {!verified && showProof ? (
          <Button
            className="h-12 px-5"
            disabled={expired}
            loading={pending}
            onClick={onVerify}
            variant="secondary"
          >
            Verify
          </Button>
        ) : null}
      </div>
      {expired ? (
        <FormNote tone="warning">Expires within 3 months, please renew first.</FormNote>
      ) : null}
    </div>
  );
}

function SpacesComingSoonState() {
  return (
    <div className="space-y-2 rounded-[var(--radius-lg)] border border-border-soft bg-background px-4 py-4">
      <p className="text-base font-medium text-foreground">Spaces are coming soon.</p>
      <FormNote>
        Pirate is launching community creation on HNS first while Spaces subspace issuance and
        resolution settle a bit further.
      </FormNote>
    </div>
  );
}

export function CreateCommunityComposer({
  displayName = "American Voices",
  description = "National discourse, local moderation, verified context when it matters.",
  membershipMode = "open",
  defaultAgeGatePolicy = "none",
  allowAnonymousIdentity = true,
  anonymousIdentityScope: anonymousIdentityScopeProp,
  namespace,
  handlePolicy,
  creatorVerificationState = {
    uniqueHumanVerified: true,
    ageOver18Verified: true,
  },
  initialStep,
}: CreateCommunityComposerProps) {
  const initialNamespace = namespace ?? {
    family: "hns",
    externalRoot: "",
    importStatus: "not_imported",
    ownerLabel: "",
  };
  const [activeStep, setActiveStep] = React.useState<ComposerStep>(initialStep ?? 1);
  const [activeMembershipMode, setActiveMembershipMode] =
    React.useState<CommunityMembershipMode>(membershipMode);
  const [activeDefaultAgeGatePolicy, setActiveDefaultAgeGatePolicy] =
    React.useState<CommunityDefaultAgeGatePolicy>(defaultAgeGatePolicy);
  const [activeAllowAnonymousIdentity, setActiveAllowAnonymousIdentity] =
    React.useState<boolean>(allowAnonymousIdentity);
  const [activeAnonymousScope, setActiveAnonymousScope] =
    React.useState<AnonymousIdentityScope>(anonymousIdentityScopeProp ?? "community_stable");
  const [activeNamespaceFamily, setActiveNamespaceFamily] = React.useState<NamespaceFamily>(
    initialNamespace.family ?? "hns",
  );
  const [rootInput, setRootInput] = React.useState((initialNamespace.externalRoot ?? "").replace(/^[@.]/, ""));
  const [namespaceImportStatus, setNamespaceImportStatus] =
    React.useState(initialNamespace.importStatus ?? "not_imported");
  const [expiryDaysRemaining, setExpiryDaysRemaining] = React.useState<number | undefined>(
    initialNamespace.expiryDaysRemaining,
  );
  const [txtChallenge, setTxtChallenge] = React.useState<string | undefined>(
    initialNamespace.txtChallenge,
  );
  const [signatureChallenge, setSignatureChallenge] = React.useState<string | undefined>(
    initialNamespace.signatureChallenge,
  );
  const [activeDisplayName, setActiveDisplayName] = React.useState(displayName ?? "");
  const [activeDescription, setActiveDescription] = React.useState(description ?? "");
  const [activeHandlePolicy, setActiveHandlePolicy] =
    React.useState<HandlePolicyState | null>(getInitialHandlePolicy(handlePolicy) ?? resolveHandlePolicy("standard"));
  const [activeGateTypes, setActiveGateTypes] = React.useState<Set<GateType>>(new Set());
  const namespaceTimerRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);

  const creatorUniqueHumanVerified = creatorVerificationState.uniqueHumanVerified;
  const creatorAgeOver18Verified = creatorVerificationState.ageOver18Verified;
  const creatorAgeRequirementMet =
    activeDefaultAgeGatePolicy !== "18_plus" || creatorAgeOver18Verified;
  const creatorCanCreate = creatorUniqueHumanVerified && creatorAgeRequirementMet;

  React.useEffect(() => { setActiveMembershipMode(membershipMode); }, [membershipMode]);
  React.useEffect(() => { setActiveDefaultAgeGatePolicy(defaultAgeGatePolicy); }, [defaultAgeGatePolicy]);
  React.useEffect(() => { setActiveAllowAnonymousIdentity(allowAnonymousIdentity); }, [allowAnonymousIdentity]);
  React.useEffect(() => {
    if (anonymousIdentityScopeProp) setActiveAnonymousScope(anonymousIdentityScopeProp);
  }, [anonymousIdentityScopeProp]);
  React.useEffect(() => {
    setActiveNamespaceFamily(initialNamespace.family ?? "hns");
    setRootInput((initialNamespace.externalRoot ?? "").replace(/^[@.]/, ""));
    setNamespaceImportStatus(initialNamespace.importStatus ?? "not_imported");
    setExpiryDaysRemaining(initialNamespace.expiryDaysRemaining);
    setTxtChallenge(initialNamespace.txtChallenge);
    setSignatureChallenge(initialNamespace.signatureChallenge);
  }, [
    initialNamespace.family,
    initialNamespace.externalRoot,
    initialNamespace.importStatus,
    initialNamespace.expiryDaysRemaining,
    initialNamespace.txtChallenge,
    initialNamespace.signatureChallenge,
  ]);
  React.useEffect(() => {
    setActiveHandlePolicy(getInitialHandlePolicy(handlePolicy) ?? resolveHandlePolicy("standard"));
  }, [handlePolicy]);

  const clearNamespaceTimer = React.useCallback(() => {
    if (namespaceTimerRef.current) {
      clearTimeout(namespaceTimerRef.current);
      namespaceTimerRef.current = null;
    }
  }, []);

  React.useEffect(() => clearNamespaceTimer, [clearNamespaceTimer]);

  const namespaceMeta = namespaceFamilyMeta[activeNamespaceFamily];
  const rootLabel = rootInput.trim().replace(/^[@.]/, "");
  const displayRoot = rootLabel
    ? activeNamespaceFamily === "hns"
      ? `.${rootLabel}`
      : `@${rootLabel}`
    : "";
  const clubRoute = rootLabel
    ? activeNamespaceFamily === "hns"
      ? `/c/${rootLabel}`
      : `/c/@${rootLabel}`
    : "";
  const handleFormat = rootLabel
    ? activeNamespaceFamily === "hns"
      ? `name.${rootLabel}`
      : `name@${rootLabel}`
    : "";

  const handleHnsInspect = React.useCallback(() => {
    clearNamespaceTimer();
    setNamespaceImportStatus("checking");
    setExpiryDaysRemaining(undefined);
    setTxtChallenge(undefined);
    setSignatureChallenge(undefined);
    namespaceTimerRef.current = setTimeout(() => {
      setExpiryDaysRemaining(247);
      setNamespaceImportStatus("txt_challenge_ready");
      setTxtChallenge("pirate-verify=a3f7c9e2");
      namespaceTimerRef.current = null;
    }, 800);
  }, [clearNamespaceTimer]);

  const handleVerify = React.useCallback(() => {
    clearNamespaceTimer();
    setNamespaceImportStatus("pending");
    namespaceTimerRef.current = setTimeout(() => {
      setNamespaceImportStatus("verified");
      namespaceTimerRef.current = null;
    }, 1500);
  }, [clearNamespaceTimer]);

  const handleFamilyChange = React.useCallback((family: NamespaceFamily) => {
    clearNamespaceTimer();
    setActiveNamespaceFamily(family);
    setNamespaceImportStatus("not_imported");
    setRootInput("");
    setExpiryDaysRemaining(undefined);
    setTxtChallenge(undefined);
    setSignatureChallenge(undefined);
  }, [clearNamespaceTimer]);

  const handleStepClick = React.useCallback((step: number) => {
    if (step >= 1 && step <= 5) setActiveStep(step as ComposerStep);
  }, []);

  const handleNext = React.useCallback(() => {
    setActiveStep((s) => Math.min(s + 1, 5) as ComposerStep);
  }, []);

  const handleBack = React.useCallback(() => {
    setActiveStep((s) => Math.max(s - 1, 1) as ComposerStep);
  }, []);

  const toggleGateType = React.useCallback((type: GateType) => {
    setActiveGateTypes((prev) => {
      const next = new Set(prev);
      if (next.has(type)) {
        next.delete(type);
      } else {
        next.add(type);
      }
      return next;
    });
  }, []);

  const expirySafe = expiryDaysRemaining == null || expiryDaysRemaining >= 90;
  const hasRootInput = rootInput.trim().length > 0;

  const canProceed = React.useMemo(() => {
    switch (activeStep) {
      case 1:
        if (activeNamespaceFamily !== "hns") return false;
        return namespaceImportStatus === "verified" && expirySafe;
      case 2:
        return activeDisplayName.trim().length > 0;
      case 3:
        return activeHandlePolicy != null;
      case 4:
        if (!creatorAgeRequirementMet) return false;
        if (activeMembershipMode === "gated") return activeGateTypes.size > 0;
        return true;
      case 5:
        return canCreateClub;
      default:
        return false;
    }
  }, [
    activeStep,
    activeNamespaceFamily,
    namespaceImportStatus,
    expirySafe,
    activeDisplayName,
    activeHandlePolicy,
    activeMembershipMode,
    activeGateTypes,
  ]);

  const canCreateClub = React.useMemo(
    () =>
      creatorCanCreate &&
      activeNamespaceFamily === "hns" &&
      namespaceImportStatus === "verified" &&
      expirySafe &&
      activeHandlePolicy != null &&
      activeDisplayName.trim().length > 0 &&
      (activeMembershipMode !== "gated" || activeGateTypes.size > 0),
    [
      creatorCanCreate,
      activeNamespaceFamily,
      namespaceImportStatus,
      expirySafe,
      activeHandlePolicy,
      activeDisplayName,
      activeMembershipMode,
      activeGateTypes,
    ],
  );

  const namespaceState: NamespaceImportState = {
    ...initialNamespace,
    family: activeNamespaceFamily,
    externalRoot: displayRoot,
    importStatus: namespaceImportStatus,
    expiryDaysRemaining,
    txtChallenge,
    signatureChallenge,
  };

  const resolvedHandlePolicyLabel =
    activeHandlePolicy != null
      ? handlePolicyTemplateMeta[activeHandlePolicy.policyTemplate].label
      : null;

  const resolvedPricingLabel =
    activeHandlePolicy != null
      ? activeHandlePolicy.pricingModel === "free"
        ? "Free once claims open"
        : activeHandlePolicy.pricingModel === "flat_by_length"
          ? "Flat by length once claims open"
          : activeHandlePolicy.pricingModel === "gated_then_flat"
            ? "Gated then flat once claims open"
            : "Custom once claims open"
      : null;

  const membershipLabel = membershipMeta[activeMembershipMode].label;
  const creatorVerificationMessage = !creatorUniqueHumanVerified
    ? "Complete unique human verification before creating a namespace-backed community."
    : !creatorAgeRequirementMet
      ? "This community is marked 18+, so the creator must also pass age verification before launch."
      : null;

  return (
    <div className="mx-auto w-full max-w-4xl space-y-4">
      <h2 className="text-3xl font-semibold tracking-tight">Create community</h2>
      {creatorVerificationMessage ? (
        <div className="rounded-[var(--radius-lg)] border border-amber-500/20 bg-amber-500/5 px-4 py-3">
          <p className="text-base font-semibold text-foreground">Verification required</p>
          <FormNote className="mt-1">{creatorVerificationMessage}</FormNote>
        </div>
      ) : null}

      <Stepper currentStep={activeStep} onStepClick={handleStepClick} steps={composerSteps} />

      <Card className="overflow-hidden border-border bg-background shadow-none">
        <CardContent className="space-y-8 p-6 md:p-7">
          {activeStep === 1 ? (
            <>
              <div className="space-y-2">
                {(Object.keys(namespaceFamilyMeta) as NamespaceFamily[]).map((family) => {
                  const option = namespaceFamilyMeta[family];
                  const disabled = family === "spaces";

                  return (
                    <OptionCard
                      key={family}
                      description={option.detail}
                      disabled={disabled}
                      disabledHint={option.disabledHint}
                      icon={option.icon}
                      selected={family === activeNamespaceFamily}
                      title={option.label}
                      onClick={() => !disabled && handleFamilyChange(family)}
                    />
                  );
                })}
              </div>

              {activeNamespaceFamily === "hns" ? (
                <>
                  <div className="grid gap-3 md:grid-cols-[1fr_auto] md:items-end">
                    <div>
                      <FieldLabel label="Handshake root" />
                      <PrefixInput
                        onChange={(e) => {
                          const value = e.target.value;
                          clearNamespaceTimer();
                          setRootInput(value);
                          setTxtChallenge(undefined);
                          setSignatureChallenge(undefined);
                          if (namespaceImportStatus !== "not_imported") {
                            setNamespaceImportStatus("not_imported");
                            setExpiryDaysRemaining(undefined);
                          }
                        }}
                        placeholder={namespaceMeta.externalExample}
                        prefix="."
                        value={rootInput}
                      />
                    </div>
                    <Button
                      className="h-12 px-5"
                      disabled={!hasRootInput || namespaceImportStatus !== "not_imported"}
                      loading={namespaceImportStatus === "checking"}
                      onClick={handleHnsInspect}
                      variant="secondary"
                    >
                      Get record
                    </Button>
                  </div>

                  <HnsNamespaceStatus namespace={namespaceState} onVerify={handleVerify} />
                </>
              ) : (
                <>
                  <div>
                    <FieldLabel label="Space" />
                    <PrefixInput
                      onChange={(e) => setRootInput(e.target.value)}
                      placeholder={namespaceMeta.externalExample}
                      prefix="@"
                      value={rootInput}
                    />
                  </div>
                  <SpacesComingSoonState />
                </>
              )}
            </>
          ) : null}

          {activeStep === 2 ? (
            <Section title="Community details">
              <div className="grid gap-4">
                <div>
                  <FieldLabel label="Display name" />
                  <Input
                    className="h-12 rounded-[var(--radius-lg)]"
                    onChange={(e) => setActiveDisplayName(e.target.value)}
                    placeholder="Community name"
                    value={activeDisplayName}
                  />
                </div>

                <div>
                  <FieldLabel label="Description" />
                  <Textarea
                    className="min-h-24"
                    onChange={(e) => setActiveDescription(e.target.value)}
                    placeholder="What is this community for?"
                    value={activeDescription}
                  />
                </div>
              </div>
            </Section>
          ) : null}

          {activeStep === 3 ? (
            <Section title="Handle policy">
              <div className="space-y-2">
                {(Object.keys(handlePolicyTemplateMeta) as HandlePolicyTemplate[]).map((template) => {
                  const option = handlePolicyTemplateMeta[template];
                  const disabled = template === "custom";

                  return (
                    <OptionCard
                      key={template}
                      description={option.detail}
                      disabled={disabled}
                      disabledHint={option.disabledHint}
                      selected={template === (activeHandlePolicy?.policyTemplate ?? null)}
                      title={option.label}
                      onClick={() => !disabled && setActiveHandlePolicy(resolveHandlePolicy(template))}
                    />
                  );
                })}
              </div>

              {activeHandlePolicy != null && activeHandlePolicy.policyTemplate !== "custom" ? (
                <div className="grid gap-3 rounded-[var(--radius-lg)] border border-border-soft bg-muted/20 px-4 py-3.5 text-base md:grid-cols-2">
                  <div className="space-y-0.5">
                    <p className="text-muted-foreground">Pricing</p>
                    <p className="font-medium text-foreground">{resolvedPricingLabel}</p>
                  </div>
                  <div className="space-y-0.5">
                    <p className="text-muted-foreground">Claim access</p>
                    <p className="font-medium text-foreground">
                      {activeHandlePolicy.membershipRequiredForClaim
                        ? "Members only once claims open"
                        : "Open claim once claims open"}
                    </p>
                  </div>
                </div>
              ) : null}
            </Section>
          ) : null}

          {activeStep === 4 ? (
            <>
              <Section title="Membership">
                <SegmentedControl
                  onChange={(value) => setActiveMembershipMode(value as CommunityMembershipMode)}
                  options={membershipMeta}
                  value={activeMembershipMode}
                />

                {activeMembershipMode === "gated" ? (
                  <div className="space-y-4 rounded-[var(--radius-lg)] border border-border-soft bg-muted/20 px-5 py-4">
                    <FormSectionHeading
                      description="Select at least one identity proof before launch."
                      title="Gate checks"
                    />

                    <div className="space-y-2">
                      <p className="text-base font-medium text-foreground">Identity proof</p>
                      <div className="flex flex-wrap gap-2">
                        {identityGateTypes.map((type) => (
                          <Chip
                            key={type}
                            variant={activeGateTypes.has(type) ? "active" : "outline"}
                            onClick={() => toggleGateType(type)}
                          >
                            {gateTypeMeta[type].label}
                          </Chip>
                        ))}
                      </div>
                    </div>

                    {activeGateTypes.size > 0 ? (
                      <FormNote>
                        {activeGateTypes.size} identity check
                        {activeGateTypes.size > 1 ? "s" : ""} selected.
                      </FormNote>
                    ) : null}
                  </div>
                ) : null}
              </Section>

              <Section className="border-t border-border-soft pt-8" title="Identity & access">
                <div className="space-y-5">
                  <CheckboxRow
                    checked={activeAllowAnonymousIdentity}
                    id="community-allow-anonymous-posting"
                    label="Allow anonymous posting"
                    onCheckedChange={setActiveAllowAnonymousIdentity}
                  />

                  {activeAllowAnonymousIdentity ? (
                    <div className="space-y-3 border-l border-border-soft pl-4">
                      <p className="text-base font-medium text-foreground">Anonymous scope</p>
                      <div className="space-y-2">
                        {(Object.keys(anonymousScopeMeta) as AnonymousIdentityScope[]).map((scope) => {
                          const option = anonymousScopeMeta[scope];

                          return (
                            <OptionCard
                              key={scope}
                              description={option.detail}
                              selected={scope === activeAnonymousScope}
                              title={option.label}
                              onClick={() => setActiveAnonymousScope(scope)}
                            />
                          );
                        })}
                      </div>
                      {activeAnonymousScope === "post_ephemeral" ? (
                        <div className="rounded-[var(--radius-lg)] border border-amber-500/20 bg-amber-500/5 px-4 py-3">
                          <FormNote tone="default">
                            Post-ephemeral scope prevents cross-post tracking and strike carryover.
                            Content safety classification and at least one active moderator are required.
                          </FormNote>
                        </div>
                      ) : null}
                    </div>
                  ) : null}

                  <CheckboxRow
                    checked={activeDefaultAgeGatePolicy === "18_plus"}
                    id="community-18-plus"
                    label="18+ community"
                    onCheckedChange={(checked) =>
                      setActiveDefaultAgeGatePolicy(checked ? "18_plus" : "none")
                    }
                  />
                  {activeDefaultAgeGatePolicy === "18_plus" && !creatorAgeOver18Verified ? (
                    <FormNote tone="warning">
                      The creator must complete age verification before launching an 18+ community.
                    </FormNote>
                  ) : null}
                </div>
              </Section>
            </>
          ) : null}

          {activeStep === 5 ? (
            <div className="space-y-4">
              <ReviewSection title="Namespace">
                <ReviewField label="Family" value={namespaceFamilyMeta[activeNamespaceFamily].label} />
                <ReviewField label="Root" value={displayRoot} />
                <ReviewField label="Route" value={<span className="font-mono">{clubRoute}</span>} />
                <ReviewField label="Handle format" value={<span className="font-mono">{handleFormat}</span>} />
                <ReviewField
                  label="Verification"
                  value={
                    namespaceImportStatus === "verified"
                      ? "Verified"
                      : namespaceImportStatus
                  }
                />
              </ReviewSection>

              <ReviewSection title="Community identity">
                <ReviewField label="Display name" value={activeDisplayName} />
                <div className="md:col-span-2">
                  <ReviewField label="Description" value={activeDescription || "\u2014"} />
                </div>
              </ReviewSection>

              <ReviewSection title="Handle policy">
                <ReviewField label="Template" value={resolvedHandlePolicyLabel} />
                <ReviewField label="Pricing" value={resolvedPricingLabel} />
                <ReviewField
                  label="Claim access"
                  value={
                    activeHandlePolicy?.membershipRequiredForClaim
                      ? "Members only once claims open"
                      : "Open claim once claims open"
                  }
                />
              </ReviewSection>

              <ReviewSection title="Access policy">
                <ReviewField label="Join flow" value={membershipLabel} />
                {activeMembershipMode === "gated" && activeGateTypes.size > 0 ? (
                  <div className="md:col-span-2">
                    <ReviewField
                      label="Membership gates"
                      value={Array.from(activeGateTypes).map((t) => gateTypeMeta[t].label).join(", ")}
                    />
                  </div>
                ) : null}
                <ReviewField
                  label="Anonymous posting"
                  value={activeAllowAnonymousIdentity ? "Enabled" : "Disabled"}
                />
                {activeAllowAnonymousIdentity ? (
                  <ReviewField
                    label="Anonymous scope"
                    value={anonymousScopeMeta[activeAnonymousScope].label}
                  />
                ) : null}
                <ReviewField
                  label="Age gate"
                  value={activeDefaultAgeGatePolicy === "18_plus" ? "18+" : "None"}
                />
              </ReviewSection>

              {creatorVerificationMessage ? (
                <div className="rounded-[var(--radius-lg)] border border-destructive/20 bg-destructive/5 px-4 py-3">
                  <p className="text-base font-semibold text-foreground">
                    {creatorVerificationMessage}
                  </p>
                </div>
              ) : null}
            </div>
          ) : null}
        </CardContent>

        <CardFooter className="justify-end border-t border-border-soft p-5">
          <div className="flex gap-3">
            {activeStep > 1 ? (
              <Button onClick={handleBack} variant="secondary">
                Back
              </Button>
            ) : null}
            {activeStep < 5 ? (
              <Button disabled={!canProceed} onClick={handleNext}>
                Next
              </Button>
            ) : (
              <Button disabled={!canCreateClub}>Create Community</Button>
            )}
          </div>
        </CardFooter>
      </Card>
    </div>
  );
}
