"use client";

import * as React from "react";
import { Plus, Trash } from "@phosphor-icons/react";

import { Button } from "@/components/primitives/button";
import { CommunityModerationSaveFooter } from "@/components/compositions/community-moderation-shell/community-moderation-save-footer";
import { FormFieldLabel } from "@/components/primitives/form-layout";
import { Input } from "@/components/primitives/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/primitives/select";
import type { ReferenceLinkPlatform } from "@/components/compositions/community-sidebar/community-sidebar.types";
import { cn } from "@/lib/utils";

const PLATFORM_OPTIONS: Array<{ label: string; value: ReferenceLinkPlatform }> = [
  { value: "official_website", label: "Website" },
  { value: "spotify", label: "Spotify" },
  { value: "youtube", label: "YouTube" },
  { value: "instagram", label: "Instagram" },
  { value: "x", label: "X" },
  { value: "discord", label: "Discord" },
  { value: "tiktok", label: "TikTok" },
  { value: "apple_music", label: "Apple Music" },
  { value: "bandcamp", label: "Bandcamp" },
  { value: "soundcloud", label: "SoundCloud" },
  { value: "musicbrainz", label: "MusicBrainz" },
  { value: "genius", label: "Genius" },
  { value: "wikipedia", label: "Wikipedia" },
  { value: "other", label: "Other" },
];

export interface CommunityLinkEditorItem {
  id: string;
  label: string;
  platform: ReferenceLinkPlatform;
  url: string;
  verified?: boolean;
}

export interface CommunityLinksEditorPageProps {
  className?: string;
  links: CommunityLinkEditorItem[];
  onAddLink?: () => void;
  onBackClick?: () => void;
  onLinkChange?: (id: string, patch: Partial<CommunityLinkEditorItem>) => void;
  onRemoveLink?: (id: string) => void;
  onSave?: () => void;
  saveDisabled?: boolean;
  saveLoading?: boolean;
}

export function createEmptyCommunityLinkEditorItem(): CommunityLinkEditorItem {
  return {
    id: `draft-${Math.random().toString(36).slice(2, 10)}`,
    label: "",
    platform: "official_website",
    url: "",
    verified: false,
  };
}

export function CommunityLinksEditorPage({
  className,
  links,
  onAddLink,
  onLinkChange,
  onRemoveLink,
  onSave,
  saveDisabled = false,
  saveLoading = false,
}: CommunityLinksEditorPageProps) {
  return (
    <section className={cn("mx-auto flex w-full max-w-[64rem] flex-col gap-6 md:gap-8", className)}>
      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between md:gap-6">
        <div className="min-w-0">
          <h1 className="text-[1.875rem] font-semibold tracking-tight md:text-[2.25rem]">Links</h1>
        </div>
        <Button className="w-full sm:w-auto" onClick={onAddLink} variant="secondary">
          <Plus className="size-5" />
          Add link
        </Button>
      </div>

      <div className="flex flex-col gap-4">
        {links.map((link) => (
          <div className="rounded-[1.75rem] border border-border-soft bg-card p-4 md:p-5" key={link.id}>
            <div className="grid gap-4 md:grid-cols-[12rem_minmax(0,0.8fr)_minmax(0,1.4fr)_auto] md:items-end">
              <div className="space-y-2">
                <FormFieldLabel label="Platform" />
                <Select
                  onValueChange={(value) => onLinkChange?.(link.id, { platform: value as ReferenceLinkPlatform })}
                  value={link.platform}
                >
                  <SelectTrigger className="h-12 rounded-full px-4 text-base">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {PLATFORM_OPTIONS.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <FormFieldLabel label="Label" />
                <Input
                  className="h-12 px-4 py-2"
                  onChange={(event) => onLinkChange?.(link.id, { label: event.target.value })}
                  placeholder="Display name"
                  value={link.label}
                />
              </div>

              <div className="space-y-2">
                <FormFieldLabel label="URL" />
                <Input
                  className="h-12 px-4 py-2"
                  onChange={(event) => onLinkChange?.(link.id, { url: event.target.value })}
                  placeholder="https://"
                  value={link.url}
                />
              </div>

              <div className="flex items-center justify-end gap-2">
                <Button
                  className="size-12"
                  onClick={() => onRemoveLink?.(link.id)}
                  size="icon"
                  variant="secondary"
                >
                  <Trash className="size-5" />
                </Button>
              </div>
            </div>
          </div>
        ))}

        {links.length === 0 ? (
          <div className="rounded-[1.75rem] border border-dashed border-border-soft bg-card px-5 py-8 text-base text-muted-foreground">
            No links yet.
          </div>
        ) : null}
      </div>

      <CommunityModerationSaveFooter
        disabled={saveDisabled}
        loading={saveLoading}
        onSave={onSave}
      />
    </section>
  );
}
