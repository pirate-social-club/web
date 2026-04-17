"use client";

import * as React from "react";
import { ArrowLeft } from "@phosphor-icons/react";

import { Button } from "@/components/primitives/button";
import { Checkbox } from "@/components/primitives/checkbox";
import { FormNote } from "@/components/primitives/form-layout";
import { IconButton } from "@/components/primitives/icon-button";
import { Label } from "@/components/primitives/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/primitives/select";
import { cn } from "@/lib/utils";

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

const decisionLevelOptions: Array<{
  label: string;
  value: CommunitySafetyModerationDecisionLevel;
}> = [
  { label: "Allow", value: "allow" },
  { label: "Review", value: "review" },
  { label: "Disallow", value: "disallow" },
];

const escalationLevelOptions: Array<{
  label: string;
  value: CommunitySafetyEscalationDecisionLevel;
}> = [
  { label: "Review", value: "review" },
  { label: "Disallow", value: "disallow" },
];

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
        <h2 className="text-2xl font-semibold tracking-tight">{title}</h2>
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
        <SelectTrigger className="h-12 w-full rounded-[var(--radius-lg)] md:w-[12rem]">
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
  return (
    <section className={cn("mx-auto flex w-full max-w-[64rem] flex-col gap-8", className)}>
      <div className="flex items-start justify-between gap-6">
        <div className="flex min-w-0 items-start gap-4">
          <IconButton aria-label="Back" onClick={onBackClick} variant="ghost">
            <ArrowLeft className="size-6" />
          </IconButton>
          <div className="min-w-0 space-y-2">
            <h1 className="text-[2.25rem] font-semibold tracking-tight">Safety</h1>
            <p className="text-base text-muted-foreground">
              Tune how the OpenAI moderation pass feeds community filtering and review.
            </p>
          </div>
        </div>
        <Button disabled={saveDisabled} loading={saveLoading} onClick={onSave}>
          Save
        </Button>
      </div>

      <Section
        note="Classifier input only. Community policy remains the final decision-maker."
        title="OpenAI moderation pass"
      >
        <div className="space-y-3">
          <ProviderToggleRow
            checked={providerSettings.scanTitles}
            id="community-safety-scan-titles"
            label="Scan titles"
            onCheckedChange={(checked) => onProviderSettingsChange?.({
              ...providerSettings,
              scanTitles: checked,
            })}
          />
          <ProviderToggleRow
            checked={providerSettings.scanPostBodies}
            id="community-safety-scan-post-bodies"
            label="Scan post bodies"
            onCheckedChange={(checked) => onProviderSettingsChange?.({
              ...providerSettings,
              scanPostBodies: checked,
            })}
          />
          <ProviderToggleRow
            checked={providerSettings.scanCaptions}
            id="community-safety-scan-captions"
            label="Scan captions"
            onCheckedChange={(checked) => onProviderSettingsChange?.({
              ...providerSettings,
              scanCaptions: checked,
            })}
          />
          <ProviderToggleRow
            checked={providerSettings.scanLinkPreviewText}
            id="community-safety-scan-link-preview-text"
            label="Scan link preview text"
            onCheckedChange={(checked) => onProviderSettingsChange?.({
              ...providerSettings,
              scanLinkPreviewText: checked,
            })}
          />
          <ProviderToggleRow
            checked={providerSettings.scanImages}
            id="community-safety-scan-images"
            label="Scan uploaded images"
            onCheckedChange={(checked) => onProviderSettingsChange?.({
              ...providerSettings,
              scanImages: checked,
            })}
          />
        </div>
      </Section>

      <Section className="border-t border-border-soft pt-8" title="Adult content">
        <div className="space-y-3">
          <PolicySelectRow
            label="Suggestive"
            onValueChange={(value) => onAdultContentPolicyChange?.({
              ...adultContentPolicy,
              suggestive: value,
            })}
            options={decisionLevelOptions}
            value={adultContentPolicy.suggestive}
          />
          <PolicySelectRow
            label="Artistic nudity"
            onValueChange={(value) => onAdultContentPolicyChange?.({
              ...adultContentPolicy,
              artistic_nudity: value,
            })}
            options={decisionLevelOptions}
            value={adultContentPolicy.artistic_nudity}
          />
          <PolicySelectRow
            label="Explicit nudity"
            onValueChange={(value) => onAdultContentPolicyChange?.({
              ...adultContentPolicy,
              explicit_nudity: value,
            })}
            options={decisionLevelOptions}
            value={adultContentPolicy.explicit_nudity}
          />
          <PolicySelectRow
            label="Explicit sexual content"
            onValueChange={(value) => onAdultContentPolicyChange?.({
              ...adultContentPolicy,
              explicit_sexual_content: value,
            })}
            options={decisionLevelOptions}
            value={adultContentPolicy.explicit_sexual_content}
          />
          <PolicySelectRow
            label="Fetish content"
            onValueChange={(value) => onAdultContentPolicyChange?.({
              ...adultContentPolicy,
              fetish_content: value,
            })}
            options={decisionLevelOptions}
            value={adultContentPolicy.fetish_content}
          />
        </div>
      </Section>

      <Section className="border-t border-border-soft pt-8" title="Graphic content">
        <div className="space-y-3">
          <PolicySelectRow
            label="Injury or medical content"
            onValueChange={(value) => onGraphicContentPolicyChange?.({
              ...graphicContentPolicy,
              injury_medical: value,
            })}
            options={decisionLevelOptions}
            value={graphicContentPolicy.injury_medical}
          />
          <PolicySelectRow
            label="Gore"
            onValueChange={(value) => onGraphicContentPolicyChange?.({
              ...graphicContentPolicy,
              gore: value,
            })}
            options={decisionLevelOptions}
            value={graphicContentPolicy.gore}
          />
          <PolicySelectRow
            label="Extreme gore"
            onValueChange={(value) => onGraphicContentPolicyChange?.({
              ...graphicContentPolicy,
              extreme_gore: value,
            })}
            options={decisionLevelOptions}
            value={graphicContentPolicy.extreme_gore}
          />
          <PolicySelectRow
            label="Body horror or disturbing content"
            onValueChange={(value) => onGraphicContentPolicyChange?.({
              ...graphicContentPolicy,
              body_horror_disturbing: value,
            })}
            options={decisionLevelOptions}
            value={graphicContentPolicy.body_horror_disturbing}
          />
          <PolicySelectRow
            label="Animal harm"
            onValueChange={(value) => onGraphicContentPolicyChange?.({
              ...graphicContentPolicy,
              animal_harm: value,
            })}
            options={decisionLevelOptions}
            value={graphicContentPolicy.animal_harm}
          />
        </div>
      </Section>

      <Section className="border-t border-border-soft pt-8" title="Civility">
        <div className="space-y-3">
          <PolicySelectRow
            label="Group-directed demeaning language"
            onValueChange={(value) => onCivilityPolicyChange?.({
              ...civilityPolicy,
              group_directed_demeaning_language: value,
            })}
            options={decisionLevelOptions}
            value={civilityPolicy.group_directed_demeaning_language}
          />
          <PolicySelectRow
            label="Targeted insults"
            onValueChange={(value) => onCivilityPolicyChange?.({
              ...civilityPolicy,
              targeted_insults: value,
            })}
            options={decisionLevelOptions}
            value={civilityPolicy.targeted_insults}
          />
          <PolicySelectRow
            label="Targeted harassment"
            onValueChange={(value) => onCivilityPolicyChange?.({
              ...civilityPolicy,
              targeted_harassment: value,
            })}
            options={decisionLevelOptions}
            value={civilityPolicy.targeted_harassment}
          />
          <PolicySelectRow
            label="Threatening language"
            onValueChange={(value) => onCivilityPolicyChange?.({
              ...civilityPolicy,
              threatening_language: value,
            })}
            options={escalationLevelOptions}
            value={civilityPolicy.threatening_language}
          />
        </div>
      </Section>
    </section>
  );
}
