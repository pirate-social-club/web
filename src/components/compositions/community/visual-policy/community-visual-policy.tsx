"use client";

import * as React from "react";

import { CommunityModerationSaveFooter } from "@/components/compositions/community/moderation-shell/community-moderation-save-footer";
import { FormNote } from "@/components/primitives/form-layout";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/primitives/select";
import { Type } from "@/components/primitives/type";
import { cn } from "@/lib/utils";
import type {
  VisualClassifierFacts,
  VisualPolicyAction,
  VisualPolicyDisclosureAction,
  VisualPolicySettings,
} from "./visual-policy-model";

export { adultToplessNonExplicitSettings, sampleVisualFacts } from "./visual-policy-model";

export type CommunityVisualPolicyPageProps = {
  className?: string;
  onSave?: () => void;
  onSettingsChange?: (settings: VisualPolicySettings) => void;
  sampleFacts?: VisualClassifierFacts;
  saveDisabled?: boolean;
  saveLoading?: boolean;
  settings: VisualPolicySettings;
};

type SettingKey = keyof VisualPolicySettings;

type PolicySection = {
  id: string;
  title: string;
  rows: Array<{
    key: SettingKey;
    label: string;
    description: string;
    locked?: boolean;
    disclosure?: boolean;
  }>;
};

const actionLabels: Record<VisualPolicyAction, string> = {
  allow: "Allow",
  queue: "Review",
  reject: "Disallow",
};

const disclosureActionLabels: Record<VisualPolicyDisclosureAction, string> = {
  allow: "Allow",
  allow_with_disclosure: "Allow with disclosure",
  queue: "Review",
  reject: "Disallow",
};

const actionOptions: Array<{ label: string; value: VisualPolicyAction }> = [
  { label: actionLabels.allow, value: "allow" },
  { label: actionLabels.queue, value: "queue" },
  { label: actionLabels.reject, value: "reject" },
];

const escalationActionOptions: Array<{ label: string; value: Exclude<VisualPolicyAction, "allow"> }> = [
  { label: actionLabels.queue, value: "queue" },
  { label: actionLabels.reject, value: "reject" },
];

const disclosureActionOptions: Array<{ label: string; value: VisualPolicyDisclosureAction }> = [
  { label: disclosureActionLabels.allow, value: "allow" },
  { label: disclosureActionLabels.allow_with_disclosure, value: "allow_with_disclosure" },
  { label: disclosureActionLabels.queue, value: "queue" },
  { label: disclosureActionLabels.reject, value: "reject" },
];

