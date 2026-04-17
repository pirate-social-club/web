"use client";

import * as React from "react";

import { Avatar } from "@/components/primitives/avatar";
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
import { RadioGroup, RadioGroupItem } from "@/components/primitives/radio-group";
import { Stepper } from "@/components/primitives/stepper";
import { Textarea } from "@/components/primitives/textarea";
import { toast } from "@/components/primitives/sonner";
import { resolveCommunityBannerSrc } from "@/lib/default-community-media";
import { formatGateRequirement, getGateDraftWarning } from "@/lib/identity-gates";
import { cn } from "@/lib/utils";

import type {
  AnonymousIdentityScope,
  ComposerStep,
  CreatorVerificationState,
  CreateCommunityComposerProps,
  CommunityDefaultAgeGatePolicy,
  CommunityMembershipMode,
  IdentityGateDraft,
} from "./create-community-composer.types";

const ISO_ALPHA_2 = /^[A-Z]{2}$/;
const acceptedCommunityImageTypes = "image/png,image/jpeg,image/webp,image/gif";

const membershipMeta: Record<CommunityMembershipMode, { label: string; detail: string }> = {
  open: {
    label: "Open",
    detail: "Anyone can join immediately.",
  },
  request: {
    label: "Request",
    detail: "Users request to join. Membership is pending until approved.",
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
      <RadioGroup
        className="grid"
        onValueChange={(next) => onChange(next as T)}
        value={value}
        style={{ gridTemplateColumns: `repeat(${keys.length}, minmax(0, 1fr))` }}
      >
        {keys.map((key) => (
          <RadioGroupItem key={key} value={key}>
            {options[key].label}
          </RadioGroupItem>
        ))}
      </RadioGroup>
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

function useObjectUrl(file: File | null): string | null {
  const [objectUrl, setObjectUrl] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (!file) {
      setObjectUrl(null);
      return;
    }

    const nextUrl = URL.createObjectURL(file);
    setObjectUrl(nextUrl);

    return () => {
      URL.revokeObjectURL(nextUrl);
    };
  }, [file]);

  return objectUrl;
}

function MediaPicker({
  accept,
  file,
  label,
  onSelect,
  onRemove,
}: {
  accept: string;
  file: File | null;
  label: string;
  onSelect: (file: File | null) => void;
  onRemove: () => void;
}) {
  const inputId = React.useId();

  return (
    <div className="space-y-2">
      <FieldLabel label={label} />
      <input
        accept={accept}
        className="sr-only"
        id={inputId}
        onChange={(event) => {
          onSelect(event.target.files?.[0] ?? null);
          event.currentTarget.value = "";
        }}
        type="file"
      />
      <div className="flex min-h-14 items-center justify-between gap-3 rounded-[var(--radius-lg)] border border-border-soft bg-card px-4 py-3.5">
        <p className="min-w-0 truncate text-base font-medium text-foreground">
          {file?.name || `No ${label.toLowerCase()} selected`}
        </p>
        <div className="flex shrink-0 items-center gap-2">
          {file ? (
            <Button onClick={onRemove} size="sm" type="button" variant="ghost">
              Remove
            </Button>
          ) : null}
          <label className="cursor-pointer" htmlFor={inputId}>
            <span className="inline-flex h-10 items-center rounded-full bg-muted px-4 text-base font-semibold text-foreground">
              {file ? "Replace" : "Choose file"}
            </span>
          </label>
        </div>
      </div>
    </div>
  );
}

