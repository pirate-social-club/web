"use client";

import * as React from "react";
import { CheckCircle, Plus, Trash, Warning } from "@phosphor-icons/react";

import { Button } from "@/components/primitives/button";
import { FormFieldLabel } from "@/components/primitives/form-layout";
import { IconButton } from "@/components/primitives/icon-button";
import { Input } from "@/components/primitives/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/primitives/select";
import { cn } from "@/lib/utils";

import type {
  CommunitySettingsLinksProps,
  CommunitySettingsReferenceLink,
  CommunitySettingsResourceLink,
  ReferenceLinkPlatform,
  ResourceLinkKind,
} from "./community-settings.types";

const resourceKindLabels: Record<ResourceLinkKind, string> = {
  link: "Link",
  playlist: "Playlist",
  document: "Document",
  discord: "Discord",
  website: "Website",
  other: "Other",
};

const platformLabels: Record<ReferenceLinkPlatform, string> = {
  spotify: "Spotify",
  youtube: "YouTube",
  instagram: "Instagram",
  tiktok: "TikTok",
  bandcamp: "Bandcamp",
  soundcloud: "SoundCloud",
  x: "X",
  apple_music: "Apple Music",
  musicbrainz: "MusicBrainz",
  genius: "Genius",
  wikipedia: "Wikipedia",
  official_website: "Official Website",
  other: "Other",
};

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

function FieldLabel({
  label,
  htmlFor,
}: {
  label: string;
  htmlFor?: string;
}) {
  return (
    <FormFieldLabel className="mb-1.5" htmlFor={htmlFor} label={label} />
  );
}

function ResourceLinkCard({
  link,
  readOnly,
  onArchive,
  onKindChange,
  onLabelChange,
  onUrlChange,
}: {
  link: CommunitySettingsResourceLink;
  readOnly?: boolean;
  onLabelChange: (value: string) => void;
  onUrlChange: (value: string) => void;
  onKindChange: (value: ResourceLinkKind) => void;
  onArchive: () => void;
}) {
  return (
    <div className="space-y-3 rounded-[var(--radius-lg)] border border-border-soft bg-muted/20 px-4 py-3">
      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <FieldLabel htmlFor={`rl-label-${link.resourceLinkId}`} label="Label" />
          <Input
            className="h-10 rounded-[var(--radius-lg)]"
            disabled={readOnly}
            id={`rl-label-${link.resourceLinkId}`}
            onChange={(e) => onLabelChange(e.target.value)}
            value={link.label}
          />
        </div>
        <div>
          <FieldLabel label="Type" />
          <Select
            disabled={readOnly}
            onValueChange={(v) => onKindChange(v as ResourceLinkKind)}
            value={link.resourceKind}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {(Object.keys(resourceKindLabels) as ResourceLinkKind[]).map(
                (kind) => (
                  <SelectItem key={kind} value={kind}>
                    {resourceKindLabels[kind]}
                  </SelectItem>
                ),
              )}
            </SelectContent>
          </Select>
        </div>
      </div>
      <div className="flex items-end gap-3">
        <div className="min-w-0 flex-1">
          <FieldLabel htmlFor={`rl-url-${link.resourceLinkId}`} label="URL" />
          <Input
            className="h-10 rounded-[var(--radius-lg)]"
            disabled={readOnly}
            id={`rl-url-${link.resourceLinkId}`}
            onChange={(e) => onUrlChange(e.target.value)}
            placeholder="https://"
            value={link.url}
          />
        </div>
        {!readOnly ? (
          <IconButton className="mb-0.5 shrink-0" size="sm" variant="ghost" onClick={onArchive}>
            <Trash className="size-4" />
          </IconButton>
        ) : null}
      </div>
    </div>
  );
}

