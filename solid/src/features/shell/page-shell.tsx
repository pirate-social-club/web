import type { JSX } from "@solidjs/web";

import { PageContainer, type PageContainerProps } from "../../design-system";
import { MobilePageHeader } from "../../design-system";
import { cn } from "../../lib/cn";

type PageContainerSize = NonNullable<PageContainerProps["size"]>;

export interface StandardRoutePageProps {
  children?: JSX.Element;
  class?: string;
  frameClass?: string;
  size?: PageContainerSize;
  overflowHidden?: boolean;
}

/**
 * Default app route inside the standard shell (sidebar on desktop, header +
 * bottom nav on mobile). Owns top/bottom clearance for fixed chrome;
 * PageContainer owns horizontal gutters and max-width. `class` applies to the
 * inner content container, never the outer frame, so callers cannot override
 * header/bottom-nav clearance.
 */
export function StandardRoutePage(props: StandardRoutePageProps) {
  return (
    <div
      data-route-spacing-owner="standard"
      class={cn(
        "flex min-h-0 w-full flex-1 flex-col",
        "pt-[calc(env(safe-area-inset-top)+4.5rem)] pb-24 md:pt-6 md:pb-8",
        props.overflowHidden && "md:overflow-hidden",
        props.frameClass,
      )}
    >
      <PageContainer class={cn("flex min-h-0 flex-1 flex-col", props.class)} gutter size={props.size ?? "default"}>
        {props.children}
      </PageContainer>
    </div>
  );
}

export interface StandaloneMobilePageProps {
  children?: JSX.Element;
  class?: string;
  title: string;
  onBack?: () => void;
  onClose?: () => void;
  trailingAction?: JSX.Element;
}

/**
 * Mobile standalone route (e.g., settings, create-post). Renders its own
 * MobilePageHeader and top offset. No bottom nav clearance.
 */
export function StandaloneMobilePage(props: StandaloneMobilePageProps) {
  return (
    <div
      class={cn(
        "flex min-h-[100dvh] w-full flex-col bg-background text-foreground",
        props.class,
      )}
    >
      <MobilePageHeader
        onBackClick={props.onBack}
        onCloseClick={props.onClose}
        title={props.title}
        trailingAction={props.trailingAction}
      />
      <main class="flex min-w-0 flex-1 flex-col pt-[calc(env(safe-area-inset-top)+5rem)]">
        {props.children}
      </main>
    </div>
  );
}

export interface PublicRoutePageProps {
  children?: JSX.Element;
  class?: string;
  size?: PageContainerSize;
}

/**
 * Public route frame (public profile / public agent). No sidebar, no auth
 * shell. PageContainer owns gutters and max-width.
 */
export function PublicRoutePage(props: PublicRoutePageProps) {
  return (
    <div
      class={cn(
        "flex min-h-[100dvh] w-full flex-col bg-background py-4 md:py-6",
        props.class,
      )}
    >
      <PageContainer gutter size={props.size ?? "default"}>{props.children}</PageContainer>
    </div>
  );
}

export interface FullBleedMobileListSectionProps {
  children?: JSX.Element;
  class?: string;
}

/**
 * The only sanctioned negative-margin escape hatch. Cancels PageContainer
 * horizontal gutters on mobile so a list can be full-bleed. On desktop it
 * sits inside the container normally (no negative margins).
 */
export function FullBleedMobileListSection(props: FullBleedMobileListSectionProps) {
  return (
    <div class={cn("mx-[calc(var(--page-gutter-x)*-1)] md:mx-0", props.class)}>
      {props.children}
    </div>
  );
}
