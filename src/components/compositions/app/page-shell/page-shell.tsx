"use client";

import * as React from "react";

import { PageContainer } from "@/components/primitives/layout-shell";
import { MobilePageHeader } from "@/components/compositions/app/app-shell-chrome/mobile-page-header";
import { cn } from "@/lib/utils";

type PageContainerSize = React.ComponentProps<typeof PageContainer>["size"];

export interface StandardRoutePageProps {
  children: React.ReactNode;
  className?: string;
  frameClassName?: string;
  size?: PageContainerSize;
  overflowHidden?: boolean;
}

/**
 * Default app route inside the standard shell (sidebar on desktop, header + bottom nav on mobile).
 * Owns top/bottom clearance for fixed chrome. PageContainer owns horizontal gutters and max-width.
 * className is applied to the inner content container, never the outer frame, so callers cannot
 * accidentally override header/bottom-nav clearance.
 */
export function StandardRoutePage({
  children,
  className,
  frameClassName,
  size = "default",
  overflowHidden = false,
}: StandardRoutePageProps) {
  return (
    <div
      className={cn(
        "flex min-h-0 w-full flex-1 flex-col",
        "pt-[calc(env(safe-area-inset-top)+4.5rem)] pb-24 md:pt-6 md:pb-8",
        overflowHidden && "md:overflow-hidden",
        frameClassName,
      )}
    >
      <PageContainer className={cn("flex min-h-0 flex-1 flex-col", className)} gutter size={size}>
        {children}
      </PageContainer>
    </div>
  );
}

export interface StandaloneMobilePageProps {
  children: React.ReactNode;
  className?: string;
  title: string;
  onBack?: () => void;
  onClose?: () => void;
  trailingAction?: React.ReactNode;
}

/**
 * Mobile standalone route (e.g., settings, create-post).
 * Renders its own MobilePageHeader and top offset. No bottom nav clearance.
 */
export function StandaloneMobilePage({
  children,
  className,
  title,
  onBack,
  onClose,
  trailingAction,
}: StandaloneMobilePageProps) {
  return (
    <div
      className={cn(
        "flex min-h-[100dvh] w-full flex-col bg-background text-foreground",
        className,
      )}
    >
      <MobilePageHeader
        onBackClick={onBack}
        onCloseClick={onClose}
        title={title}
        trailingAction={trailingAction}
      />
      <main className="flex min-w-0 flex-1 flex-col pt-[calc(env(safe-area-inset-top)+5rem)]">
        {children}
      </main>
    </div>
  );
}

export interface ChatRoutePageProps {
  children: React.ReactNode;
  className?: string;
}

/**
 * Chat route frame. Constrained layout with overflow control on desktop.
 * Composes StandardRoutePage so frame padding is owned in one place.
 */
export function ChatRoutePage({ children, className }: ChatRoutePageProps) {
  return (
    <StandardRoutePage className={className} overflowHidden>
      {children}
    </StandardRoutePage>
  );
}

export interface PublicRoutePageProps {
  children: React.ReactNode;
  className?: string;
  size?: PageContainerSize;
}

/**
 * Public route frame (public profile / public agent).
 * No sidebar, no auth shell. PageContainer owns gutters and max-width.
 */
export function PublicRoutePage({
  children,
  className,
  size = "default",
}: PublicRoutePageProps) {
  return (
    <div
      className={cn(
        "flex min-h-[100dvh] w-full flex-col bg-background py-4 md:py-6",
        className,
      )}
    >
      <PageContainer gutter size={size}>{children}</PageContainer>
    </div>
  );
}

export interface FullBleedMobileListSectionProps {
  children: React.ReactNode;
  className?: string;
}

/**
 * The only sanctioned negative-margin escape hatch.
 * Cancels PageContainer horizontal gutters on mobile so a list can be full-bleed.
 * On desktop it sits inside the container normally (no negative margins).
 */
export function FullBleedMobileListSection({
  children,
  className,
}: FullBleedMobileListSectionProps) {
  return (
    <div
      className={cn(
        "mx-[calc(var(--page-gutter-x)*-1)] md:mx-0",
        className,
      )}
    >
      {children}
    </div>
  );
}
