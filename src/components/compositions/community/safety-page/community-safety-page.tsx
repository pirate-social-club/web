"use client";

import * as React from "react";

import { CommunityModerationSaveFooter } from "@/components/compositions/community/moderation-shell/community-moderation-save-footer";
import { Checkbox } from "@/components/primitives/checkbox";
import { FormNote } from "@/components/primitives/form-layout";
import { Label } from "@/components/primitives/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/primitives/select";
import { cn } from "@/lib/utils";
import { defaultRouteCopy } from "../../system/route-copy-defaults";
import { Type } from "@/components/primitives/type";

export type CommunitySafetyModerationDecisionLevel = "allow" | "review" | "disallow";
export type CommunitySafetyEscalationDecisionLevel = "review" | "disallow";

export interface CommunitySafetyProviderSettings {
  scanCaptions: boolean;
  scanImages: boolean;
  scanLinkPreviewText: boolean;
  scanPostBodies: boolean;
  scanTitles: boolean;
}

export interface CommunitySafetyAdultContentPolicy {
  artistic_nudity: CommunitySafetyModerationDecisionLevel;
  explicit_nudity: CommunitySafetyModerationDecisionLevel;
  explicit_sexual_content: CommunitySafetyModerationDecisionLevel;
  fetish_content: CommunitySafetyModerationDecisionLevel;
  suggestive: CommunitySafetyModerationDecisionLevel;
}

export interface CommunitySafetyGraphicContentPolicy {
  animal_harm: CommunitySafetyModerationDecisionLevel;
  body_horror_disturbing: CommunitySafetyModerationDecisionLevel;
  extreme_gore: CommunitySafetyModerationDecisionLevel;
  gore: CommunitySafetyModerationDecisionLevel;
  injury_medical: CommunitySafetyModerationDecisionLevel;
}

export interface CommunitySafetyCivilityPolicy {
  group_directed_demeaning_language: CommunitySafetyModerationDecisionLevel;
  targeted_harassment: CommunitySafetyModerationDecisionLevel;
  targeted_insults: CommunitySafetyModerationDecisionLevel;
  threatening_language: CommunitySafetyEscalationDecisionLevel;
}

export function createDefaultCommunitySafetyProviderSettings(): CommunitySafetyProviderSettings {
  return {
    scanCaptions: true,
    scanImages: true,
    scanLinkPreviewText: true,
    scanPostBodies: true,
    scanTitles: true,
  };
}

export function createDefaultCommunitySafetyAdultContentPolicy(): CommunitySafetyAdultContentPolicy {
  return {
    artistic_nudity: "review",
    explicit_nudity: "review",
    explicit_sexual_content: "disallow",
    fetish_content: "disallow",
    suggestive: "allow",
  };
}

export function createDefaultCommunitySafetyGraphicContentPolicy(): CommunitySafetyGraphicContentPolicy {
  return {
    animal_harm: "disallow",
    body_horror_disturbing: "review",
    extreme_gore: "disallow",
    gore: "review",
    injury_medical: "allow",
  };
}

export function createDefaultCommunitySafetyCivilityPolicy(): CommunitySafetyCivilityPolicy {
  return {
    group_directed_demeaning_language: "review",
    targeted_harassment: "disallow",
    targeted_insults: "review",
    threatening_language: "disallow",
  };
}





function Section({
  children,
  className,
  note,
  title,
}: {
  children: React.ReactNode;
  className?: string;
  note?: string;
  title: string;
}) {
  return (
    <section className={cn("space-y-4", className)}>
      <div className="space-y-1">
        <Type as="h2" variant="h2">{title}</Type>
        {note ? <FormNote>{note}</FormNote> : null}
      </div>
      {children}
    </section>
  );
}

