"use client";

import * as React from "react";

import { Avatar } from "@/components/primitives/avatar";
import { Button } from "@/components/primitives/button";
import { Card, CardContent, CardFooter } from "@/components/primitives/card";
import {
  FormNote,
  FormSectionHeading,
} from "@/components/primitives/form-layout";
import { Input } from "@/components/primitives/input";
import { OptionCard } from "@/components/primitives/option-card";
import { Stepper } from "@/components/primitives/stepper";
import { Textarea } from "@/components/primitives/textarea";
import { toast } from "@/components/primitives/sonner";
import { resolveCommunityAvatarSrc, resolveCommunityBannerSrc } from "@/lib/default-community-media";
import { formatGateRequirement, getGateDraftWarning } from "@/lib/identity-gates";
import {
  ISO_ALPHA_2,
  FieldLabel,
  MediaPicker,
  Section,
  SegmentedControl,
  acceptedCommunityImageTypes,
  anonymousScopeMeta,
  composerSteps,
  membershipMeta,
  useCommunityPreviewMedia,
  CheckboxRow,
  CommunityReviewStep,
} from "./create-community-composer.sections";

import type {
  AnonymousIdentityScope,
  ComposerStep,
  CreateCommunityComposerProps,
  CommunityDefaultAgeGatePolicy,
  CommunityMembershipMode,
  IdentityGateDraft,
} from "./create-community-composer.types";

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
      namespaceVerificationId: null,
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
  const gateRequirementSummary = activeGateDrafts.length > 0
    ? activeGateDrafts
        .map((draft) =>
          formatGateRequirement(
            { gate_type: draft.gateType, required_value: draft.requiredValue },
            { audience: "admin" },
          ),
        )
        .join(", ")
    : null;
  const previewDisplayName = activeDisplayName.trim() || "New community";
  const previewAvatarOverride = useCommunityPreviewMedia(activeAvatarFile, activeAvatarRef);
  const previewAvatarSrc = React.useMemo(
    () => resolveCommunityAvatarSrc({
      avatarSrc: previewAvatarOverride,
      communityId: "draft-community",
      displayName: previewDisplayName,
    }),
    [previewAvatarOverride, previewDisplayName],
  );
  const previewBannerOverride = useCommunityPreviewMedia(activeBannerFile, activeBannerRef);
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
                      src={previewAvatarSrc}
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
                        <FieldLabel label="Country code (ISO 3166-1 alpha-2)" />
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
            <CommunityReviewStep
              ageGateLabel={activeDefaultAgeGatePolicy === "18_plus" ? "18+" : "None"}
              anonymousPostingLabel={activeAllowAnonymousIdentity ? "Enabled" : "Disabled"}
              anonymousScopeLabel={
                activeAllowAnonymousIdentity
                  ? anonymousScopeMeta[activeAnonymousScope].label
                  : undefined
              }
              avatarLabel={
                activeAvatarFile?.name ||
                (activeAvatarRef.trim() ? "Saved image" : "Generated default")
              }
              bannerLabel={
                activeBannerFile?.name ||
                (activeBannerRef.trim() ? "Saved image" : "Generated default")
              }
              creatorVerificationMessage={creatorVerificationMessage}
              description={activeDescription}
              displayName={activeDisplayName}
              gateRequirementSummary={gateRequirementSummary}
              membershipLabel={membershipLabel}
            />
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