function ReferenceLinkCard({
  link,
}: {
  link: CommunitySettingsReferenceLink;
}) {
  const displayLabel =
    link.label ??
    link.metadata.displayName ??
    platformLabels[link.platform] ??
    link.platform;

  return (
    <div className="flex items-center gap-3 rounded-[var(--radius-lg)] border border-border-soft bg-muted/20 px-4 py-3">
      <div className="min-w-0 flex-1">
        <p className="text-base font-medium text-foreground">{displayLabel}</p>
        <p className="truncate text-base text-muted-foreground">{link.url}</p>
      </div>
      {link.verified ? (
        <CheckCircle className="size-5 shrink-0 text-green-500" weight="fill" />
      ) : (
        <Warning className="size-5 shrink-0 text-muted-foreground" />
      )}
    </div>
  );
}

export function CommunitySettingsLinks({
  className,
  resourceLinks,
  referenceLinks,
  onResourceLinksChange,
  readOnly,
}: CommunitySettingsLinksProps) {
  const activeResourceLinks = resourceLinks
    .filter((l) => l.status === "active")
    .sort((a, b) => a.position - b.position);

  const activeReferenceLinks = referenceLinks
    .filter((l) => l.linkStatus === "active")
    .sort((a, b) => a.position - b.position);

  const addResourceLink = React.useCallback(() => {
    const maxPosition = activeResourceLinks.reduce(
      (max, l) => Math.max(max, l.position),
      -1,
    );
    const newLink: CommunitySettingsResourceLink = {
      resourceLinkId: crypto.randomUUID(),
      label: "",
      url: "",
      resourceKind: "link",
      position: maxPosition + 1,
      status: "active",
    };
    onResourceLinksChange([...resourceLinks, newLink]);
  }, [resourceLinks, activeResourceLinks, onResourceLinksChange]);

  const updateResourceLink = React.useCallback(
    (linkId: string, partial: Partial<CommunitySettingsResourceLink>) => {
      onResourceLinksChange(
        resourceLinks.map((l) =>
          l.resourceLinkId === linkId ? { ...l, ...partial } : l,
        ),
      );
    },
    [resourceLinks, onResourceLinksChange],
  );

  const archiveResourceLink = React.useCallback(
    (linkId: string) => {
      onResourceLinksChange(
        resourceLinks.map((l) =>
          l.resourceLinkId === linkId
            ? { ...l, status: "archived" as const }
            : l,
        ),
      );
    },
    [resourceLinks, onResourceLinksChange],
  );

  return (
    <div className={cn("space-y-8", className)}>
      <Section
        description="Links, playlists, and documents for your community."
        title="Resource links"
      >
        {activeResourceLinks.length === 0 ? (
          <p className="text-base text-muted-foreground">
            No resource links yet.
          </p>
        ) : (
          <div className="space-y-3">
            {activeResourceLinks.map((link) => (
              <ResourceLinkCard
                key={link.resourceLinkId}
                link={link}
                readOnly={readOnly}
                onArchive={() => archiveResourceLink(link.resourceLinkId)}
                onKindChange={(v) =>
                  updateResourceLink(link.resourceLinkId, { resourceKind: v })
                }
                onLabelChange={(v) =>
                  updateResourceLink(link.resourceLinkId, { label: v })
                }
                onUrlChange={(v) =>
                  updateResourceLink(link.resourceLinkId, { url: v })
                }
              />
            ))}
          </div>
        )}
        {!readOnly ? (
          <Button onClick={addResourceLink} variant="secondary">
            <Plus className="size-4" weight="bold" />
            Add link
          </Button>
        ) : null}
      </Section>

      <Section
        className="border-t border-border-soft pt-8"
        description="Verified identity links managed through the proof flow."
        title="Official links"
      >
        {activeReferenceLinks.length === 0 ? (
          <p className="text-base text-muted-foreground">
            No official links yet.
          </p>
        ) : (
          <div className="space-y-2">
            {activeReferenceLinks.map((link) => (
              <ReferenceLinkCard
                key={link.communityReferenceLinkId}
                link={link}
              />
            ))}
          </div>
        )}
      </Section>
    </div>
  );
}
