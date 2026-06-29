"use client";

import { GraduationCap } from "@phosphor-icons/react";

import { CommunityModerationSaveFooter } from "@/components/compositions/community/moderation-shell/community-moderation-save-footer";
import { FormNote } from "@/components/primitives/form-layout";
import { Switch } from "@/components/primitives/switch";
import { Type } from "@/components/primitives/type";
import { cn } from "@/lib/utils";
import type {
  CommunityStudyPolicyPageProps,
  CommunityStudyPolicySettings,
} from "./community-study-policy.types";

function updateEnabled(
  settings: CommunityStudyPolicySettings,
  studyEnabled: boolean,
): CommunityStudyPolicySettings {
  return {
    ...settings,
    studyEnabled,
  };
}

export function CommunityStudyPolicyPage({
  className,
  onSave,
  onSettingsChange,
  saveDisabled,
  settings,
  submitState,
}: CommunityStudyPolicyPageProps) {
  return (
    <section className={cn("mx-auto flex w-full max-w-5xl flex-col gap-6 md:gap-8", className)}>
      <div className="space-y-2">
        <div className="flex items-center gap-3">
          <GraduationCap className="size-7 text-muted-foreground" weight="duotone" />
          <Type as="h1" variant="h1" className="md:text-4xl">Study</Type>
        </div>
        <FormNote>
          Enable the Study action for eligible songs with prepared lyrics and learning exercises.
        </FormNote>
      </div>

      <div className="flex min-h-20 items-center justify-between gap-4 rounded-md border border-border-soft bg-muted/20 px-4 py-4">
        <div className="space-y-1">
          <Type as="h2" variant="h2">Enable Study</Type>
          <FormNote>
            Songs without study-ready lyrics or generated exercises stay hidden automatically.
          </FormNote>
        </div>
        <Switch
          aria-label="Enable Study"
          checked={settings.studyEnabled}
          onCheckedChange={(studyEnabled) => onSettingsChange?.(updateEnabled(settings, studyEnabled))}
        />
      </div>

      <section className="space-y-4 border-t border-border-soft pt-6 md:pt-8">
        <Type as="h2" variant="h2">Song requirements</Type>
        <div className="grid gap-3 md:grid-cols-3">
          {[
            "Song post",
            "Prepared lyrics",
            "Generated exercises",
          ].map((label) => (
            <div
              className="rounded-md border border-border-soft bg-background px-4 py-3"
              key={label}
            >
              <Type as="p" variant="body">{label}</Type>
            </div>
          ))}
        </div>
      </section>

      {settings.updatedAt ? (
        <FormNote>Last updated {new Date(settings.updatedAt).toLocaleString()}.</FormNote>
      ) : null}

      {submitState.kind === "error" ? (
        <p className="text-base text-destructive">{submitState.message}</p>
      ) : null}

      <CommunityModerationSaveFooter
        disabled={saveDisabled}
        loading={submitState.kind === "saving"}
        onSave={onSave}
      />
    </section>
  );
}
