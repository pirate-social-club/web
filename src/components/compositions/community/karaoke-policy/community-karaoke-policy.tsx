"use client";

import { MicrophoneStage } from "@phosphor-icons/react";

import { CommunityModerationSaveFooter } from "@/components/compositions/community/moderation-shell/community-moderation-save-footer";
import { FormNote } from "@/components/primitives/form-layout";
import { Switch } from "@/components/primitives/switch";
import { Type } from "@/components/primitives/type";
import { cn } from "@/lib/utils";
import type {
  CommunityKaraokePolicyPageProps,
  CommunityKaraokePolicySettings,
} from "./community-karaoke-policy.types";

function updateEnabled(
  settings: CommunityKaraokePolicySettings,
  karaokeEnabled: boolean,
): CommunityKaraokePolicySettings {
  return {
    ...settings,
    karaokeEnabled,
  };
}

export function CommunityKaraokePolicyPage({
  className,
  onSave,
  onSettingsChange,
  saveDisabled,
  settings,
  submitState,
}: CommunityKaraokePolicyPageProps) {
  return (
    <section className={cn("mx-auto flex w-full max-w-5xl flex-col gap-6 md:gap-8", className)}>
      <div className="space-y-2">
        <div className="flex items-center gap-3">
          <MicrophoneStage className="size-7 text-muted-foreground" weight="duotone" />
          <Type as="h1" variant="h1" className="md:text-4xl">Karaoke</Type>
        </div>
        <FormNote>
          Enable the Sing action for songs that have an instrumental track and completed timed lyrics.
        </FormNote>
      </div>

      <div className="flex min-h-20 items-center justify-between gap-4 rounded-md border border-border-soft bg-muted/20 px-4 py-4">
        <div className="space-y-1">
          <Type as="h2" variant="h2">Enable karaoke</Type>
          <FormNote>
            Songs without uploaded lyrics, completed forced alignment, or instrumental audio stay hidden automatically.
          </FormNote>
          <FormNote>
            Voice scoring and transcription require an ElevenLabs key configured under Assistant.
          </FormNote>
        </div>
        <Switch
          aria-label="Enable karaoke"
          checked={settings.karaokeEnabled}
          onCheckedChange={(karaokeEnabled) => onSettingsChange?.(updateEnabled(settings, karaokeEnabled))}
        />
      </div>

      <section className="space-y-4 border-t border-border-soft pt-6 md:pt-8">
        <Type as="h2" variant="h2">Song requirements</Type>
        <div className="grid gap-3 md:grid-cols-3">
          {[
            "Instrumental audio",
            "Completed alignment",
            "Timed lyrics",
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
