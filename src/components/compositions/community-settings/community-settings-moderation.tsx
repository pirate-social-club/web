"use client";

import * as React from "react";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/primitives/select";
import { Separator } from "@/components/primitives/separator";
import { cn } from "@/lib/utils";

import type {
  CommunitySettingsModerationProps,
  CommunitySettingsModerationPolicy,
  ModerationAction,
  ModerationAdultCategory,
  ModerationCivilityCategory,
  ModerationGraphicCategory,
  ModerationLanguageCategory,
  ModerationPresetKey,
} from "./community-settings.types";

const PRESETS: Record<
  ModerationPresetKey,
  { label: string; summary: string; policy: CommunitySettingsModerationPolicy }
> = {
  anything_legal: {
    label: "Anything Legal",
    summary: "Most legal content publishes. Mods receive flags for sensitive categories.",
    policy: {
      preset: "anything_legal",
      adult: {
        suggestive: "allow",
        artistic_nudity: "allow",
        explicit_nudity: "allow",
        explicit_sexual_content: "allow",
        fetish_content: "allow",
      },
      graphic: {
        injury_medical: "allow",
        gore: "allow",
        extreme_gore: "allow",
        body_horror_disturbing: "allow",
        animal_harm: "allow",
      },
      language: {
        profanity: "allow",
        slurs: "allow",
      },
      civility: {
        group_directed_demeaning_language: "allow",
        targeted_insults: "allow",
        targeted_harassment: "allow",
        threatening_language: "review",
      },
    },
  },
  general_interest: {
    label: "General Interest",
    summary: "Broad discussion allowed. Threats and strong harassment queue quickly. Adult and graphic content labeled.",
    policy: {
      preset: "general_interest",
      adult: {
        suggestive: "allow",
        artistic_nudity: "allow",
        explicit_nudity: "review",
        explicit_sexual_content: "disallow",
        fetish_content: "disallow",
      },
      graphic: {
        injury_medical: "allow",
        gore: "review",
        extreme_gore: "disallow",
        body_horror_disturbing: "review",
        animal_harm: "review",
      },
      language: {
        profanity: "allow",
        slurs: "review",
      },
      civility: {
        group_directed_demeaning_language: "allow",
        targeted_insults: "allow",
        targeted_harassment: "review",
        threatening_language: "review",
      },
    },
  },
  civil_discussion: {
    label: "Civil Discussion",
    summary: "Stricter civility review. Slurs and targeted harassment queue or remove.",
    policy: {
      preset: "civil_discussion",
      adult: {
        suggestive: "allow",
        artistic_nudity: "allow",
        explicit_nudity: "disallow",
        explicit_sexual_content: "disallow",
        fetish_content: "disallow",
      },
      graphic: {
        injury_medical: "allow",
        gore: "disallow",
        extreme_gore: "disallow",
        body_horror_disturbing: "disallow",
        animal_harm: "review",
      },
      language: {
        profanity: "allow",
        slurs: "disallow",
      },
      civility: {
        group_directed_demeaning_language: "disallow",
        targeted_insults: "review",
        targeted_harassment: "disallow",
        threatening_language: "disallow",
      },
    },
  },
  adult_creators: {
    label: "Adult Creators",
    summary: "Explicit adult content allowed with 18+. Graphic and civility still moderated.",
    policy: {
      preset: "adult_creators",
      adult: {
        suggestive: "allow",
        artistic_nudity: "allow",
        explicit_nudity: "allow",
        explicit_sexual_content: "allow",
        fetish_content: "review",
      },
      graphic: {
        injury_medical: "allow",
        gore: "review",
        extreme_gore: "review",
        body_horror_disturbing: "review",
        animal_harm: "review",
      },
      language: {
        profanity: "allow",
        slurs: "allow",
      },
      civility: {
        group_directed_demeaning_language: "allow",
        targeted_insults: "allow",
        targeted_harassment: "review",
        threatening_language: "review",
      },
    },
  },
  no_hate_no_slurs: {
    label: "No Hate / No Slurs",
    summary: "Stricter language and group-directed abuse rules.",
    policy: {
      preset: "no_hate_no_slurs",
      adult: {
        suggestive: "allow",
        artistic_nudity: "allow",
        explicit_nudity: "review",
        explicit_sexual_content: "disallow",
        fetish_content: "disallow",
      },
      graphic: {
        injury_medical: "allow",
        gore: "review",
        extreme_gore: "disallow",
        body_horror_disturbing: "disallow",
        animal_harm: "review",
      },
      language: {
        profanity: "allow",
        slurs: "disallow",
      },
      civility: {
        group_directed_demeaning_language: "disallow",
        targeted_insults: "review",
        targeted_harassment: "review",
        threatening_language: "review",
      },
    },
  },
  private_high_trust: {
    label: "Private High-Trust Club",
    summary: "Broader review posture across conduct and quality categories.",
    policy: {
      preset: "private_high_trust",
      adult: {
        suggestive: "allow",
        artistic_nudity: "allow",
        explicit_nudity: "allow",
        explicit_sexual_content: "review",
        fetish_content: "review",
      },
      graphic: {
        injury_medical: "allow",
        gore: "review",
        extreme_gore: "review",
        body_horror_disturbing: "review",
        animal_harm: "review",
      },
      language: {
        profanity: "allow",
        slurs: "review",
      },
      civility: {
        group_directed_demeaning_language: "review",
        targeted_insults: "review",
        targeted_harassment: "review",
        threatening_language: "review",
      },
    },
  },
};

