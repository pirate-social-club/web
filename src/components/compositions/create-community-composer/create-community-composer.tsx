"use client";

import * as React from "react";

import { Button } from "@/components/primitives/button";
import { Card, CardContent, CardFooter } from "@/components/primitives/card";
import { Checkbox } from "@/components/primitives/checkbox";
import {
  FormFieldLabel,
  FormNote,
  FormSectionHeading,
} from "@/components/primitives/form-layout";
import { Input } from "@/components/primitives/input";
import { Label } from "@/components/primitives/label";
import { OptionCard } from "@/components/primitives/option-card";
import { Chip } from "@/components/primitives/chip";
import { Tabs, TabsList, TabsTrigger } from "@/components/primitives/tabs";
import { Stepper } from "@/components/primitives/stepper";
import { Textarea } from "@/components/primitives/textarea";
import { toast } from "@/components/primitives/sonner";
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

const anonymousScopeMeta: Record<AnonymousIdentityScope, { label: string; detail: string; disabledHint?: string }> = {
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
    disabledHint: "Post-ephemeral scope is not available in v0.",
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

const identityGateTypes: GateType[] = ["unique_human", "age_over_18", "nationality", "wallet_score"];

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
}: {
  options: Record<T, { label: string; detail?: string }>;
  value: T;
  onChange: (next: T) => void;
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
  { label: "Community" },
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

export function CreateCommunityComposer({
  displayName = "",
  description = "",
  membershipMode = "open",
  defaultAgeGatePolicy = "none",
  allowAnonymousIdentity = true,
  anonymousIdentityScope: anonymousIdentityScopeProp,
  creatorVerificationState,
  initialStep,
  onCreate,
}: CreateCommunityComposerProps) {
  const [activeStep, setActiveStep] = React.useState<ComposerStep>(initialStep ?? 1);
  const [activeMembershipMode, setActiveMembershipMode] =
    React.useState<CommunityMembershipMode>(membershipMode);
  const [activeDefaultAgeGatePolicy, setActiveDefaultAgeGatePolicy] =
    React.useState<CommunityDefaultAgeGatePolicy>(defaultAgeGatePolicy);
  const [activeAllowAnonymousIdentity, setActiveAllowAnonymousIdentity] =
    React.useState<boolean>(allowAnonymousIdentity);
  const [activeAnonymousScope, setActiveAnonymousScope] =
    React.useState<AnonymousIdentityScope>(anonymousIdentityScopeProp ?? "community_stable");
  const [activeDisplayName, setActiveDisplayName] = React.useState(displayName ?? "");
  const [activeDescription, setActiveDescription] = React.useState(description ?? "");
  const [activeGateTypes, setActiveGateTypes] = React.useState<Set<GateType>>(new Set());
  const [submitting, setSubmitting] = React.useState(false);

  const creatorUniqueHumanVerified = creatorVerificationState?.uniqueHumanVerified ?? false;
  const creatorAgeOver18Verified = creatorVerificationState?.ageOver18Verified ?? false;
  const creatorAgeRequirementMet =
    activeDefaultAgeGatePolicy !== "18_plus" || creatorAgeOver18Verified;
  const creatorCanCreate = creatorUniqueHumanVerified && creatorAgeRequirementMet;

  React.useEffect(() => { setActiveMembershipMode(membershipMode); }, [membershipMode]);
  React.useEffect(() => { setActiveDefaultAgeGatePolicy(defaultAgeGatePolicy); }, [defaultAgeGatePolicy]);
  React.useEffect(() => { setActiveAllowAnonymousIdentity(allowAnonymousIdentity); }, [allowAnonymousIdentity]);
  React.useEffect(() => {
    if (anonymousIdentityScopeProp) setActiveAnonymousScope(anonymousIdentityScopeProp);
  }, [anonymousIdentityScopeProp]);

  const handleStepClick = React.useCallback((step: number) => {
    if (step >= 1 && step <= 3) setActiveStep(step as ComposerStep);
  }, []);

  const handleNext = React.useCallback(() => {
    setActiveStep((s) => Math.min(s + 1, 3) as ComposerStep);
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

  const handleCreate = React.useCallback(() => {
    if (!onCreate) return;

    setSubmitting(true);
    void onCreate({
      displayName: activeDisplayName.trim(),
      description: activeDescription.trim() || null,
      membershipMode: activeMembershipMode,
      defaultAgeGatePolicy: activeDefaultAgeGatePolicy,
      allowAnonymousIdentity: activeAllowAnonymousIdentity,
      anonymousIdentityScope: activeAnonymousScope,
      gateTypes: activeGateTypes,
    })
      .catch((error: unknown) => {
        toast.error(error instanceof Error ? error.message : "Could not create community");
      })
      .finally(() => {
        setSubmitting(false);
      });
  }, [
    onCreate,
    activeDisplayName,
    activeDescription,
    activeMembershipMode,
    activeDefaultAgeGatePolicy,
    activeAllowAnonymousIdentity,
    activeAnonymousScope,
    activeGateTypes,
  ]);

  const canCreateCommunity = React.useMemo(
    () =>
      !!onCreate &&
      creatorCanCreate &&
      activeDisplayName.trim().length > 0 &&
      (activeMembershipMode !== "gated" || activeGateTypes.size > 0),
    [
      onCreate,
      creatorCanCreate,
      activeDisplayName,
      activeMembershipMode,
      activeGateTypes,
    ],
  );

  const canProceed = React.useMemo(() => {
    switch (activeStep) {
      case 1:
        return activeDisplayName.trim().length > 0;
      case 2:
        if (!creatorAgeRequirementMet) return false;
        if (activeMembershipMode === "gated") return activeGateTypes.size > 0;
        return true;
      case 3:
        return canCreateCommunity;
      default:
        return false;
    }
  }, [
    activeStep,
    activeDisplayName,
    activeMembershipMode,
    activeGateTypes,
    canCreateCommunity,
    creatorAgeRequirementMet,
  ]);

  const membershipLabel = membershipMeta[activeMembershipMode].label;
  const creatorVerificationMessage = !creatorUniqueHumanVerified
    ? "Complete unique human verification before creating a community."
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

          {activeStep === 2 ? (
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
                          const disabled = scope === "post_ephemeral";

                          return (
                            <OptionCard
                              key={scope}
                              description={option.detail}
                              disabled={disabled}
                              disabledHint={option.disabledHint}
                              selected={scope === activeAnonymousScope}
                              title={option.label}
                              onClick={() => !disabled && setActiveAnonymousScope(scope)}
                            />
                          );
                        })}
                      </div>
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

          {activeStep === 3 ? (
            <div className="space-y-4">
              <ReviewSection title="Community">
                <ReviewField label="Display name" value={activeDisplayName} />
                <div className="md:col-span-2">
                  <ReviewField label="Description" value={activeDescription || "\u2014"} />
                </div>
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
            {activeStep < 3 ? (
              <Button disabled={!canProceed} onClick={handleNext}>
                Next
              </Button>
            ) : (
              <Button disabled={!canCreateCommunity} loading={submitting} onClick={handleCreate}>Create Community</Button>
            )}
          </div>
        </CardFooter>
      </Card>
    </div>
  );
}
