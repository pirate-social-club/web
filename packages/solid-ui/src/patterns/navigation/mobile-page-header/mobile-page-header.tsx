import type { JSX } from "@solidjs/web";
import { Show } from "solid-js";

import { IconButton } from "@/components/actions/icon-button/icon-button";
import { Avatar } from "@/components/data-display/avatar/avatar";
import { Type } from "@/components/data-display/type/type";
import { IconX } from "@/components/media/icons";
import { cn } from "@/lib/cn";

import { AppHeader } from "../app-header/app-header";

export interface MobilePageHeaderProps {
  title: string;
  titleAvatarFallback?: string;
  titleAvatarSeed?: string;
  titleAvatarSrc?: string | null;
  class?: string;
  /** Accessible label for the close affordance. */
  closeAriaLabel?: string;
  onBackClick?: () => void;
  onCloseClick?: () => void;
  onTitleClick?: () => void;
  trailingAction?: JSX.Element;
}

/**
 * Mobile sub-page header: close or back affordance on the leading edge, a
 * centered (optionally tappable, optionally avatared) title, and a trailing
 * action slot. Built on AppHeader with the brand hidden.
 */
export function MobilePageHeader(props: MobilePageHeaderProps) {
  const titleContent = (
    <span class="flex min-w-0 items-center justify-center gap-2 text-start">
      <Show when={props.titleAvatarFallback || props.titleAvatarSrc}>
        <Avatar
          class="size-8 shrink-0"
          fallback={props.titleAvatarFallback ?? props.title}
          fallbackSeed={props.titleAvatarSeed}
          size="sm"
          src={props.titleAvatarSrc ?? undefined}
        />
      </Show>
      <Type as="span" variant="h4" class="truncate">
        {props.title}
      </Type>
    </span>
  );

  return (
    <AppHeader
      class={props.class}
      forceMobile
      hideBrand
      mobileLeadingContent={
        props.onCloseClick ? (
          <IconButton
            aria-label={props.closeAriaLabel ?? "Close"}
            onClick={() => props.onCloseClick?.()}
            variant="ghost"
          >
            <IconX class="size-6" />
          </IconButton>
        ) : undefined
      }
      mobileCenterContent={
        props.onTitleClick ? (
          <button
            aria-label={`Open ${props.title}`}
            class={cn(
              "inline-flex max-w-full items-center justify-center rounded-full p-1",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
            )}
            onClick={() => props.onTitleClick?.()}
            type="button"
          >
            {titleContent}
          </button>
        ) : (
          <div class="min-w-0 max-w-full">{titleContent}</div>
        )
      }
      mobileTrailingContent={props.trailingAction}
      onBackClick={props.onBackClick}
      showNotificationsAction={false}
      showProfileAction={false}
    />
  );
}
