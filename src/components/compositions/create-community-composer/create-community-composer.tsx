"use client";

import * as React from "react";
import { isAddress } from "viem";

import { Avatar } from "@/components/primitives/avatar";
import { Button } from "@/components/primitives/button";
import { Card, CardContent, CardFooter } from "@/components/primitives/card";
import {
  FormNote,
  FormSectionHeading,
} from "@/components/primitives/form-layout";
import { Input } from "@/components/primitives/input";
import { CheckboxCard } from "@/components/primitives/checkbox-card";
import { OptionCard } from "@/components/primitives/option-card";
import { Stepper } from "@/components/primitives/stepper";
import { Textarea } from "@/components/primitives/textarea";
import { toast } from "@/components/primitives/sonner";
import { isCountryCode } from "@/lib/countries";
import { useRouteMessages } from "@/app/authenticated-routes/route-core";
import { resolveCommunityAvatarSrc, resolveCommunityBannerSrc } from "@/lib/default-community-media";
import { formatGateRequirement, getGateDraftWarning } from "@/lib/identity-gates";
import { logger } from "@/lib/logger";
import {
  FieldLabel,
  MediaPicker,
  Section,
  SegmentedControl,
  acceptedCommunityImageTypes,

  useCommunityPreviewMedia,
  CheckboxRow,
  CommunityReviewStep,
} from "./create-community-composer.sections";
import { NationalityPicker } from "./nationality-picker";

import type {
  AnonymousIdentityScope,
  ComposerStep,
  CreateCommunityComposerProps,
  CommunityDefaultAgeGatePolicy,
  CommunityMembershipMode,
  IdentityGateDraft,
} from "./create-community-composer.types";

const EMPTY_GATE_DRAFTS: IdentityGateDraft[] = [];

function logCreateCommunityGateDebug(event: string, data: Record<string, unknown>) {
  logger.debug("[CreateCommunityComposer]", event, data);
}