function ProviderToggleRow({
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

function PolicySelectRow<T extends string>({
  label,
  onValueChange,
  options,
  value,
}: {
  label: string;
  onValueChange: (value: T) => void;
  options: Array<{ label: string; value: T }>;
  value: T;
}) {
  return (
    <div className="flex flex-col gap-3 rounded-[var(--radius-lg)] border border-border-soft bg-muted/20 px-4 py-4 md:flex-row md:items-center md:justify-between">
      <div className="text-base font-medium leading-6">{label}</div>
      <Select onValueChange={(next) => onValueChange(next as T)} value={value}>
        <SelectTrigger className="h-12 w-full rounded-[var(--radius-lg)] md:w-48">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {options.map((option) => (
            <SelectItem key={option.value} value={option.value}>
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

export interface CommunitySafetyPageProps {
  adultContentPolicy: CommunitySafetyAdultContentPolicy;
  civilityPolicy: CommunitySafetyCivilityPolicy;
  className?: string;
  graphicContentPolicy: CommunitySafetyGraphicContentPolicy;
  onAdultContentPolicyChange?: (value: CommunitySafetyAdultContentPolicy) => void;
  onBackClick?: () => void;
  onCivilityPolicyChange?: (value: CommunitySafetyCivilityPolicy) => void;
  onGraphicContentPolicyChange?: (value: CommunitySafetyGraphicContentPolicy) => void;
  onProviderSettingsChange?: (value: CommunitySafetyProviderSettings) => void;
  onSave?: () => void;
  providerSettings: CommunitySafetyProviderSettings;
  saveDisabled?: boolean;
  saveLoading?: boolean;
}

export function CommunitySafetyPage({
  adultContentPolicy,
  civilityPolicy,
  className,
  graphicContentPolicy,
  onAdultContentPolicyChange,
  onBackClick,
  onCivilityPolicyChange,
  onGraphicContentPolicyChange,
  onProviderSettingsChange,
  onSave,
  providerSettings,
  saveDisabled = false,
  saveLoading = false,
}: CommunitySafetyPageProps) {
  const copy = defaultRouteCopy;
  const mc = copy.moderation.safety;

  const decisionLevelOptions: Array<{
    label: string;
    value: CommunitySafetyModerationDecisionLevel;
  }> = [
    { label: mc.allowOption, value: "allow" },
    { label: mc.reviewOption, value: "review" },
    { label: mc.disallowOption, value: "disallow" },
  ];

  const escalationLevelOptions: Array<{
    label: string;
    value: CommunitySafetyEscalationDecisionLevel;
  }> = [
    { label: mc.reviewOption, value: "review" },
    { label: mc.disallowOption, value: "disallow" },
  ];
  return (
    <section className={cn("mx-auto flex w-full max-w-5xl flex-col gap-6 md:gap-8", className)}>
      <div className="flex min-w-0 items-start gap-4">
        <div className="min-w-0 space-y-2">
          <Type as="h1" variant="h1" className="md:text-4xl">{mc.title}</Type>
          <Type as="p" variant="caption">
            Tune the visual moderation pass for uploaded images and video poster frames.
          </Type>
        </div>
      </div>

      <Section
        note={mc.openAiNote}
        title={mc.openAiTitle}
      >
        <div className="space-y-3">
          <ProviderToggleRow
            checked={providerSettings.scanImages}
            id="community-safety-scan-images"
            label={mc.scanImages}
            onCheckedChange={(checked) => onProviderSettingsChange?.({
              ...providerSettings,
              scanImages: checked,
            })}
          />
        </div>
      </Section>

      <Section className="border-t border-border-soft pt-6 md:pt-8" title={mc.adultContentTitle}>
        <div className="space-y-3">
          <PolicySelectRow
            label={mc.suggestiveLabel}
            onValueChange={(value) => onAdultContentPolicyChange?.({
              ...adultContentPolicy,
              suggestive: value,
            })}
            options={decisionLevelOptions}
            value={adultContentPolicy.suggestive}
          />
          <PolicySelectRow
            label={mc.artisticNudityLabel}
            onValueChange={(value) => onAdultContentPolicyChange?.({
              ...adultContentPolicy,
              artistic_nudity: value,
            })}
            options={decisionLevelOptions}
            value={adultContentPolicy.artistic_nudity}
          />
          <PolicySelectRow
            label={mc.explicitNudityLabel}
            onValueChange={(value) => onAdultContentPolicyChange?.({
              ...adultContentPolicy,
              explicit_nudity: value,
            })}
            options={decisionLevelOptions}
            value={adultContentPolicy.explicit_nudity}
          />
          <PolicySelectRow
            label={mc.explicitSexualContentLabel}
            onValueChange={(value) => onAdultContentPolicyChange?.({
              ...adultContentPolicy,
              explicit_sexual_content: value,
            })}
            options={decisionLevelOptions}
            value={adultContentPolicy.explicit_sexual_content}
          />
          <PolicySelectRow
            label={mc.fetishContentLabel}
            onValueChange={(value) => onAdultContentPolicyChange?.({
              ...adultContentPolicy,
              fetish_content: value,
            })}
            options={decisionLevelOptions}
            value={adultContentPolicy.fetish_content}
          />
        </div>
      </Section>

      <Section className="border-t border-border-soft pt-6 md:pt-8" title={mc.graphicContentTitle}>
        <div className="space-y-3">
          <PolicySelectRow
            label={mc.injuryMedicalLabel}
            onValueChange={(value) => onGraphicContentPolicyChange?.({
              ...graphicContentPolicy,
              injury_medical: value,
            })}
            options={decisionLevelOptions}
            value={graphicContentPolicy.injury_medical}
          />
          <PolicySelectRow
            label={mc.goreLabel}
            onValueChange={(value) => onGraphicContentPolicyChange?.({
              ...graphicContentPolicy,
              gore: value,
            })}
            options={decisionLevelOptions}
            value={graphicContentPolicy.gore}
          />
          <PolicySelectRow
            label={mc.extremeGoreLabel}
            onValueChange={(value) => onGraphicContentPolicyChange?.({
              ...graphicContentPolicy,
              extreme_gore: value,
            })}
            options={decisionLevelOptions}
            value={graphicContentPolicy.extreme_gore}
          />
          <PolicySelectRow
            label={mc.bodyHorrorLabel}
            onValueChange={(value) => onGraphicContentPolicyChange?.({
              ...graphicContentPolicy,
              body_horror_disturbing: value,
            })}
            options={decisionLevelOptions}
            value={graphicContentPolicy.body_horror_disturbing}
          />
          <PolicySelectRow
            label={mc.animalHarmLabel}
            onValueChange={(value) => onGraphicContentPolicyChange?.({
              ...graphicContentPolicy,
              animal_harm: value,
            })}
            options={decisionLevelOptions}
            value={graphicContentPolicy.animal_harm}
          />
        </div>
      </Section>

      <Section className="border-t border-border-soft pt-6 md:pt-8" title={mc.civilityTitle}>
        <div className="space-y-3">
          <PolicySelectRow
            label={mc.groupDirectedDemeaningLabel}
            onValueChange={(value) => onCivilityPolicyChange?.({
              ...civilityPolicy,
              group_directed_demeaning_language: value,
            })}
            options={decisionLevelOptions}
            value={civilityPolicy.group_directed_demeaning_language}
          />
          <PolicySelectRow
            label={mc.targetedInsultsLabel}
            onValueChange={(value) => onCivilityPolicyChange?.({
              ...civilityPolicy,
              targeted_insults: value,
            })}
            options={decisionLevelOptions}
            value={civilityPolicy.targeted_insults}
          />
          <PolicySelectRow
            label={mc.targetedHarassmentLabel}
            onValueChange={(value) => onCivilityPolicyChange?.({
              ...civilityPolicy,
              targeted_harassment: value,
            })}
            options={decisionLevelOptions}
            value={civilityPolicy.targeted_harassment}
          />
          <PolicySelectRow
            label={mc.threateningLanguageLabel}
            onValueChange={(value) => onCivilityPolicyChange?.({
              ...civilityPolicy,
              threatening_language: value,
            })}
            options={escalationLevelOptions}
            value={civilityPolicy.threatening_language}
          />
        </div>
      </Section>

      <CommunityModerationSaveFooter
        disabled={saveDisabled}
        loading={saveLoading}
        onSave={onSave}
      />
    </section>
  );
}