const policySections: PolicySection[] = [
  {
    id: "adult",
    title: "Adult content",
    rows: [
      { key: "topless", label: "Topless nudity", description: "Non-sexual exposed chest in real or realistic media." },
      { key: "visibleNipples", label: "Visible nipples", description: "Visible nipples without other sexual activity signals." },
      { key: "visibleButtocks", label: "Visible buttocks", description: "Exposed buttocks without visible genitals." },
      { key: "visibleGenitals", label: "Visible genitals", description: "Any visible genital exposure." },
      { key: "bottomlessObscured", label: "Bottomless, genitals hidden", description: "Lower body unclothed, cropped, covered, or obscured." },
    ],
  },
  {
    id: "sexual",
    title: "Sexual activity",
    rows: [
      { key: "impliedSexualActivity", label: "Implied sexual activity", description: "Suggestive setup without a visible explicit act." },
      { key: "explicitSexualActivity", label: "Explicit sexual activity", description: "Visible sex acts or explicit sexual contact." },
      { key: "sexualizedContact", label: "Sexualized contact", description: "Contact that is sexualized but may not show genital contact." },
      { key: "masturbation", label: "Masturbation", description: "Visible self-stimulation." },
      { key: "oralSex", label: "Oral sex", description: "Visible oral sex signal." },
    ],
  },
  {
    id: "stylized",
    title: "Stylized art & furry",
    rows: [
      { key: "animeManga", label: "Anime / manga content", description: "Anime, manga, or adjacent stylized character art." },
      { key: "furryAnthro", label: "Furry / anthro content", description: "Anthropomorphic animal characters." },
      { key: "fictionalNudity", label: "Fictional nudity", description: "Nudity in drawn, rendered, or stylized fictional media." },
      { key: "fictionalExplicitSex", label: "Fictional explicit sex", description: "Explicit sex acts in fictional or stylized media." },
      {
        key: "ambiguousFictionalAgeWithAdultContent",
        label: "Ambiguous fictional age + adult content",
        description: "Sexualized content where fictional age coding is unclear.",
      },
      {
        key: "possibleMinorWithAdultContent",
        label: "Minor-coded + adult content",
        description: "Sexualized or nude content involving possible or minor-coded characters.",
        locked: true,
      },
    ],
  },
  {
    id: "ai",
    title: "AI-generated media",
    rows: [
      { key: "aiGeneratedImages", label: "AI-generated images", description: "Likely synthetic images without adult content." },
      { key: "aiGeneratedAdultImages", label: "AI-generated adult images", description: "Synthetic images with nudity or sexualized content." },
      { key: "deepfakeOrFaceSwapRisk", label: "Deepfake / face-swap risk", description: "Possible non-consensual real-person likeness manipulation." },
      { key: "celebrityAdultLikeness", label: "Public figure adult likeness", description: "Adult content with possible celebrity or public figure likeness." },
    ],
  },
  {
    id: "platform-floor",
    title: "Platform floor",
    rows: [
      {
        key: "voyeuristicOrHiddenCamera",
        label: "Voyeuristic / hidden-camera angle",
        description: "Non-consensual, covert, or voyeuristic sexualized imagery.",
        locked: true,
      },
    ],
  },
  {
    id: "commercial",
    title: "Commercial signals",
    rows: [
      { key: "watermark", label: "Watermark", description: "Creator, source, or site watermark." },
      { key: "adultPlatformWatermark", label: "Adult-platform watermark", description: "OnlyFans-style or adult marketplace branding." },
      { key: "productPromotion", label: "Product promotion", description: "Product, coupon, or promotional placement.", disclosure: true },
      { key: "affiliateOrSalesLink", label: "Affiliate / sales link", description: "Sales call to action or affiliate-style image text.", disclosure: true },
      { key: "qrCode", label: "QR code", description: "Visible QR code in the image." },
      { key: "paymentHandle", label: "Payment handle", description: "Tip jar, payment username, or wallet request." },
    ],
  },
  {
    id: "text",
    title: "Text in images",
    rows: [
      { key: "urlsInImage", label: "URLs in image", description: "Visible web addresses or social links." },
      { key: "hateSymbols", label: "Hate symbols / text", description: "Visible symbols or language associated with hate or harassment." },
      { key: "personalDocuments", label: "Personal documents", description: "IDs, addresses, license plates, or private documents." },
    ],
  },
  {
    id: "sensitive",
    title: "Safety-sensitive content",
    rows: [
      { key: "weapons", label: "Weapons", description: "Weapons or weapon sales imagery." },
      { key: "goreOrInjury", label: "Gore / injury", description: "Blood, injury, medical trauma, or graphic aftermath." },
      { key: "drugs", label: "Drugs", description: "Drug use, sale, or paraphernalia." },
    ],
  },
  {
    id: "ambiguity",
    title: "Ambiguity handling",
    rows: [
      { key: "uncertainAgeWithAdultContent", label: "Uncertain age + adult content", description: "Adult content where age risk cannot be confidently resolved." },
      { key: "lowQualityAdultImage", label: "Low-quality adult image", description: "Blurred, cropped, obstructed, or ambiguous adult media." },
      { key: "modelUncertain", label: "Model uncertain", description: "Any high-impact finding where the classifier is uncertain." },
    ],
  },
];

