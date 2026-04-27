"use client";

import * as React from "react";

import { AvatarWithBadge } from "@/components/compositions/system/avatar-badge";
import { Avatar } from "@/components/primitives/avatar";
import { cn } from "@/lib/utils";
import { Type } from "@/components/primitives/type";

export interface IdentityHeroProps {
  actions?: React.ReactNode;
  avatarFallback: string;
  avatarBadgeCountryCode?: string | null;
  avatarBadgeLabel?: string;
  avatarSrc?: string | null;
  className?: string;
  coverClassName?: string;
  coverOverlay?: React.ReactNode;
  coverSrc?: string | null;
  details?: React.ReactNode;
  subtitle?: React.ReactNode;
  title: React.ReactNode;
}

export function IdentityHero({
  actions,
  avatarBadgeCountryCode,
  avatarBadgeLabel,
  avatarFallback,
  avatarSrc,
  className,
  coverClassName,
  coverOverlay,
  coverSrc,
  details,
  subtitle,
  title,
}: IdentityHeroProps) {
  const normalizedCoverSrc = coverSrc?.trim() || "";

  return (
    <section
      className={cn(
        "-mt-2 overflow-visible md:mt-0 md:overflow-hidden md:rounded-[var(--radius-4xl)] md:border md:border-border-soft md:bg-card md:shadow-[var(--shadow-lg)]",
        className,
      )}
    >
      <div
        className={cn(
          "relative -mx-3 h-36 w-[calc(100%+1.5rem)] overflow-hidden bg-muted md:mx-0 md:h-auto md:aspect-[3/1] md:w-full",
          coverClassName,
        )}
      >
        {normalizedCoverSrc ? (
          <img
            alt=""
            className="h-full w-full object-cover object-center"
            draggable={false}
            src={normalizedCoverSrc}
          />
        ) : null}
        {coverOverlay}
      </div>

      <div className="relative z-10 flex flex-col gap-4 px-0 pb-4 pt-0 md:px-5 md:pb-6 lg:px-8 lg:pb-8">
        <div className="-mt-10 flex flex-col gap-4 md:-mt-12 md:flex-row md:items-end md:justify-between md:gap-5">
          <div className="flex min-w-0 flex-col gap-3 md:flex-row md:items-end md:gap-5">
            {avatarBadgeCountryCode && avatarBadgeLabel ? (
              <AvatarWithBadge
                avatarClassName="relative z-10 size-20 border-4 border-background bg-card shadow-none md:size-24 md:shadow-[var(--shadow-lg)] lg:size-28"
                badgeCountryCode={avatarBadgeCountryCode}
                badgeLabel={avatarBadgeLabel}
                badgeSize={42}
                fallback={avatarFallback}
                size="lg"
                src={avatarSrc?.trim() || undefined}
              />
            ) : (
              <Avatar
                className="relative z-10 size-20 border-4 border-background bg-card shadow-none md:size-24 md:shadow-[var(--shadow-lg)] lg:size-28"
                fallback={avatarFallback}
                size="lg"
                src={avatarSrc?.trim() || undefined}
              />
            )}
            <div className="min-w-0 space-y-2 md:pb-1.5">
              <div className="space-y-1">
                <Type as="h1" variant="h1" className="truncate text-2xl md:text-3xl">
                  {title}
                </Type>
                {subtitle ? (
                  <Type as="div" variant="caption" className="truncate ">
                    {subtitle}
                  </Type>
                ) : null}
              </div>
              {details}
            </div>
          </div>

          {actions ? (
            <div className="flex w-full flex-wrap gap-3 md:w-auto md:shrink-0 md:self-end [&>button]:flex-1 md:[&>button]:flex-none [&>div]:contents md:[&>div]:flex md:[&>div]:flex-wrap md:[&>div]:items-center md:[&>div]:justify-end md:[&>div]:gap-3 [&>div>button]:flex-1 md:[&>div>button]:flex-none">
              {actions}
            </div>
          ) : null}
        </div>
      </div>
    </section>
  );
}
