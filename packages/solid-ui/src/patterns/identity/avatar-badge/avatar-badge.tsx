import type { JSX } from "@solidjs/web";
import { Show } from "solid-js";

import { Avatar } from "@/components/data-display/avatar/avatar";
import { BadgedCircle } from "@/components/data-display/badged-circle/badged-circle";
import { cn } from "@/lib/cn";

export type AvatarBadgeSize = "sm" | "md" | "lg";

const defaultBadgeSizeByAvatarSize: Record<AvatarBadgeSize, number> = {
  sm: 18,
  md: 22,
  lg: 26,
};

const ringWidthByBadgeSize = (badgeSize: number) => (badgeSize >= 28 ? 2 : 1);

function badgeOffsetXPercentForSize(avatarSize: AvatarBadgeSize, badgeSize: number): number {
  if (badgeSize >= 40) return 10;
  if (badgeSize >= 30) return 8;
  if (avatarSize === "sm") return 6;
  return 8;
}

function normalizeBadgeCountryCode(countryCode: string | null | undefined): string | null {
  const normalized = countryCode?.trim().toLowerCase();
  return normalized && /^[a-z]{2}$/u.test(normalized) ? normalized : null;
}

const defaultFlagUrl = (countryCode: string) =>
  `https://react-circle-flags.pages.dev/${countryCode}.svg`;

export interface AvatarBadgeProps {
  avatarClass?: string;
  badgeCountryCode?: string | null;
  badgeLabel: string;
  badgeSize?: number;
  class?: string;
  fallback: string;
  fallbackIcon?: JSX.Element;
  fallbackSeed?: string;
  fallbackSrc?: string;
  /**
   * Resolve a normalized two-letter country code to a flag image URL.
   * Defaults to the circle-flags CDN (network). Pass a local fixture resolver
   * for offline or deterministic surfaces such as stories and tests.
   */
  flagUrlForCountryCode?: (countryCode: string) => string;
  size?: AvatarBadgeSize;
  src?: string;
}

/**
 * Avatar with a verification badge anchored to the corner. With a valid
 * two-letter badgeCountryCode the badge renders as a circular flag image;
 * without one the plain Avatar renders. Sizing, ring width, and offset scale
 * with the avatar size unless overridden.
 */
export function AvatarBadge(props: AvatarBadgeProps) {
  const normalizedCountryCode = () => normalizeBadgeCountryCode(props.badgeCountryCode);
  const resolvedBadgeSize = () =>
    props.badgeSize ?? defaultBadgeSizeByAvatarSize[props.size ?? "md"];
  const flagUrl = () => {
    const code = normalizedCountryCode();
    if (!code) return null;
    return (props.flagUrlForCountryCode ?? defaultFlagUrl)(code);
  };

  return (
    <Show
      when={flagUrl()}
      fallback={
        <Avatar
          class={cn(props.avatarClass, props.class)}
          fallback={props.fallback}
          fallbackIcon={props.fallbackIcon}
          fallbackSeed={props.fallbackSeed}
          fallbackSrc={props.fallbackSrc}
          size={props.size}
          src={props.src}
        />
      }
    >
      {(url) => (
        <BadgedCircle
          badge={
            <img
              alt=""
              aria-hidden="true"
              class="rounded-full"
              height={resolvedBadgeSize()}
              src={url()}
              width={resolvedBadgeSize()}
            />
          }
          badgeLabel={props.badgeLabel}
          badgeOffsetXPercent={badgeOffsetXPercentForSize(
            props.size ?? "md",
            resolvedBadgeSize(),
          )}
          badgeOffsetYPercent={0}
          badgePadding={ringWidthByBadgeSize(resolvedBadgeSize())}
          badgeSize={resolvedBadgeSize()}
          class={props.class}
        >
          <Avatar
            class={props.avatarClass}
            fallback={props.fallback}
            fallbackIcon={props.fallbackIcon}
            fallbackSeed={props.fallbackSeed}
            fallbackSrc={props.fallbackSrc}
            size={props.size}
            src={props.src}
          />
        </BadgedCircle>
      )}
    </Show>
  );
}
