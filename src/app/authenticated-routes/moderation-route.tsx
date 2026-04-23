"use client";

import * as React from "react";
import { isAddress } from "viem";

import { navigate } from "@/app/router";
import { CommunityDonationsEditorPage } from "@/components/compositions/community-donations-editor/community-donations-editor-page";
import { CommunityGatesEditorPage } from "@/components/compositions/community-gates-editor/community-gates-editor-page";
import { CommunityLabelsEditorPage } from "@/components/compositions/community-labels-editor/community-labels-editor-page";
import { CommunityLinksEditorPage, createEmptyCommunityLinkEditorItem } from "@/components/compositions/community-links-editor/community-links-editor-page";
import { CommunityModerationIndexPage as CommunityModerationIndexPageView } from "@/components/compositions/community-moderation-index-page/community-moderation-index-page";
import { CommunityModerationShell } from "@/components/compositions/community-moderation-shell/community-moderation-shell";
import { CommunityProfileEditorPage } from "@/components/compositions/community-profile-editor/community-profile-editor-page";
import { CommunityNamespaceVerificationPage } from "@/components/compositions/community-namespace-verification-page/community-namespace-verification-page";
import { CommunityPricingEditorPage } from "@/components/compositions/community-pricing-editor/community-pricing-editor-page";
import { CommunityRulesEditorPage } from "@/components/compositions/community-rules-editor/community-rules-editor-page";
import { CommunityAgentPolicyPage } from "@/components/compositions/community-agent-policy/community-agent-policy";
import { CommunitySafetyPage } from "@/components/compositions/community-safety-page/community-safety-page";
import { MobilePageHeader } from "@/components/compositions/app-shell-chrome/mobile-page-header";
import type { IdentityGateDraft } from "@/components/compositions/create-community-composer/create-community-composer.types";
import { toast } from "@/components/primitives/sonner";
import { useApi } from "@/lib/api";
import { MOBILE_BREAKPOINT_QUERY } from "@/lib/breakpoints";
import { normalizeCountryCode } from "@/lib/countries";
import { isValidCourtyardInventoryDraft } from "@/lib/courtyard-inventory-gates";

import { CommunityModerationGuard, getCommunityModerationTitle } from "./moderation-data";
import {
  buildCommunityModerationIndexPath,
  buildCommunityModerationSections,
  type CommunityModerationSection,
} from "./moderation-helpers";
import { getRouteFailureDescription } from "./route-status-copy";
import { useCommunityModerationState } from "./moderation-state";
import { useRouteMessages } from "./route-core";
import { FullPageSpinner, RouteLoadFailureState } from "./route-shell";

function useIsModerationMobileLayout() {
  const [isMobileLayout, setIsMobileLayout] = React.useState(() => {
    if (typeof window === "undefined") {
      return false;
    }

    const matchesMobileUserAgent = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(window.navigator.userAgent);
    const userAgentData = (window.navigator as Navigator & {
      userAgentData?: { mobile?: boolean };
    }).userAgentData;

    return window.matchMedia(MOBILE_BREAKPOINT_QUERY).matches && (userAgentData?.mobile === true || matchesMobileUserAgent);
  });

  React.useEffect(() => {
    const mobileWidthQuery = window.matchMedia(MOBILE_BREAKPOINT_QUERY);

    const isMobileUserAgent = () => {
      const userAgentData = (window.navigator as Navigator & {
        userAgentData?: { mobile?: boolean };
      }).userAgentData;
      const matchesMobileUserAgent = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(window.navigator.userAgent);

      if (userAgentData?.mobile === true) {
        return true;
      }

      return matchesMobileUserAgent;
    };

    const update = () => {
      setIsMobileLayout(mobileWidthQuery.matches && isMobileUserAgent());
    };

    mobileWidthQuery.addEventListener("change", update);
    update();

    return () => {
      mobileWidthQuery.removeEventListener("change", update);
    };
  }, []);

  return isMobileLayout;
}

function getNationalityGateCountryCodes(gateDrafts: IdentityGateDraft[]): string[] {
  const countryCodes = new Set<string>();
  for (const draft of gateDrafts) {
    if (draft.gateType !== "nationality") {
      continue;
    }
    for (const value of draft.requiredValues) {
      const normalized = normalizeCountryCode(value);
      if (normalized) {
        countryCodes.add(normalized.alpha2);
      }
    }
  }
  return Array.from(countryCodes);
}