const ADULT_LABELS: Record<ModerationAdultCategory, string> = {
  suggestive: "Suggestive",
  artistic_nudity: "Artistic nudity",
  explicit_nudity: "Explicit nudity",
  explicit_sexual_content: "Explicit sexual content",
  fetish_content: "Fetish content",
};

const GRAPHIC_LABELS: Record<ModerationGraphicCategory, string> = {
  injury_medical: "Medical injury",
  gore: "Gore",
  extreme_gore: "Extreme gore",
  body_horror_disturbing: "Disturbing / body horror",
  animal_harm: "Animal harm",
};

const LANGUAGE_LABELS: Record<ModerationLanguageCategory, string> = {
  profanity: "Profanity",
  slurs: "Slurs",
};

const CIVILITY_LABELS: Record<ModerationCivilityCategory, string> = {
  group_directed_demeaning_language: "Group-directed demeaning language",
  targeted_insults: "Targeted insults",
  targeted_harassment: "Targeted harassment",
  threatening_language: "Threatening language",
};

const CIVILITY_CONSTRAINED: ModerationCivilityCategory[] = ["threatening_language"];

const ACTION_LABELS: Record<ModerationAction, string> = {
  allow: "Allow",
  review: "Review",
  disallow: "Disallow",
};

const CONSTRAINED_ACTIONS: ModerationAction[] = ["review", "disallow"];

function Section({
  title,
  description,
  children,
  className,
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section className={cn("space-y-4", className)}>
      <div className="space-y-1.5">
        <h3 className="text-lg font-semibold tracking-tight text-foreground">
          {title}
        </h3>
        {description ? (
          <p className="text-base leading-6 text-muted-foreground">
            {description}
          </p>
        ) : null}
      </div>
      {children}
    </section>
  );
}

