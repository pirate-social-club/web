"use client";

import * as React from "react";

import { Button } from "@/components/primitives/button";
import { Card, CardContent, CardFooter } from "@/components/primitives/card";
import { toast } from "@/components/primitives/sonner";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/primitives/tabs";
import { loadCommunitySettingsState } from "@/lib/community-settings-loader";
import {
  buildCommunityGateRuleSaveRequests,
  hasCommunitySettingsGateRuleErrors,
  isTabDirty,
  mapSettingsToCommunityPatch,
  mapSettingsToFlairPatch,
  mapSettingsToProfilePatch,
  mapApiFlairPolicyToSettings,
  mapApiGateRuleToSettings,
  validateCommunitySettingsGateRules,
  type CommunitySettingsLoadedState,
} from "@/lib/community-settings-mappers";
import {
  listCommunityGateRules,
  updateCommunity,
  updateCommunityFlairPolicy,
  updateCommunityProfile,
  upsertCommunityGateRule,
} from "@/lib/pirate-api";
import { cn } from "@/lib/utils";

import { CommunitySettingsAbout } from "./community-settings-about";
import { CommunitySettingsAccess } from "./community-settings-access";
import { CommunitySettingsLinks } from "./community-settings-links";
import { CommunitySettingsModeration } from "./community-settings-moderation";
import { CommunitySettingsPosting } from "./community-settings-posting";
import { CommunitySettingsRules } from "./community-settings-rules";
import type {
  AgeGatePolicy,
  AnonymousIdentityScope,
  CommunityMembershipMode,
  CommunitySettingsFlairPolicy,
  CommunitySettingsGateRule,
  CommunitySettingsModerationPolicy,
  CommunitySettingsProps,
  CommunitySettingsReferenceLink,
  CommunitySettingsResourceLink,
  CommunitySettingsRule,
} from "./community-settings.types";

const tabs = [
  { value: "about", label: "About" },
  { value: "rules", label: "Rules" },
  { value: "links", label: "Links" },
  { value: "access", label: "Access" },
  { value: "posting", label: "Posting" },
  { value: "moderation", label: "Moderation" },
] as const;

type TabValue = (typeof tabs)[number]["value"];

function buildLocalSettingsState(input: CommunitySettingsProps): CommunitySettingsLoadedState {
  return {
    displayName: input.displayName ?? "",
    description: input.description ?? "",
    membershipMode: input.membershipMode ?? "open",
    defaultAgeGatePolicy: input.defaultAgeGatePolicy ?? "none",
    allowAnonymousIdentity: input.allowAnonymousIdentity ?? false,
    anonymousIdentityScope: input.anonymousIdentityScope ?? "community_stable",
    rules: input.rules ?? [],
    resourceLinks: input.resourceLinks ?? [],
    referenceLinks: input.referenceLinks ?? [],
    flairPolicy: input.flairPolicy ?? null,
    gateRules: input.gateRules ?? [],
  };
}