export function CreateCommunityComposer({
  avatarRef = "",
  bannerRef = "",
  displayName = "",
  description = "",
  namespaceAttachment = null,
  hasPendingNamespaceSession = false,
  gateDrafts = EMPTY_GATE_DRAFTS,
  membershipMode = "open",
  defaultAgeGatePolicy = "none",
  allowAnonymousIdentity = true,
  anonymousIdentityScope: anonymousIdentityScopeProp,
  creatorVerificationState,
  initialStep,
  onClearNamespace,
  onCreate,
  onVerifyNamespace,
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
  const erc721Gate = gateDrafts.find((draft) => draft.gateType === "erc721_holding");
  const [nationalityEnabled, setNationalityEnabled] = React.useState(Boolean(nationalityGate));
  const [nationalityRequiredValue, setNationalityRequiredValue] = React.useState(
    nationalityGate?.requiredValue ?? "",
  );
  const [genderEnabled, setGenderEnabled] = React.useState(Boolean(genderGate));
  const [genderRequiredValue, setGenderRequiredValue] = React.useState<"M" | "F">(
    genderGate?.requiredValue ?? "F",
  );
  const [erc721Enabled, setErc721Enabled] = React.useState(Boolean(erc721Gate));
  const [erc721ContractAddress, setErc721ContractAddress] = React.useState(
    erc721Gate?.contractAddress ?? "",
  );
  const [submitting, setSubmitting] = React.useState(false);
  const gateDraftsSyncKey = React.useMemo(
    () =>
      gateDrafts
        .map((draft) => (
          draft.gateType === "erc721_holding"
            ? [draft.gateType, draft.chainNamespace, draft.contractAddress, draft.gateRuleId ?? ""].join(":")
            : [draft.gateType, draft.provider, draft.requiredValue, draft.gateRuleId ?? ""].join(":")
        ))
        .sort()
        .join("|"),
    [gateDrafts],
  );

  const creatorUniqueHumanVerified = creatorVerificationState?.uniqueHumanVerified ?? false;
  const creatorAgeOver18Verified = creatorVerificationState?.ageOver18Verified ?? false;
  const creatorAgeRequirementMet =
    activeDefaultAgeGatePolicy !== "18_plus" || creatorAgeOver18Verified;
  const creatorCanCreate = creatorUniqueHumanVerified && creatorAgeRequirementMet;
  const { copy } = useRouteMessages();
  const cc = copy.createCommunity.composer;

  const namespaceRouteLabel = React.useMemo(() => {
    if (!namespaceAttachment) {
      return hasPendingNamespaceSession ? cc.verificationInProgress : cc.noRoute;
    }

    const prefix = namespaceAttachment.family === "spaces" ? "@" : ".";
    return `${prefix}${namespaceAttachment.normalizedRootLabel}`;
  }, [hasPendingNamespaceSession, namespaceAttachment, cc]);

  const activeGateDrafts: IdentityGateDraft[] = [
    ...(nationalityEnabled && isCountryCode(nationalityRequiredValue)
      ? [{ gateType: "nationality" as const, provider: "self" as const, requiredValue: nationalityRequiredValue }]
      : []),
    ...(genderEnabled
      ? [{ gateType: "gender" as const, provider: "self" as const, requiredValue: genderRequiredValue }]
      : []),
    ...(erc721Enabled && isAddress(erc721ContractAddress.trim())
      ? [{
        gateType: "erc721_holding" as const,
        chainNamespace: "eip155:1" as const,
        contractAddress: erc721ContractAddress.trim(),
      }]
      : []),
  ];

  React.useEffect(() => { setActiveMembershipMode(membershipMode); }, [membershipMode]);
  React.useEffect(() => { setActiveAvatarRef(avatarRef); }, [avatarRef]);
  React.useEffect(() => { setActiveBannerRef(bannerRef); }, [bannerRef]);
  React.useEffect(() => {
    logCreateCommunityGateDebug("syncGateDraftsFromProps", {
      gateDrafts,
      gateDraftsSyncKey,
    });
    const nextNationalityGate = gateDrafts.find((draft) => draft.gateType === "nationality");
    setNationalityEnabled(Boolean(nextNationalityGate));
    setNationalityRequiredValue(nextNationalityGate?.requiredValue ?? "");

    const nextGenderGate = gateDrafts.find((draft) => draft.gateType === "gender");
    setGenderEnabled(Boolean(nextGenderGate));
    setGenderRequiredValue(nextGenderGate?.requiredValue ?? "F");

    const nextErc721Gate = gateDrafts.find((draft) => draft.gateType === "erc721_holding");
    setErc721Enabled(Boolean(nextErc721Gate));
    setErc721ContractAddress(nextErc721Gate?.contractAddress ?? "");
  }, [gateDraftsSyncKey]);
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
        toast.error(error instanceof Error ? error.message : cc.createError);
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

  const erc721GateValid = !erc721Enabled || isAddress(erc721ContractAddress.trim());
  const gateDraftsValid = activeMembershipMode !== "gated" || (activeGateDrafts.length > 0 && erc721GateValid);

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

  const membershipLabel = ({
    open: cc.membershipOpenLabel,
    request: cc.membershipRequestLabel,
    gated: cc.membershipGatedLabel,
  })[activeMembershipMode];
  const gateRequirementSummary = activeGateDrafts.length > 0
    ? activeGateDrafts
        .map((draft) =>
          formatGateRequirement(
            draft.gateType === "erc721_holding"
              ? { gate_type: draft.gateType, chain_namespace: draft.chainNamespace, contract_address: draft.contractAddress }
              : { gate_type: draft.gateType, required_value: draft.requiredValue },
            { audience: "admin" },
          ),
        )
        .join(", ")
    : null;
  const previewDisplayName = activeDisplayName.trim() || cc.previewFallback;
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
    ? cc.uniqueHumanRequired
    : !creatorAgeRequirementMet
      ? cc.ageVerificationRequired
      : null;

  return (
    <div className="mx-auto w-full max-w-4xl space-y-4">
      <h2 className="text-3xl font-semibold tracking-tight">{cc.title}</h2>
      {creatorVerificationMessage ? (
        <div className="rounded-[var(--radius-lg)] border border-amber-500/20 bg-amber-500/5 px-4 py-3">
          <p className="text-base font-semibold text-foreground">{cc.verificationRequired}</p>
          <FormNote className="mt-1">{creatorVerificationMessage}</FormNote>
        </div>
      ) : null}

      <Stepper currentStep={activeStep} onStepClick={handleStepClick} steps={[
        { label: cc.stepCommunity },
        { label: cc.stepAccess },
        { label: cc.stepReview },
      ]} />

      <Card className="overflow-hidden border-border bg-background shadow-none">
        <CardContent className="space-y-8 p-6 md:p-7">
          {activeStep === 1 ? (
            <Section title={cc.detailsSection}>
              <div className="grid gap-4">
                <div>
                  <FieldLabel label={cc.displayNameLabel} />
                  <Input
                    className="h-12 rounded-[var(--radius-lg)]"
                    onChange={(e) => setActiveDisplayName(e.target.value)}
                    placeholder={cc.displayNamePlaceholder}
                    value={activeDisplayName}
                  />
                </div>

                <div>
                  <FieldLabel label={cc.descriptionLabel} />
                  <Textarea
                    className="min-h-24"
                    onChange={(e) => setActiveDescription(e.target.value)}
                    placeholder={cc.descriptionPlaceholder}
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
                    label={cc.avatarLabel}
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
                    label={cc.bannerLabel}
                    onRemove={() => setActiveBannerFile(null)}
                    onSelect={(file) => {
                      setActiveBannerFile(file);
                      if (file) {
                        setActiveBannerRef("");
                      }
                    }}
                  />
                </div>

                <div className="flex flex-col gap-3 rounded-[var(--radius-lg)] border border-border-soft bg-muted/20 px-4 py-4 md:flex-row md:items-center md:justify-between">
                  <div className="space-y-0.5">
                    <p className="text-base font-semibold text-foreground">{cc.routeLabel}</p>
                    <p className="text-base text-muted-foreground">{namespaceRouteLabel}</p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {onVerifyNamespace ? (
                      <Button onClick={onVerifyNamespace} type="button" variant="secondary">
                        {namespaceAttachment
                          ? cc.changeRoute
                          : hasPendingNamespaceSession
                            ? cc.resumeVerification
                            : cc.verifyRoute}
                      </Button>
                    ) : null}
                    {namespaceAttachment && onClearNamespace ? (
                      <Button onClick={onClearNamespace} type="button" variant="ghost">
                        {cc.clear}
                      </Button>
                    ) : null}
                  </div>
                </div>
              </div>
            </Section>
          ) : null}

          {activeStep === 2 ? (
            <>
              <Section title={cc.membershipSection}>
                <SegmentedControl
                  onChange={(value) => setActiveMembershipMode(value as CommunityMembershipMode)}
                  options={{
                    open: { label: cc.membershipOpenLabel, detail: cc.membershipOpenDetail },
                    request: { label: cc.membershipRequestLabel, detail: cc.membershipRequestDetail },
                    gated: { label: cc.membershipGatedLabel, detail: cc.membershipGatedDetail },
                  }}
                  value={activeMembershipMode}
                />

                {activeMembershipMode === "gated" ? (
                  <div className="space-y-4 rounded-[var(--radius-lg)] border border-border-soft bg-muted/20 px-5 py-4">
                    <FormSectionHeading
                      description={cc.gateChecksDescription}
                      title={cc.gateChecksTitle}
                    />

                    <CheckboxCard
                      checked={nationalityEnabled}
                      description={cc.nationalityDescription}
                      title={cc.nationalityTitle}
                      onCheckedChange={(checked) => {
                        logCreateCommunityGateDebug("toggleNationalityGate", {
                          previous: nationalityEnabled,
                          next: checked,
                        });
                        setNationalityEnabled(checked);
                      }}
                    />

                    {nationalityEnabled ? (
                      <div className="space-y-2">
                        <FieldLabel label={cc.allowedNationalityLabel} />
                        <NationalityPicker
                          onChange={(code) => {
                            logCreateCommunityGateDebug("selectNationality", {
                              previous: nationalityRequiredValue,
                              next: code,
                            });
                            setNationalityRequiredValue(code ?? "");
                          }}
                          value={nationalityRequiredValue || null}
                        />
                        {nationalityRequiredValue.length > 0 && !isCountryCode(nationalityRequiredValue) ? (
                          <FormNote tone="warning">{cc.selectValidCountry}</FormNote>
                        ) : null}
                      </div>
                    ) : null}

                    <CheckboxCard
                      checked={genderEnabled}
                      description={cc.genderDescription}
                      title={cc.genderTitle}
                      onCheckedChange={setGenderEnabled}
                    />

                    {genderEnabled ? (
                      <div className="space-y-3">
                        <SegmentedControl
                          onChange={(value) => setGenderRequiredValue(value as "M" | "F")}
                          options={{
                            F: {
                              label: cc.fMarkerLabel,
                              detail: cc.fMarkerDetail,
                            },
                            M: {
                              label: cc.mMarkerLabel,
                              detail: cc.mMarkerDetail,
                            },
                          }}
                          value={genderRequiredValue}
                        />
                        {getGateDraftWarning("gender") ? (
                          <FormNote tone="warning">{getGateDraftWarning("gender")}</FormNote>
                        ) : null}
                      </div>
                    ) : null}

                    <CheckboxCard
                      checked={erc721Enabled}
                      description={cc.erc721Description}
                      title={cc.erc721Title}
                      onCheckedChange={setErc721Enabled}
                    />

                    {erc721Enabled ? (
                      <div className="space-y-2">
                        <FieldLabel label={cc.collectionContractLabel} />
                        <Input
                          className="h-12 rounded-[var(--radius-lg)]"
                          onChange={(event) => setErc721ContractAddress(event.target.value)}
                          placeholder={cc.collectionContractPlaceholder}
                          value={erc721ContractAddress}
                        />
                        {!isAddress(erc721ContractAddress.trim()) ? (
                          <FormNote tone="warning">{cc.invalidContractAddress}</FormNote>
                        ) : null}
                      </div>
                    ) : null}
                  </div>
                ) : null}
              </Section>

              <Section className="border-t border-border-soft pt-8" title={cc.identityAccessSection}>
                <div className="space-y-5">
                  <CheckboxRow
                    checked={activeAllowAnonymousIdentity}
                    id="community-allow-anonymous-posting"
                    label={cc.allowAnonymousPosting}
                    onCheckedChange={setActiveAllowAnonymousIdentity}
                  />

                  {activeAllowAnonymousIdentity ? (
                    <div className="space-y-3 border-s border-border-soft ps-4">
                      <p className="text-base font-medium text-foreground">{cc.anonymousScopeLabel}</p>
                      <div className="space-y-2">
                        {([
                          { key: "community_stable" as const, label: cc.anonymousCommunityStableLabel, detail: cc.anonymousCommunityStableDetail },
                          { key: "thread_stable" as const, label: cc.anonymousThreadStableLabel, detail: cc.anonymousThreadStableDetail },
                          { key: "post_ephemeral" as const, label: cc.anonymousPostEphemeralLabel, detail: cc.anonymousPostEphemeralDetail, disabledHint: cc.anonymousPostEphemeralDisabled },
                        ]).map((option) => {
                          const disabled = option.key === "post_ephemeral";
                          return (
                            <OptionCard
                              key={option.key}
                              description={option.detail}
                              disabled={disabled}
                              disabledHint={option.disabledHint}
                              selected={option.key === activeAnonymousScope}
                              title={option.label}
                              onClick={() => !disabled && setActiveAnonymousScope(option.key)}
                            />
                          );
                        })}
                      </div>
                    </div>
                  ) : null}

                  <CheckboxRow
                    checked={activeDefaultAgeGatePolicy === "18_plus"}
                    id="community-18-plus"
                    label={cc.ageGateLabel}
                    onCheckedChange={(checked) =>
                      setActiveDefaultAgeGatePolicy(checked ? "18_plus" : "none")
                    }
                  />
                  {activeDefaultAgeGatePolicy === "18_plus" && !creatorAgeOver18Verified ? (
                    <FormNote tone="warning">
                      {cc.creatorAgeRequired}
                    </FormNote>
                  ) : null}
                </div>
              </Section>
            </>
          ) : null}

          {activeStep === 3 ? (
            <CommunityReviewStep
              ageGateLabel={activeDefaultAgeGatePolicy === "18_plus" ? "18+" : cc.none}
              anonymousPostingLabel={activeAllowAnonymousIdentity ? cc.enabled : cc.disabled}
              anonymousScopeLabel={
                activeAllowAnonymousIdentity
                  ? ({
                    community_stable: cc.anonymousCommunityStableLabel,
                    thread_stable: cc.anonymousThreadStableLabel,
                    post_ephemeral: cc.anonymousPostEphemeralLabel,
                  })[activeAnonymousScope]
                  : undefined
              }
              avatarLabel={
                activeAvatarFile?.name ||
                (activeAvatarRef.trim() ? cc.savedImage : cc.generatedDefault)
              }
              bannerLabel={
                activeBannerFile?.name ||
                (activeBannerRef.trim() ? cc.savedImage : cc.generatedDefault)
              }
              copy={cc}
              creatorVerificationMessage={creatorVerificationMessage}
              description={activeDescription}
              displayName={activeDisplayName}
              gateRequirementSummary={gateRequirementSummary}
              membershipLabel={membershipLabel}
              routeLabel={namespaceRouteLabel}
            />
          ) : null}
        </CardContent>

        <CardFooter className="justify-end border-t border-border-soft p-5">
          <div className="flex gap-3">
            {activeStep > 1 ? (
              <Button onClick={handleBack} variant="secondary">
                {cc.back}
              </Button>
            ) : null}
            {activeStep < 3 ? (
              <Button disabled={!canProceed} onClick={handleNext}>
                {cc.next}
              </Button>
            ) : (
              <Button disabled={!canCreateCommunity} loading={submitting} onClick={handleCreate}>{cc.createCommunityAction}</Button>
            )}
          </div>
        </CardFooter>
      </Card>
    </div>
  );
}
