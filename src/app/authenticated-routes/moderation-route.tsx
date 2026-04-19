"use client";

import { navigate } from "@/app/router";
import {
  CommunityDonationsEditorPage,
} from "@/components/compositions/community-donations-editor/community-donations-editor-page";
import {
  CommunityLinksEditorPage,
  createEmptyCommunityLinkEditorItem,
} from "@/components/compositions/community-links-editor/community-links-editor-page";
import { CommunityModerationShell } from "@/components/compositions/community-moderation-shell/community-moderation-shell";
import { CommunityPricingEditorPage } from "@/components/compositions/community-pricing-editor/community-pricing-editor-page";
import { CommunityGatesEditorPage } from "@/components/compositions/community-gates-editor/community-gates-editor-page";
import { CommunityNamespaceVerificationPage } from "@/components/compositions/community-namespace-verification-page/community-namespace-verification-page";
import { CommunityRulesEditorPage } from "@/components/compositions/community-rules-editor/community-rules-editor-page";
import { CommunitySafetyPage } from "@/components/compositions/community-safety-page/community-safety-page";
import { toast } from "@/components/primitives/sonner";
import { useApi } from "@/lib/api";

import { CommunityModerationGuard, getCommunityModerationTitle } from "./moderation-data";
import { buildCommunityModerationSections, type CommunityModerationSection } from "./moderation-helpers";
import { getRouteFailureDescription } from "./route-status-copy";
import { useCommunityModerationState } from "./moderation-state";
import { FullPageSpinner, RouteLoadFailureState } from "./route-shell";

export function CommunityModerationPage({
  communityId,
  section,
}: {
  communityId: string;
  section: CommunityModerationSection;
}) {
  const api = useApi();
  const state = useCommunityModerationState(communityId);
  const title = getCommunityModerationTitle(section);
  const blocked = CommunityModerationGuard({
    community: state.community,
    error: state.error,
    loading: state.loading,
    session: state.session,
    title,
  });

  let content = blocked;

  if (!content && state.community) {
    if (section === "rules") {
      content = (
        <CommunityRulesEditorPage
          description={state.description}
          onBackClick={() => navigate(`/c/${communityId}`)}
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
                  state.applyStarterPricingTemplate();
                  return;
                }
                if (!state.verificationProviderRequirement) {
                  state.setVerificationProviderRequirement("self");
                }
              }}
              onSave={state.handleSavePricing}
              onTiersChange={state.setPricingTiers}
              onUseStarterTemplate={state.applyStarterPricingTemplate}
              onVerificationProviderRequirementChange={state.setVerificationProviderRequirement}
              regionalPricingEnabled={state.regionalPricingEnabled}
              saveDisabled={state.savingPricing || state.pricingValidationError != null}
              saveLoading={state.savingPricing}
              saveNote={state.pricingValidationError}
              tiers={state.pricingTiers}
              verificationProviderRequirement={state.verificationProviderRequirement}
            />
          );
    } else if (section === "donations") {
      content = (
        <CommunityDonationsEditorPage
          donationMode={state.donationMode}
          endaomentUrl={state.endaomentUrl}
          onClearPartner={() => {
            state.setPartnerPreview(null);
            state.setEndaomentUrl("");
            state.setResolveError(null);
            state.setDonationMode("none");
          }}
          onDonationModeChange={(value) => {
            state.setDonationMode(value);
            if (value === "none") {
              state.setResolveError(null);
            }
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
          saveDisabled={state.savingDonations || (state.donationMode !== "none" && !state.partnerPreview)}
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
          onBackClick={() => navigate(`/c/${communityId}`)}
          onDefaultAgeGatePolicyChange={state.setDefaultAgeGatePolicy}
          onGateDraftsChange={state.setGateDrafts}
          onMembershipModeChange={state.setMembershipMode}
          onSave={state.handleSaveGates}
          saveDisabled={state.savingGates || (state.membershipMode === "gated" && state.gateDrafts.length === 0)}
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
          onBackClick={() => navigate(`/c/${communityId}`)}
          onCivilityPolicyChange={state.setCivilityPolicy}
          onGraphicContentPolicyChange={state.setGraphicContentPolicy}
          onProviderSettingsChange={state.setProviderSettings}
          onSave={state.handleSaveSafety}
          providerSettings={state.providerSettings}
          saveDisabled={state.savingSafety}
          saveLoading={state.savingSafety}
        />
      );
    } else {
      content = (
        <CommunityNamespaceVerificationPage
          activeSessionId={state.effectiveNamespaceSessionId}
          callbacks={state.namespaceVerificationCallbacks}
          initialRootLabel={state.community.route_slug ?? ""}
          onBackClick={() => navigate(`/c/${communityId}`)}
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

  return (
    <CommunityModerationShell
      communityAvatarSrc={state.community?.avatar_ref ?? undefined}
      communityLabel={state.community ? `r/${state.community.display_name}` : "Moderator tools"}
      onExitClick={() => navigate(`/c/${communityId}`)}
      sections={buildCommunityModerationSections(section, communityId)}
    >
      {content}
    </CommunityModerationShell>
  );
}