export function CommunitySettings({
  accessToken,
  className,
  communityId,
  displayName = "",
  description = "",
  membershipMode = "open",
  defaultAgeGatePolicy = "none",
  allowAnonymousIdentity = false,
  anonymousIdentityScope = "community_stable",
  rules = [],
  resourceLinks = [],
  referenceLinks = [],
  flairPolicy = null,
  gateRules = [],
  moderationPolicy,
  readOnly = false,
}: CommunitySettingsProps) {
  const localFallbackState = React.useMemo(
    () =>
      buildLocalSettingsState({
        displayName,
        description,
        membershipMode,
        defaultAgeGatePolicy,
        allowAnonymousIdentity,
        anonymousIdentityScope,
        rules,
        resourceLinks,
        referenceLinks,
        flairPolicy,
        gateRules,
      }),
    [
      allowAnonymousIdentity,
      anonymousIdentityScope,
      defaultAgeGatePolicy,
      description,
      displayName,
      flairPolicy,
      gateRules,
      membershipMode,
      referenceLinks,
      resourceLinks,
      rules,
    ],
  );
  const liveMode = Boolean(communityId);
  const [activeTab, setActiveTab] = React.useState<TabValue>("about");
  const [loading, setLoading] = React.useState(liveMode);
  const [loadingError, setLoadingError] = React.useState<string | null>(null);
  const [savingTab, setSavingTab] = React.useState<TabValue | null>(null);
  const [tabErrors, setTabErrors] = React.useState<Partial<Record<TabValue, string>>>({});
  const [gateRuleErrors, setGateRuleErrors] = React.useState<Record<string, string[]>>({});
  const [initialState, setInitialState] =
    React.useState<CommunitySettingsLoadedState>(localFallbackState);

  const [formDisplayName, setFormDisplayName] = React.useState(localFallbackState.displayName);
  const [formDescription, setFormDescription] = React.useState(localFallbackState.description);
  const [formMembershipMode, setFormMembershipMode] =
    React.useState<CommunityMembershipMode>(localFallbackState.membershipMode);
  const [formAgeGate, setFormAgeGate] =
    React.useState<AgeGatePolicy>(localFallbackState.defaultAgeGatePolicy);
  const [formAnonIdentity, setFormAnonIdentity] =
    React.useState(localFallbackState.allowAnonymousIdentity);
  const [formAnonScope, setFormAnonScope] =
    React.useState<AnonymousIdentityScope>(localFallbackState.anonymousIdentityScope);
  const [formRules, setFormRules] =
    React.useState<CommunitySettingsRule[]>(localFallbackState.rules);
  const [formResourceLinks, setFormResourceLinks] =
    React.useState<CommunitySettingsResourceLink[]>(localFallbackState.resourceLinks);
  const [formReferenceLinks, setFormReferenceLinks] =
    React.useState<CommunitySettingsReferenceLink[]>(localFallbackState.referenceLinks);
  const [formFlairPolicy, setFormFlairPolicy] =
    React.useState<CommunitySettingsFlairPolicy | null>(localFallbackState.flairPolicy);
  const [formGateRules, setFormGateRules] =
    React.useState<CommunitySettingsGateRule[]>(localFallbackState.gateRules);
  const [formModerationPolicy, setFormModerationPolicy] =
    React.useState<CommunitySettingsModerationPolicy | undefined>(moderationPolicy);

  const applyLoadedState = React.useCallback((next: CommunitySettingsLoadedState) => {
    setInitialState(next);
    setFormDisplayName(next.displayName);
    setFormDescription(next.description);
    setFormMembershipMode(next.membershipMode);
    setFormAgeGate(next.defaultAgeGatePolicy);
    setFormAnonIdentity(next.allowAnonymousIdentity);
    setFormAnonScope(next.anonymousIdentityScope);
    setFormRules(next.rules);
    setFormResourceLinks(next.resourceLinks);
    setFormReferenceLinks(next.referenceLinks);
    setFormFlairPolicy(next.flairPolicy);
    setFormGateRules(next.gateRules);
    setGateRuleErrors({});
  }, []);

  React.useEffect(() => {
    if (!communityId) {
      setLoading(false);
      setLoadingError(null);
      applyLoadedState(localFallbackState);
      return;
    }

    const controller = new AbortController();
    setLoading(true);
    setLoadingError(null);

    void loadCommunitySettingsState({
      communityId,
      accessToken,
      signal: controller.signal,
    }).then(
      (next) => {
        if (controller.signal.aborted) {
          return;
        }
        applyLoadedState(next);
        setLoading(false);
      },
      (error: unknown) => {
        if (controller.signal.aborted) {
          return;
        }
        setLoading(false);
        setLoadingError(error instanceof Error ? error.message : "Unable to load settings.");
      },
    );

    return () => controller.abort();
  }, [accessToken, applyLoadedState, communityId, localFallbackState]);

  React.useEffect(() => {
    if (Object.keys(gateRuleErrors).length === 0) {
      return;
    }
    setGateRuleErrors(validateCommunitySettingsGateRules(formGateRules));
  }, [formGateRules, gateRuleErrors]);

  React.useEffect(() => {
    setFormModerationPolicy(moderationPolicy);
  }, [moderationPolicy]);

  const aboutDraft = {
    displayName: formDisplayName,
    description: formDescription,
    membershipMode: formMembershipMode,
    defaultAgeGatePolicy: formAgeGate,
    allowAnonymousIdentity: formAnonIdentity,
    anonymousIdentityScope: formAnonScope,
  };
  const initialAbout = {
    displayName: initialState.displayName,
    description: initialState.description,
    membershipMode: initialState.membershipMode,
    defaultAgeGatePolicy: initialState.defaultAgeGatePolicy,
    allowAnonymousIdentity: initialState.allowAnonymousIdentity,
    anonymousIdentityScope: initialState.anonymousIdentityScope,
  };

  const aboutDirty = isTabDirty(
    mapSettingsToCommunityPatch(aboutDraft),
    mapSettingsToCommunityPatch(initialAbout),
  );
  const rulesDirty = isTabDirty(formRules, initialState.rules);
  const linksDirty = isTabDirty(formResourceLinks, initialState.resourceLinks);
  const accessSaveRequests = React.useMemo(
    () =>
      buildCommunityGateRuleSaveRequests({
        initialRules: initialState.gateRules,
        currentRules: formGateRules,
      }),
    [formGateRules, initialState.gateRules],
  );
  const accessDirty = accessSaveRequests.length > 0;
  const postingDirty = isTabDirty(
    mapSettingsToFlairPatch(formFlairPolicy),
    mapSettingsToFlairPatch(initialState.flairPolicy),
  );

  const tabDirty: Record<TabValue, boolean> = {
    about: aboutDirty,
    rules: rulesDirty,
    links: linksDirty,
    access: accessDirty,
    posting: postingDirty,
    moderation: false,
  };

  const tabError = tabErrors[activeTab] ?? null;
  const showFooter = liveMode && (!readOnly || loadingError || tabError || tabDirty[activeTab]);

  async function refreshGateRules() {
    if (!communityId) {
      return;
    }
    const response = await listCommunityGateRules({
      communityId,
      accessToken,
    });
    const nextGateRules = response.gate_rules.map((rule, index) => mapApiGateRuleToSettings(rule, index));
    setInitialState((current) => ({
      ...current,
      gateRules: nextGateRules,
    }));
    setFormGateRules(nextGateRules);
  }

  async function handleSaveAbout() {
    if (!communityId) {
      return;
    }
    const updated = await updateCommunity({
      communityId,
      accessToken,
      body: mapSettingsToCommunityPatch(aboutDraft),
    });
    setInitialState((current) => ({
      ...current,
      displayName: current.displayName,
      description: updated.description ?? "",
      membershipMode: updated.membership_mode === "open" ? "open" : "gated",
      defaultAgeGatePolicy: updated.default_age_gate_policy === "18_plus" ? "18_plus" : "none",
      allowAnonymousIdentity: updated.allow_anonymous_identity ?? false,
      anonymousIdentityScope: updated.anonymous_identity_scope === "thread_stable"
        ? "thread_stable"
        : "community_stable",
    }));
    setFormDescription(updated.description ?? "");
    setFormMembershipMode(updated.membership_mode === "open" ? "open" : "gated");
    setFormAgeGate(updated.default_age_gate_policy === "18_plus" ? "18_plus" : "none");
    setFormAnonIdentity(updated.allow_anonymous_identity ?? false);
    setFormAnonScope(
      updated.anonymous_identity_scope === "thread_stable"
        ? "thread_stable"
        : "community_stable",
    );
  }

  async function handleSaveProfile() {
    if (!communityId) {
      return;
    }
    const updated = await updateCommunityProfile({
      communityId,
      accessToken,
      body: mapSettingsToProfilePatch({
        rules: formRules,
        resourceLinks: formResourceLinks,
      }),
    });
    setInitialState((current) => ({
      ...current,
      rules: updated.rules.map((rule) => ({
        ruleId: rule.rule_id,
        title: rule.title,
        body: rule.body,
        position: rule.position,
        status: rule.status,
      })),
      resourceLinks: updated.resource_links.map((link) => ({
        resourceLinkId: link.resource_link_id,
        label: link.label,
        url: link.url,
        resourceKind: link.resource_kind,
        position: link.position,
        status: link.status,
      })),
    }));
    setFormRules(updated.rules.map((rule) => ({
      ruleId: rule.rule_id,
      title: rule.title,
      body: rule.body,
      position: rule.position,
      status: rule.status,
    })));
    setFormResourceLinks(updated.resource_links.map((link) => ({
      resourceLinkId: link.resource_link_id,
      label: link.label,
      url: link.url,
      resourceKind: link.resource_kind,
      position: link.position,
      status: link.status,
    })));
  }

  async function handleSaveAccess() {
    if (!communityId) {
      return;
    }
    const validationErrors = validateCommunitySettingsGateRules(formGateRules);
    setGateRuleErrors(validationErrors);
    if (hasCommunitySettingsGateRuleErrors(validationErrors)) {
      throw new Error("Fix the highlighted gates.");
    }

    for (const request of accessSaveRequests) {
      await upsertCommunityGateRule({
        communityId,
        accessToken,
        body: request,
      });
    }

    await refreshGateRules();
  }

  async function handleSavePosting() {
    if (!communityId) {
      return;
    }
    const updated = await updateCommunityFlairPolicy({
      communityId,
      accessToken,
      body: mapSettingsToFlairPatch(formFlairPolicy),
    });
    const nextPolicy = mapApiFlairPolicyToSettings(updated);
    setInitialState((current) => ({
      ...current,
      flairPolicy: nextPolicy,
    }));
    setFormFlairPolicy(nextPolicy);
  }

  async function handleSaveActiveTab() {
    if (!communityId) {
      return;
    }

    setSavingTab(activeTab);
    setTabErrors((current) => ({ ...current, [activeTab]: undefined }));

    try {
      switch (activeTab) {
        case "about":
          await handleSaveAbout();
          break;
        case "rules":
        case "links":
          await handleSaveProfile();
          break;
        case "access":
          await handleSaveAccess();
          break;
        case "posting":
          await handleSavePosting();
          break;
        case "moderation":
          break;
      }
      toast("Saved");
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unable to save changes.";
      setTabErrors((current) => ({ ...current, [activeTab]: message }));
      toast("Save failed");
    } finally {
      setSavingTab(null);
    }
  }

  function handleResetActiveTab() {
    setTabErrors((current) => ({ ...current, [activeTab]: undefined }));
    setGateRuleErrors({});

    switch (activeTab) {
      case "about":
        setFormDisplayName(initialState.displayName);
        setFormDescription(initialState.description);
        setFormMembershipMode(initialState.membershipMode);
        setFormAgeGate(initialState.defaultAgeGatePolicy);
        setFormAnonIdentity(initialState.allowAnonymousIdentity);
        setFormAnonScope(initialState.anonymousIdentityScope);
        break;
      case "rules":
        setFormRules(initialState.rules);
        break;
      case "links":
        setFormResourceLinks(initialState.resourceLinks);
        break;
      case "access":
        setFormGateRules(initialState.gateRules);
        break;
      case "posting":
        setFormFlairPolicy(initialState.flairPolicy);
        break;
      case "moderation":
        setFormModerationPolicy(moderationPolicy);
        break;
    }
  }

  return (
    <div className={cn("mx-auto w-full max-w-4xl space-y-4", className)}>
      <h2 className="text-3xl font-semibold tracking-tight">
        Community settings
      </h2>

      <Card className="overflow-hidden border-border bg-background shadow-none">
        <CardContent className="p-6 md:p-7">
          <Tabs onValueChange={(value) => setActiveTab(value as TabValue)} value={activeTab}>
            <TabsList>
              {tabs
                .filter((tab) => tab.value !== "moderation" || formModerationPolicy)
                .map((tab) => (
                  <TabsTrigger key={tab.value} value={tab.value}>
                    {tab.label}
                  </TabsTrigger>
                ))}
            </TabsList>

            <TabsContent value="about">
              <CommunitySettingsAbout
                anonymousIdentityScope={formAnonScope}
                allowAnonymousIdentity={formAnonIdentity}
                defaultAgeGatePolicy={formAgeGate}
                description={formDescription}
                displayName={formDisplayName}
                displayNameReadOnly={liveMode}
                membershipMode={formMembershipMode}
                readOnly={readOnly || loading}
                onAllowAnonymousIdentityChange={setFormAnonIdentity}
                onAnonymousIdentityScopeChange={setFormAnonScope}
                onDefaultAgeGatePolicyChange={setFormAgeGate}
                onDescriptionChange={setFormDescription}
                onDisplayNameChange={setFormDisplayName}
                onMembershipModeChange={setFormMembershipMode}
              />
            </TabsContent>

            <TabsContent value="rules">
              <CommunitySettingsRules
                readOnly={readOnly || loading}
                rules={formRules}
                onRulesChange={setFormRules}
              />
            </TabsContent>

            <TabsContent value="links">
              <CommunitySettingsLinks
                readOnly={readOnly || loading}
                referenceLinks={formReferenceLinks}
                resourceLinks={formResourceLinks}
                onResourceLinksChange={setFormResourceLinks}
              />
            </TabsContent>

            <TabsContent value="access">
              <CommunitySettingsAccess
                gateRuleErrors={gateRuleErrors}
                gateRules={formGateRules}
                readOnly={readOnly || loading}
                onGateRulesChange={setFormGateRules}
              />
            </TabsContent>

            <TabsContent value="posting">
              <CommunitySettingsPosting
                flairPolicy={formFlairPolicy}
                readOnly={readOnly || loading}
                onFlairPolicyChange={setFormFlairPolicy}
              />
            </TabsContent>

            {formModerationPolicy ? (
              <TabsContent value="moderation">
                <CommunitySettingsModeration
                  policy={formModerationPolicy}
                  readOnly={readOnly || loading}
                  onPolicyChange={setFormModerationPolicy}
                />
              </TabsContent>
            ) : null}
          </Tabs>
        </CardContent>

        {showFooter ? (
          <CardFooter className="flex flex-col items-stretch gap-3 border-t border-border-soft p-6 md:flex-row md:items-center md:justify-between">
            <div className="min-h-6 text-base text-destructive">
              {loadingError ?? tabError}
            </div>
            {!readOnly ? (
              <div className="flex items-center gap-3 self-end">
                <Button
                  disabled={!tabDirty[activeTab] || savingTab === activeTab}
                  variant="ghost"
                  onClick={handleResetActiveTab}
                >
                  Reset
                </Button>
                <Button
                  disabled={!tabDirty[activeTab] || loading}
                  loading={savingTab === activeTab}
                  onClick={() => void handleSaveActiveTab()}
                >
                  Save
                </Button>
              </div>
            ) : null}
          </CardFooter>
        ) : null}
      </Card>
    </div>
  );
}