function PolicyRow<K extends string>({
  label,
  value,
  actions,
  disabled,
  onChange,
}: {
  label: string;
  value: ModerationAction;
  actions: ModerationAction[];
  disabled?: boolean;
  onChange: (action: ModerationAction) => void;
}) {
  return (
    <div className="flex min-h-12 items-center gap-3 rounded-[var(--radius-lg)] border border-border-soft bg-muted/20 px-4 py-3">
      <span className="flex-1 text-base leading-6 text-foreground">
        {label}
      </span>
      <div className="flex gap-1" role="radiogroup" aria-label={label}>
        {actions.map((action) => (
          <button
            aria-checked={value === action}
            className={cn(
              "rounded-full px-3 py-1 text-base font-medium transition-[background-color,color,border-color] border",
              value === action
                ? "border-primary bg-primary/15 text-foreground"
                : "border-transparent bg-transparent text-muted-foreground hover:text-foreground",
              disabled && "pointer-events-none opacity-50",
            )}
            disabled={disabled}
            key={action}
            role="radio"
            type="button"
            onClick={() => onChange(action)}
          >
            {ACTION_LABELS[action]}
          </button>
        ))}
      </div>
    </div>
  );
}

function PlatformFloor() {
  return (
    <div className="rounded-[var(--radius-lg)] border border-border-soft bg-muted/30 px-4 py-3.5">
      <p className="text-base leading-6 text-muted-foreground">
        Pirate may still hold or block content that is illegal or high-risk
        regardless of these settings. This covers credible threats, sexual
        content involving minors, and unlawful incitement.
      </p>
    </div>
  );
}

function OutcomeExplainer() {
  return (
    <div className="space-y-2">
      {(
        [
          {
            action: "allow" as const,
            text: "Content can publish if everything else passes.",
          },
          {
            action: "review" as const,
            text: "Mods see it in queue. Some cases may still publish first.",
          },
          {
            action: "disallow" as const,
            text: "Content is removed or blocked when evidence is strong enough.",
          },
        ] as const
      ).map(({ action, text }) => (
        <div
          className="flex items-start gap-2 text-base leading-6"
          key={action}
        >
          <span className="shrink-0 rounded-full px-2 py-0.5 text-base font-medium bg-muted text-muted-foreground">
            {ACTION_LABELS[action]}
          </span>
          <span className="text-muted-foreground">{text}</span>
        </div>
      ))}
    </div>
  );
}

function detectPreset(policy: CommunitySettingsModerationPolicy): ModerationPresetKey | "custom" {
  for (const [key, preset] of Object.entries(PRESETS)) {
    const p = preset.policy;
    if (
      JSON.stringify(p.adult) === JSON.stringify(policy.adult) &&
      JSON.stringify(p.graphic) === JSON.stringify(policy.graphic) &&
      JSON.stringify(p.language) === JSON.stringify(policy.language) &&
      JSON.stringify(p.civility) === JSON.stringify(policy.civility)
    ) {
      return key as ModerationPresetKey;
    }
  }
  return "custom";
}

