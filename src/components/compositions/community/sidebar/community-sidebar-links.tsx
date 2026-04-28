"use client";

import * as React from "react";
import type { Icon } from "@phosphor-icons/react";
import {
  DiscordLogo,
  GlobeSimple,
  InstagramLogo,
  MusicNote,
  SealCheck,
  SoundcloudLogo,
  SpeakerSimpleHigh,
  SpotifyLogo,
  TiktokLogo,
  XLogo,
  YoutubeLogo,
} from "@phosphor-icons/react";
import { cn } from "@/lib/utils";
import type { CommunitySidebarReferenceLink, ReferenceLinkPlatform } from "./community-sidebar.types";

const PLATFORM_CONFIG: Record<
  ReferenceLinkPlatform,
  { label: string; Icon: Icon }
> = {
  spotify: { label: "Spotify", Icon: SpotifyLogo },
  apple_music: { label: "Apple Music", Icon: MusicNote },
  youtube: { label: "YouTube", Icon: YoutubeLogo },
  instagram: { label: "Instagram", Icon: InstagramLogo },
  tiktok: { label: "TikTok", Icon: TiktokLogo },
  x: { label: "X", Icon: XLogo },
  discord: { label: "Discord", Icon: DiscordLogo },
  bandcamp: { label: "Bandcamp", Icon: SpeakerSimpleHigh },
  soundcloud: { label: "SoundCloud", Icon: SoundcloudLogo },
  musicbrainz: { label: "MusicBrainz", Icon: GlobeSimple },
  genius: { label: "Genius", Icon: GlobeSimple },
  wikipedia: { label: "Wikipedia", Icon: GlobeSimple },
  official_website: { label: "Website", Icon: GlobeSimple },
  other: { label: "Link", Icon: GlobeSimple },
};

export interface CommunitySidebarLinksProps {
  className?: string;
  links: CommunitySidebarReferenceLink[];
}

export function CommunitySidebarLinks({
  className,
  links,
}: CommunitySidebarLinksProps) {
  if (links.length === 0) return null;

  return (
    <div className={cn("flex flex-col gap-0.5", className)}>
      {links.map((link) => {
        const config = PLATFORM_CONFIG[link.platform];
        const label =
          link.label ?? config?.label ?? link.platform;

        return (
          <a
            className="flex items-center gap-2.5 py-1.5"
            href={link.url}
            key={link.communityReferenceLinkId}
            rel="noopener noreferrer"
            target="_blank"
          >
            {config && (
              <config.Icon
                className="size-5 shrink-0 opacity-60"
                weight="fill"
              />
            )}
            <span className="min-w-0 flex-1 truncate font-semibold text-foreground hover:underline">
              {label}
            </span>
            {link.verified && (
              <SealCheck
                className="size-5 shrink-0 text-info"
                weight="fill"
              />
            )}
          </a>
        );
      })}
    </div>
  );
}