function MobileModerationSectionLayout({
  children,
  communityId,
  title,
}: {
  children: React.ReactNode;
  communityId: string;
  title: string;
}) {
  return (
    <div className="min-h-screen w-full bg-background text-foreground">
      <MobilePageHeader onBackClick={() => navigate(buildCommunityModerationIndexPath(communityId))} title={title} />
      <section className="flex min-w-0 flex-1 flex-col gap-4 px-4 py-4 pt-[calc(env(safe-area-inset-top)+5rem)] md:px-6 md:py-6">
        <div className="min-w-0">{children}</div>
      </section>
    </div>
  );
}

export function CommunityModerationIndexPage({
  communityId,
}: {
  communityId: string;
}) {
  const isMobile = useIsModerationMobileLayout();
  const state = useCommunityModerationState(communityId);
  const { copy } = useRouteMessages();
  const sections = buildCommunityModerationSections(null, communityId, copy.moderation);
  const blocked = CommunityModerationGuard({
    community: state.community,
    error: state.error,
    loading: state.loading,
    session: state.session,
    showInlineTitle: !isMobile,
    title: copy.moderation.index.title,
  });
  const content = blocked ?? (
    <CommunityModerationIndexPageView
      mobileLayout={isMobile}
      onBackClick={isMobile ? undefined : () => navigate(`/c/${communityId}`)}
      sections={sections}
      showTitle={!isMobile}
    />
  );

  if (isMobile) {
    return (
      <div className="min-h-screen w-full bg-background text-foreground">
        <MobilePageHeader onBackClick={() => navigate(`/c/${communityId}`)} title={copy.moderation.index.title} />
        <section className="flex min-w-0 flex-1 flex-col py-4 pt-[calc(env(safe-area-inset-top)+5rem)]">
          <div className="min-w-0">
            {content}
          </div>
        </section>
      </div>
    );
  }

  return (
    <CommunityModerationShell
      communityAvatarSrc={state.community?.avatar_ref ?? undefined}
      communityLabel={state.community ? `r/${state.community.display_name}` : copy.moderation.shell.communityLabelFallback}
      onExitClick={() => navigate(`/c/${communityId}`)}
      sections={sections}
    >
      {content}
    </CommunityModerationShell>
  );
}