function Section({
  children,
  className,
  title,
}: {
  children: React.ReactNode;
  className?: string;
  title: string;
}) {
  return (
    <section className={cn("space-y-4", className)}>
      <Type as="h2" variant="h2">{title}</Type>
      {children}
    </section>
  );
}

function PolicySelectRow<T extends string>({
  label,
  onChange,
  options,
  value,
}: {
  label: string;
  onChange: (value: T) => void;
  options: Array<{ label: string; value: T }>;
  value: T;
}) {
  return (
    <div className="flex flex-col gap-3 rounded-[var(--radius-lg)] border border-border-soft bg-muted/20 px-4 py-4 md:flex-row md:items-center md:justify-between">
      <div className="text-base font-medium leading-6">{label}</div>
      <Select onValueChange={(next) => onChange(next as T)} value={value}>
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

function StaticPolicyRow({
  description,
  label,
  value,
}: {
  description: string;
  label: string;
  value: string;
}) {
  return (
    <div className="flex flex-col gap-2 rounded-[var(--radius-lg)] border border-border-soft bg-muted/20 px-4 py-4 md:flex-row md:items-center md:justify-between">
      <div>
        <div className="text-base font-medium leading-6">{label}</div>
        {description ? (
          <Type as="p" className="mt-1 max-w-2xl" variant="caption">
            {description}
          </Type>
        ) : null}
      </div>
      <Type as="p" className="text-base font-medium leading-6" variant="body">
        {value}
      </Type>
    </div>
  );
}

function optionsForRow(row: PolicySection["rows"][number]) {
  if (row.disclosure) {
    return disclosureActionOptions;
  }
  if (
    row.key === "ambiguousFictionalAgeWithAdultContent"
    || row.key === "deepfakeOrFaceSwapRisk"
    || row.key === "celebrityAdultLikeness"
    || row.key === "qrCode"
    || row.key === "paymentHandle"
    || row.key === "hateSymbols"
    || row.key === "personalDocuments"
    || row.key === "uncertainAgeWithAdultContent"
    || row.key === "lowQualityAdultImage"
    || row.key === "modelUncertain"
  ) {
    return escalationActionOptions;
  }
  return actionOptions;
}

export function CommunityVisualPolicyPage({
  className,
  onSave,
  onSettingsChange,
  saveDisabled,
  saveLoading,
  settings,
}: CommunityVisualPolicyPageProps) {
  function update(key: SettingKey, value: VisualPolicyAction | VisualPolicyDisclosureAction) {
    onSettingsChange?.({
      ...settings,
      [key]: value,
    });
  }

  return (
    <section className={cn("mx-auto flex w-full max-w-5xl flex-col gap-6 md:gap-8", className)}>
      <div className="min-w-0 space-y-2">
        <Type as="h1" className="md:text-4xl" variant="h1">
          Visual policy
        </Type>
        <Type as="p" variant="caption">
          Tune how visual checks handle uploaded images and video poster frames.
        </Type>
      </div>

      {policySections.map((section, index) => (
        <Section
          className={cn(index > 0 && "border-t border-border-soft pt-6 md:pt-8")}
          key={section.id}
          title={section.title}
        >
          <div className="space-y-3">
            {section.rows.map((row) => (
              row.locked ? (
                <StaticPolicyRow
                  description={row.description}
                  key={row.key}
                  label={row.label}
                  value="Disallow"
                />
              ) : (
                <PolicySelectRow
                  key={row.key}
                  label={row.label}
                  onChange={(value) => update(row.key, value)}
                  options={optionsForRow(row)}
                  value={settings[row.key]}
                />
              )
            ))}
          </div>
        </Section>
      ))}

      <FormNote>
        This board allows non-explicit adult-presenting topless media, queues adult-platform branding and ambiguous adult imagery, and rejects explicit sex, visible genitals, minor-coded adult content, deepfake sexual likeness risk, hate symbols, and graphic injury.
      </FormNote>

      <CommunityModerationSaveFooter
        disabled={saveDisabled}
        loading={saveLoading}
        onSave={onSave ?? (() => undefined)}
      />
    </section>
  );
}
