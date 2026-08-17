/** @jsxImportSource @solidjs/web */

import type { JSX } from "@solidjs/web";
import { Show } from "solid-js";

import {
  Avatar,
  AvatarBadge,
  Type,
  cn,
} from "../../../design-system";

export interface IdentityHeroProps {
  actions?: JSX.Element;
  avatarFallback: string;
  avatarFallbackSeed?: string;
  avatarBadgeCountryCode?: string | null;
  avatarBadgeLabel?: string;
  avatarSrc?: string | null;
  class?: string;
  coverClass?: string;
  coverOverlay?: JSX.Element;
  coverSrc?: string | null;
  details?: JSX.Element;
  subtitle?: JSX.Element;
  title: JSX.Element;
  flagUrlForCountryCode?: (countryCode: string) => string;
}

export function IdentityHero(props: IdentityHeroProps) {
  const coverSrc = () => props.coverSrc?.trim() || "";
  const avatarSrc = () => props.avatarSrc?.trim() || undefined;
  const hasBadge = () => Boolean(props.avatarBadgeCountryCode && props.avatarBadgeLabel);

  return (
    <section
      class={cn(
        "overflow-visible md:overflow-hidden md:rounded-[var(--radius-4xl)] md:border md:border-border-soft md:bg-card md:shadow-lg",
        props.class,
      )}
    >
      <div class={cn("relative -mx-3 h-36 w-[calc(100%+1.5rem)] overflow-hidden bg-muted md:mx-0 md:h-auto md:aspect-[3/1] md:w-full", props.coverClass)}>
        <Show when={coverSrc()}>
          {(src) => <img alt="" class="h-full w-full object-cover object-center" draggable={false} src={src()} />}
        </Show>
        {props.coverOverlay}
      </div>

      <div class="relative z-10 flex flex-col gap-4 px-0 pb-4 pt-0 md:px-5 md:pb-6 lg:px-8 lg:pb-8">
        <div class="-mt-10 flex flex-col gap-4 md:-mt-12 md:flex-row md:items-end md:justify-between md:gap-5">
          <div class="flex min-w-0 flex-col gap-3 md:flex-row md:items-end md:gap-5">
            <Show
              when={hasBadge()}
              fallback={(
                <Avatar
                  class="relative z-10 size-20 border-4 border-background bg-card shadow-none md:size-24 md:shadow-lg lg:size-28"
                  fallback={props.avatarFallback}
                  fallbackSeed={props.avatarFallbackSeed}
                  size="lg"
                  src={avatarSrc()}
                />
              )}
            >
              <AvatarBadge
                avatarClass="relative z-10 size-20 border-4 border-background bg-card shadow-none md:size-24 md:shadow-lg lg:size-28"
                badgeCountryCode={props.avatarBadgeCountryCode}
                badgeLabel={props.avatarBadgeLabel ?? "Verified"}
                badgeSize={42}
                fallback={props.avatarFallback}
                fallbackSeed={props.avatarFallbackSeed}
                flagUrlForCountryCode={props.flagUrlForCountryCode}
                size="lg"
                src={avatarSrc()}
              />
            </Show>

            <div class="min-w-0 space-y-2 md:pb-1.5">
              <div class="space-y-1">
                <Type as="h1" class="truncate" variant="h1">{props.title}</Type>
                <Show when={props.subtitle}>
                  <Type as="div" class="truncate" variant="caption">{props.subtitle}</Type>
                </Show>
              </div>
              {props.details}
            </div>
          </div>

          <Show when={props.actions}>
        <div class="flex w-full flex-wrap gap-3 md:w-auto md:shrink-0 md:self-end [&>button]:flex-1 md:[&>button]:flex-none [&>a]:flex-1 md:[&>a]:flex-none [&>div]:contents md:[&>div]:flex md:[&>div]:flex-wrap md:[&>div]:items-center md:[&>div]:justify-end md:[&>div]:gap-3 [&>div>button]:flex-1 md:[&>div>button]:flex-none">
              {props.actions}
            </div>
          </Show>
        </div>
      </div>
    </section>
  );
}