export function CommunitySettingsModeration({
  className,
  policy,
  onPolicyChange,
  readOnly,
}: CommunitySettingsModerationProps) {
  const effectivePreset = detectPreset(policy);

  const applyPreset = React.useCallback(
    (key: ModerationPresetKey) => {
      onPolicyChange(PRESETS[key].policy);
    },
    [onPolicyChange],
  );

  const updateAdult = React.useCallback(
    (category: ModerationAdultCategory, action: ModerationAction) => {
      onPolicyChange({
        ...policy,
        preset: detectPreset({ ...policy, adult: { ...policy.adult, [category]: action } }),
        adult: { ...policy.adult, [category]: action },
      });
    },
    [policy, onPolicyChange],
  );

  const updateGraphic = React.useCallback(
    (category: ModerationGraphicCategory, action: ModerationAction) => {
      onPolicyChange({
        ...policy,
        preset: detectPreset({ ...policy, graphic: { ...policy.graphic, [category]: action } }),
        graphic: { ...policy.graphic, [category]: action },
      });
    },
    [policy, onPolicyChange],
  );

  const updateLanguage = React.useCallback(
    (category: ModerationLanguageCategory, action: ModerationAction) => {
      onPolicyChange({
        ...policy,
        preset: detectPreset({ ...policy, language: { ...policy.language, [category]: action } }),
        language: { ...policy.language, [category]: action },
      });
    },
    [policy, onPolicyChange],
  );

  const updateCivility = React.useCallback(
    (category: ModerationCivilityCategory, action: ModerationAction) => {
      const next = { ...policy.civility, [category]: action };
      onPolicyChange({
        ...policy,
        preset: detectPreset({ ...policy, civility: next }),
        civility: next as typeof policy.civility,
      });
    },
    [policy, onPolicyChange],
  );

  const allActions: ModerationAction[] = ["allow", "review", "disallow"];

  return (
    <div className={cn("space-y-8", className)}>
      <Section title="Moderation posture">
        <Select
          disabled={readOnly}
          onValueChange={(v) => {
            if (v !== "custom") applyPreset(v as ModerationPresetKey);
          }}
          value={effectivePreset}
        >
          <SelectTrigger className="h-12 w-full max-w-sm rounded-[var(--radius-lg)]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {Object.entries(PRESETS).map(([key, { label }]) => (
              <SelectItem key={key} value={key}>
                {label}
              </SelectItem>
            ))}
            <SelectItem value="custom">Custom</SelectItem>
          </SelectContent>
        </Select>
        {effectivePreset !== "custom" ? (
          <p className="text-base leading-6 text-muted-foreground">
            {PRESETS[effectivePreset].summary}
          </p>
        ) : (
          <p className="text-base leading-6 text-muted-foreground">
            Settings have been customized beyond a preset.
          </p>
        )}
      </Section>

      <Separator />

      <Section title="Platform floor">
        <PlatformFloor />
      </Section>

      <Separator />

      <Section
        description="Explicit adult content may still require 18+ gating regardless of community settings."
        title="Adult content"
      >
        <div className="space-y-2">
          {(Object.keys(ADULT_LABELS) as ModerationAdultCategory[]).map(
            (cat) => (
              <PolicyRow
                actions={allActions}
                disabled={readOnly}
                key={cat}
                label={ADULT_LABELS[cat]}
                value={policy.adult[cat]}
                onChange={(a) => updateAdult(cat, a)}
              />
            ),
          )}
        </div>
      </Section>

      <Separator />

      <Section title="Graphic content">
        <div className="space-y-2">
          {(Object.keys(GRAPHIC_LABELS) as ModerationGraphicCategory[]).map(
            (cat) => (
              <PolicyRow
                actions={allActions}
                disabled={readOnly}
                key={cat}
                label={GRAPHIC_LABELS[cat]}
                value={policy.graphic[cat]}
                onChange={(a) => updateGraphic(cat, a)}
              />
            ),
          )}
        </div>
      </Section>

      <Separator />

      <Section title="Language">
        <div className="space-y-2">
          {(Object.keys(LANGUAGE_LABELS) as ModerationLanguageCategory[]).map(
            (cat) => (
              <PolicyRow
                actions={allActions}
                disabled={readOnly}
                key={cat}
                label={LANGUAGE_LABELS[cat]}
                value={policy.language[cat]}
                onChange={(a) => updateLanguage(cat, a)}
              />
            ),
          )}
        </div>
      </Section>

      <Separator />

      <Section
        description="Threatening content may still be escalated by Pirate regardless of community choice."
        title="Civility"
      >
        <div className="space-y-2">
          {(Object.keys(CIVILITY_LABELS) as ModerationCivilityCategory[]).map(
            (cat) => (
              <PolicyRow
                actions={
                  CIVILITY_CONSTRAINED.includes(cat)
                    ? CONSTRAINED_ACTIONS
                    : allActions
                }
                disabled={readOnly}
                key={cat}
                label={CIVILITY_LABELS[cat]}
                value={policy.civility[cat]}
                onChange={(a) => updateCivility(cat, a)}
              />
            ),
          )}
        </div>
      </Section>

      <Separator />

      <Section title="What happens">
        <OutcomeExplainer />
      </Section>
    </div>
  );
}