export function CommunityModerationPage({
  communityId,
  section,
}: {
  communityId: string;
  section: CommunityModerationSection;
}) {
  const api = useApi();
  const isMobile = useIsModerationMobileLayout();
  const state = useCommunityModerationState(communityId);
  const { copy } = useRouteMessages();
  const pricingLocalCountryCodes = React.useMemo(
    () => getNationalityGateCountryCodes(state.gateDrafts),
    [state.gateDrafts],
  );
  const applyPricingStarterTemplate = () => {
    state.applyStarterPricingTemplate({ localCountryCodes: pricingLocalCountryCodes });
  };
  const title = getCommunityModerationTitle(section, copy.moderation);
  const moderationIndexPath = buildCommunityModerationIndexPath(communityId);
  const blocked = CommunityModerationGuard({
    community: state.community,
    error: state.error,
    loading: state.loading,
    session: state.session,
    showInlineTitle: !isMobile,
    title,
  });

  let content = blocked;

  if (!content && state.community) {
    if (section === "profile") {
      content = (
        <CommunityProfileEditorPage
          avatarSrc={state.profileAvatarRemoved ? undefined : (state.community.avatar_ref ?? undefined)}
          bannerSrc={state.profileBannerRemoved ? undefined : (state.community.banner_ref ?? undefined)}
          description={state.profileDescription}
          displayName={state.profileDisplayName}
          displayNameError={state.profileDisplayNameError}
          onAvatarRemove={() => {
            state.setProfileAvatarFile(null);
            state.setProfileAvatarRemoved(true);
          }}
          onAvatarSelect={(file) => {
            state.setProfileAvatarFile(file);
            if (file) {
              state.setProfileAvatarRemoved(false);
            }
          }}
          onBackClick={isMobile ? () => navigate(moderationIndexPath) : undefined}
          onBannerRemove={() => {
            state.setProfileBannerFile(null);
            state.setProfileBannerRemoved(true);
          }}
          onBannerSelect={(file) => {
            state.setProfileBannerFile(file);
            if (file) {
              state.setProfileBannerRemoved(false);
            }
          }}
          onDescriptionChange={state.setProfileDescription}
          onDisplayNameChange={state.setProfileDisplayName}
          onSave={state.handleSaveProfile}
          pendingAvatarLabel={state.profileAvatarFile?.name}
          pendingBannerLabel={state.profileBannerFile?.name}
          saveDisabled={state.savingProfile || !state.profileHasChanges}
          saveLoading={state.savingProfile}
        />
      );
    } else if (section === "rules") {
      content = (
        <CommunityRulesEditorPage
          description={state.description}
          onBackClick={() => navigate(moderationIndexPath)}
          onDescriptionChange={state.setDescription}
          onReportReasonChange={state.setReportReason}
          onRuleNameChange={state.setRuleName}
          onSave={state.handleSaveRules}
          reportReason={state.reportReason}
          ruleName={state.ruleName}
          saveDisabled={!state.ruleName.trim() || !state.description.trim() || state.savingRules}
          saveLoading={state.savingRules}
        />
      );
    } else if (section === "links") {
      content = (
        <CommunityLinksEditorPage
          links={state.links}
          onAddLink={() => state.setLinks((current) => [...current, createEmptyCommunityLinkEditorItem()])}
          onLinkChange={(id, patch) => {
            state.setLinks((current) => current.map((link) => link.id === id ? { ...link, ...patch } : link));
          }}
          onRemoveLink={(id) => {
            state.setLinks((current) => current.filter((link) => link.id !== id));
          }}
          onSave={state.handleSaveLinks}
          saveDisabled={state.savingLinks || state.links.some((link) => !link.url.trim())}
          saveLoading={state.savingLinks}
        />
      );
    } else if (section === "labels") {
      content = (
        <CommunityLabelsEditorPage
          labels={state.labels}
          labelsEnabled={state.labelsEnabled}
          onLabelsChange={state.setLabels}
          onLabelsEnabledChange={state.setLabelsEnabled}
          onSave={state.handleSaveLabels}
          saveDisabled={state.savingLabels || state.labelsValidationError != null}
          saveLoading={state.savingLabels}
        />
      );
    } else if (section === "pricing") {
      content = state.pricingPolicyLoading
        ? (
          <FullPageSpinner />
        )
        : state.pricingPolicyError
          ? (
            <RouteLoadFailureState
              description={state.pricingPolicyError instanceof Error
                ? state.pricingPolicyError.message
                : getRouteFailureDescription("moderation")}
              title="Pricing"
            />
          )
          : (
            <CommunityPricingEditorPage
              countryAssignments={state.countryAssignments}
              defaultTierKey={state.defaultTierKey}
              onCountryAssignmentsChange={state.setCountryAssignments}
              onDefaultTierKeyChange={state.setDefaultTierKey}
              onRegionalPricingEnabledChange={(value) => {
                state.setRegionalPricingEnabled(value);
                if (!value) {
                  return;
                }
                if (state.pricingTiers.length === 0 && state.countryAssignments.length === 0 && !state.defaultTierKey) {
                  applyPricingStarterTemplate();
                  return;
                }
                if (!state.verificationProviderRequirement) {
                  state.setVerificationProviderRequirement("self");
                }
              }}
              onSave={state.handleSavePricing}
              onTiersChange={state.setPricingTiers}
              onUseStarterTemplate={applyPricingStarterTemplate}
              regionalPricingEnabled={state.regionalPricingEnabled}
              saveDisabled={state.savingPricing || state.pricingValidationError != null}
              saveLoading={state.savingPricing}
              saveNote={state.pricingValidationError}
              tiers={state.pricingTiers}
            />
          );
    } else if (section === "donations") {
      content = (
        <CommunityDonationsEditorPage
          endaomentUrl={state.endaomentUrl}
          onClearPartner={() => {
            state.setPartnerPreview(null);
            state.setEndaomentUrl("");
            state.setResolveError(null);
            state.setDonationMode("none");
          }}
          onEndaomentUrlChange={(value) => {
            state.setEndaomentUrl(value);
            state.setPartnerPreview(null);
            state.setResolveError(null);
          }}
          onResolve={state.handleResolveDonationPartner}
          onSave={state.handleSaveDonations}
          partnerPreview={state.partnerPreview}
          resolveError={state.resolveError}
          resolving={state.resolvingDonationPartner}
          saveDisabled={state.savingDonations || (state.endaomentUrl.trim().length > 0 && !state.partnerPreview)}
          saveLoading={state.savingDonations}
        />
      );
    } else if (section === "gates") {
      content = (
        <CommunityGatesEditorPage
          allowAnonymousIdentity={state.allowAnonymousIdentity}
          anonymousIdentityScope={state.anonymousIdentityScope}
          defaultAgeGatePolicy={state.defaultAgeGatePolicy}
          gateDrafts={state.gateDrafts}
          membershipMode={state.membershipMode}
          onAllowAnonymousIdentityChange={state.setAllowAnonymousIdentity}
          onAnonymousIdentityScopeChange={state.setAnonymousIdentityScope}
          onBackClick={() => navigate(moderationIndexPath)}
          onDefaultAgeGatePolicyChange={state.setDefaultAgeGatePolicy}
          onGateDraftsChange={state.setGateDrafts}
          onMembershipModeChange={state.setMembershipMode}
          onSave={state.handleSaveGates}
          saveDisabled={
            state.savingGates
            || (state.membershipMode === "gated" && state.gateDrafts.length === 0 && state.preservedGateRuleCount === 0)
            || state.gateDrafts.some((draft) => (
              draft.gateType === "erc721_holding" && !isAddress(draft.contractAddress.trim())
              || draft.gateType === "erc721_inventory_match" && !isValidCourtyardInventoryDraft(draft)
              || draft.gateType === "wallet_score" && (!Number.isFinite(draft.minimumScore) || draft.minimumScore < 0 || draft.minimumScore > 100)
            ))
          }
          showSaveAction
        />
      );
    } else if (section === "safety") {
      content = (
        <CommunitySafetyPage
          adultContentPolicy={state.adultContentPolicy}
          civilityPolicy={state.civilityPolicy}
          graphicContentPolicy={state.graphicContentPolicy}
          onAdultContentPolicyChange={state.setAdultContentPolicy}
          onBackClick={() => navigate(moderationIndexPath)}
          onCivilityPolicyChange={state.setCivilityPolicy}
          onGraphicContentPolicyChange={state.setGraphicContentPolicy}
          onProviderSettingsChange={state.setProviderSettings}
          onSave={state.handleSaveSafety}
          providerSettings={state.providerSettings}
          saveDisabled={state.savingSafety}
          saveLoading={state.savingSafety}
        />
      );
    } else if (section === "agents") {
      content = (
        <CommunityAgentPolicyPage
          onSave={state.handleSaveAgents}
          onSettingsChange={state.setAgentSettings}
          saveDisabled={state.savingAgents}
          settings={state.agentSettings}
          submitState={state.agentSubmitState}
        />
      );
    } else {
      content = (
        <CommunityNamespaceVerificationPage
          activeSessionId={state.effectiveNamespaceSessionId}
          callbacks={state.namespaceVerificationCallbacks}
          initialRootLabel={state.community.route_slug ?? ""}
          onBackClick={() => navigate(moderationIndexPath)}
          onSessionCleared={() => {
            state.setActiveNamespaceSessionId(null);
            state.setCommunity((current) => current ? { ...current, pending_namespace_verification_session_id: null } : current);
            void api.communities.setPendingNamespaceSession(communityId, null)
              .then((updatedCommunity) => {
                state.setCommunity(updatedCommunity);
              })
              .catch(() => {
                toast.error("Could not clear the saved namespace verification.");
              });
          }}
          onSessionStarted={state.setActiveNamespaceSessionId}
        />
      );
    }
  }

  if (isMobile) {
    return (
      <MobileModerationSectionLayout communityId={communityId} title={title}>
        {content}
      </MobileModerationSectionLayout>
    );
  }

  return (
    <CommunityModerationShell
      communityAvatarSrc={state.community?.avatar_ref ?? undefined}
      communityLabel={state.community ? `r/${state.community.display_name}` : copy.moderation.shell.communityLabelFallback}
      onExitClick={() => navigate(`/c/${communityId}`)}
      sections={buildCommunityModerationSections(section, communityId, copy.moderation)}
    >
      {content}
    </CommunityModerationShell>
  );
}