export function CreateCommunityComposer({
  avatarRef = "",
  bannerRef = "",
  displayName = "",
  description = "",
  gateDrafts = [],
  membershipMode = "open",
  defaultAgeGatePolicy = "none",
  allowAnonymousIdentity = true,
  anonymousIdentityScope: anonymousIdentityScopeProp,
  creatorVerificationState,
  initialStep,
  namespaceAttachment,
  onOpenNamespaceVerification,
  onClearNamespaceVerification,
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
  const [activeAvatarRef, setActiveAvatarRef] = React.useState(avatarRef ?? "");
  const [activeBannerRef, setActiveBannerRef] = React.useState(bannerRef ?? "");
  const [activeAvatarFile, setActiveAvatarFile] = React.useState<File | null>(null);
  const [activeBannerFile, setActiveBannerFile] = React.useState<File | null>(null);
  const [activeDisplayName, setActiveDisplayName] = React.useState(displayName ?? "");
  const [activeDescription, setActiveDescription] = React.useState(description ?? "");
  const nationalityGate = gateDrafts.find((draft) => draft.gateType === "nationality");
  const genderGate = gateDrafts.find((draft) => draft.gateType === "gender");
  const [nationalityEnabled, setNationalityEnabled] = React.useState(Boolean(nationalityGate));
  const [nationalityRequiredValue, setNationalityRequiredValue] = React.useState(
    nationalityGate?.requiredValue ?? "",
  );
  const [genderEnabled, setGenderEnabled] = React.useState(Boolean(genderGate));
  const [genderRequiredValue, setGenderRequiredValue] = React.useState<"M" | "F">(
    genderGate?.requiredValue ?? "F",
  );
  const [submitting, setSubmitting] = React.useState(false);

  const creatorUniqueHumanVerified = creatorVerificationState?.uniqueHumanVerified ?? false;
  const creatorAgeOver18Verified = creatorVerificationState?.ageOver18Verified ?? false;
  const creatorAgeRequirementMet =
    activeDefaultAgeGatePolicy !== "18_plus" || creatorAgeOver18Verified;
  const creatorCanCreate = creatorUniqueHumanVerified && creatorAgeRequirementMet;

  const activeGateDrafts: IdentityGateDraft[] = [
    ...(nationalityEnabled && ISO_ALPHA_2.test(nationalityRequiredValue)
      ? [{ gateType: "nationality" as const, provider: "self" as const, requiredValue: nationalityRequiredValue }]
      : []),
    ...(genderEnabled
      ? [{ gateType: "gender" as const, provider: "self" as const, requiredValue: genderRequiredValue }]
      : []),
  ];

  React.useEffect(() => { setActiveMembershipMode(membershipMode); }, [membershipMode]);
  React.useEffect(() => { setActiveAvatarRef(avatarRef); }, [avatarRef]);
  React.useEffect(() => { setActiveBannerRef(bannerRef); }, [bannerRef]);
  React.useEffect(() => {
    const nextNationalityGate = gateDrafts.find((draft) => draft.gateType === "nationality");
    setNationalityEnabled(Boolean(nextNationalityGate));
    setNationalityRequiredValue(nextNationalityGate?.requiredValue ?? "");

    const nextGenderGate = gateDrafts.find((draft) => draft.gateType === "gender");
    setGenderEnabled(Boolean(nextGenderGate));
    setGenderRequiredValue(nextGenderGate?.requiredValue ?? "F");
  }, [gateDrafts]);
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

  const handleCreate = React.useCallback(() => {
    if (!onCreate) return;

    setSubmitting(true);
    void onCreate({
      avatarFile: activeAvatarFile,
      avatarRef: activeAvatarRef.trim() || null,
      bannerFile: activeBannerFile,
      bannerRef: activeBannerRef.trim() || null,
      displayName: activeDisplayName.trim(),
      description: activeDescription.trim() || null,
      membershipMode: activeMembershipMode,
      defaultAgeGatePolicy: activeDefaultAgeGatePolicy,
      allowAnonymousIdentity: activeAllowAnonymousIdentity,
      anonymousIdentityScope: activeAnonymousScope,
      gateDrafts: activeGateDrafts,
      namespaceVerificationId: namespaceAttachment?.namespaceVerificationId ?? null,
    })
      .catch((error: unknown) => {
        toast.error(error instanceof Error ? error.message : "Could not create community");
      })
      .finally(() => {
        setSubmitting(false);
      });
  }, [
    onCreate,
    activeAvatarFile,
    activeAvatarRef,
    activeBannerFile,
    activeBannerRef,
    activeDisplayName,
    activeDescription,
    activeMembershipMode,
    activeDefaultAgeGatePolicy,
    activeAllowAnonymousIdentity,
    activeAnonymousScope,
    activeGateDrafts,
    namespaceAttachment,
  ]);

  const gateDraftsValid = activeMembershipMode !== "gated" || activeGateDrafts.length > 0;

  const canCreateCommunity = React.useMemo(
    () =>
      !!onCreate &&
      creatorCanCreate &&
      activeDisplayName.trim().length > 0 &&
      gateDraftsValid,
    [
      onCreate,
      creatorCanCreate,
      activeDisplayName,
      gateDraftsValid,
    ],
  );

  const canProceed = React.useMemo(() => {
    switch (activeStep) {
      case 1:
        return activeDisplayName.trim().length > 0;
      case 2:
        if (!creatorAgeRequirementMet) return false;
        return gateDraftsValid;
      case 3:
        return canCreateCommunity;
      default:
        return false;
    }
  }, [
    activeStep,
    activeDisplayName,
    gateDraftsValid,
    canCreateCommunity,
    creatorAgeRequirementMet,
  ]);

  const membershipLabel = membershipMeta[activeMembershipMode].label;
  const previewDisplayName = activeDisplayName.trim() || "New community";
  const previewAvatarSrc = useObjectUrl(activeAvatarFile) ?? (activeAvatarRef.trim() || null);
  const previewBannerOverride = useObjectUrl(activeBannerFile) ?? (activeBannerRef.trim() || null);
  const previewBannerSrc = React.useMemo(
    () => resolveCommunityBannerSrc({
      bannerSrc: previewBannerOverride,
      communityId: "draft-community",
      displayName: previewDisplayName,
    }),
    [previewBannerOverride, previewDisplayName],
  );
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

                <div className="overflow-hidden rounded-[var(--radius-xl)] border border-border-soft bg-card">
                  <div
                    className="h-28 w-full bg-cover bg-center md:h-32"
                    style={{ backgroundImage: `url(${previewBannerSrc})` }}
                  />
                  <div className="-mt-6 flex items-end gap-3 px-4 pb-4">
                    <Avatar
                      className="h-14 w-14 border-4 border-card bg-card"
                      fallback={previewDisplayName}
                      size="lg"
                      src={previewAvatarSrc ?? undefined}
                    />
                    <div className="min-w-0 space-y-0.5 pb-1">
                      <p className="truncate text-lg font-semibold text-foreground">
                        {previewDisplayName}
                      </p>
                      {activeDescription.trim() ? (
                        <p className="line-clamp-1 text-base text-muted-foreground">
                          {activeDescription.trim()}
                        </p>
                      ) : null}
                    </div>
                  </div>
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <MediaPicker
                    accept={acceptedCommunityImageTypes}
                    file={activeAvatarFile}
                    label="Avatar"
                    onRemove={() => setActiveAvatarFile(null)}
                    onSelect={(file) => {
                      setActiveAvatarFile(file);
                      if (file) {
                        setActiveAvatarRef("");
                      }
                    }}
                  />
                  <MediaPicker
                    accept={acceptedCommunityImageTypes}
                    file={activeBannerFile}
                    label="Banner"
                    onRemove={() => setActiveBannerFile(null)}
                    onSelect={(file) => {
                      setActiveBannerFile(file);
                      if (file) {
                        setActiveBannerRef("");
                      }
                    }}
                  />
                </div>

                <div>
                  <FieldLabel label="Namespace" />
                  <FormNote className="mb-2">Optional now. Attach one later to claim your canonical slug.</FormNote>
                  {namespaceAttachment ? (
                    <div className="space-y-3 rounded-[var(--radius-lg)] border border-border-soft bg-muted/20 px-4 py-3.5">
                      <div className="flex items-center justify-between gap-3">
                        <div>
                          <p className="text-base font-medium text-foreground">Verified namespace attached</p>
                          <FormNote className="mt-1">
                            {namespaceAttachment.family === "spaces" ? "@" : "."}
                            {namespaceAttachment.normalizedRootLabel}
                          </FormNote>
                        </div>
                        <div className="shrink-0">
                          <Button onClick={onOpenNamespaceVerification} size="sm" type="button" variant="outline">
                            Change
                          </Button>
                        </div>
                      </div>
                      <div>
                        <Button onClick={onClearNamespaceVerification} size="sm" type="button" variant="ghost">
                          Remove namespace
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <Button className="h-12 w-full rounded-[var(--radius-lg)]" onClick={onOpenNamespaceVerification} type="button" variant="outline">
                      Verify namespace now
                    </Button>
                  )}
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

                    <OptionCard
                      description="Require members to verify their nationality through self before joining."
                      selected={nationalityEnabled}
                      title="Nationality verification"
                      onClick={() => setNationalityEnabled((prev) => !prev)}
                    />

                    {nationalityEnabled ? (
                      <div className="space-y-2">
                        <FormFieldLabel label="Country code (ISO 3166-1 alpha-2)" />
                        <Input
                          className="h-12 w-24 rounded-[var(--radius-lg)]"
                          maxLength={2}
                          onChange={(e) => setNationalityRequiredValue(e.target.value.toUpperCase())}
                          placeholder="US"
                          value={nationalityRequiredValue}
                        />
                        {nationalityRequiredValue.length > 0 && !ISO_ALPHA_2.test(nationalityRequiredValue) ? (
                          <FormNote tone="warning">Enter a valid 2-letter country code.</FormNote>
                        ) : null}
                      </div>
                    ) : null}

                    <OptionCard
                      description="Require members to reveal the Self document marker on their document before joining."
                      selected={genderEnabled}
                      title="Self document marker"
                      onClick={() => setGenderEnabled((prev) => !prev)}
                    />

                    {genderEnabled ? (
                      <div className="space-y-3">
                        <SegmentedControl
                          onChange={(value) => setGenderRequiredValue(value as "M" | "F")}
                          options={{
                            F: {
                              label: "F marker",
                              detail: "Accept only members whose Self document marker is F.",
                            },
                            M: {
                              label: "M marker",
                              detail: "Accept only members whose Self document marker is M.",
                            },
                          }}
                          value={genderRequiredValue}
                        />
                        {getGateDraftWarning("gender") ? (
                          <FormNote tone="warning">{getGateDraftWarning("gender")}</FormNote>
                        ) : null}
                      </div>
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
                <ReviewField
                  label="Avatar"
                  value={activeAvatarFile?.name || (activeAvatarRef.trim() ? "Saved image" : "Generated default")}
                />
                <ReviewField
                  label="Banner"
                  value={activeBannerFile?.name || (activeBannerRef.trim() ? "Saved image" : "Generated default")}
                />
                <ReviewField
                  label="Namespace"
                  value={namespaceAttachment
                    ? `${namespaceAttachment.family === "spaces" ? "@" : "."}${namespaceAttachment.normalizedRootLabel}`
                    : "Uses community ID URL until verified"}
                />
              </ReviewSection>

              <ReviewSection title="Access policy">
                <ReviewField label="Join flow" value={membershipLabel} />
                {activeGateDrafts.length > 0 ? (
                  <div className="md:col-span-2">
                    <ReviewField
                      label="Membership gates"
                      value={activeGateDrafts
                        .map((draft) => formatGateRequirement(
                          { gate_type: draft.gateType, required_value: draft.requiredValue },
                          { audience: "admin" },
                        ))
                        .join(", ")}
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
