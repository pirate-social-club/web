"use client";

import * as React from "react";
import {
  Gavel,
  Heart,
  LinkSimple,
  Lock,
  MagnifyingGlass,
  Robot,
  SealCheck,
  Shield,
} from "@phosphor-icons/react";

import { Avatar } from "@/components/primitives/avatar";
import { PirateBrandMark } from "@/components/primitives/pirate-brand-mark";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarInset,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarSeparator,
} from "@/components/compositions/sidebar/sidebar";
import { cn } from "@/lib/utils";
import { useRouteMessages } from "@/app/authenticated-routes/route-core";

type ModNavIcon = React.ComponentType<{ className?: string; weight?: "regular" | "fill" | "bold" }>;

export interface CommunityModerationNavItem {
  active?: boolean;
  badgeLabel?: string;
  icon: ModNavIcon;
  label: string;
  onSelect?: () => void;
}

export interface CommunityModerationNavSection {
  items: CommunityModerationNavItem[];
  label: string;
}

export interface CommunityModerationShellProps {
  children: React.ReactNode;
  className?: string;
  communityAvatarSrc?: string | null;
  communityLabel: string;
  onExitClick?: () => void;
  sections: CommunityModerationNavSection[];
}

export function CommunityModerationShell({
  children,
  className,
  communityAvatarSrc,
  communityLabel,
  onExitClick,
  sections,
}: CommunityModerationShellProps) {
  const { copy } = useRouteMessages();
  return (
    <SidebarProvider className={cn("min-h-screen bg-background text-foreground", className)}>
      <Sidebar className="w-[18rem]" collapsible="none">
        <SidebarContent className="gap-4 px-0 pb-4 pt-5">
          <SidebarGroup className="px-4 py-0">
            <SidebarGroupContent>
              <div className="mb-6 flex items-center gap-3 px-1">
                <PirateBrandMark className="h-9 w-9 shrink-0" decorative={false} />
                <span className="truncate text-lg font-semibold leading-none tracking-[0.18em] text-foreground">
                  PIRATE
                </span>
              </div>
              <div className="mb-5 flex items-center gap-3">
                <Avatar
                  className="h-10 w-10"
                  fallback={communityLabel}
                  size="sm"
                  src={communityAvatarSrc ?? undefined}
                />
                <div className="min-w-0 text-base font-semibold">{communityLabel}</div>
              </div>
              <div className="mb-2 flex h-12 items-center gap-3 rounded-full border border-border-soft bg-card px-4 text-muted-foreground">
                <MagnifyingGlass className="size-5" />
                <span className="text-base">{copy.moderation.shell.searchToolsPlaceholder}</span>
              </div>
            </SidebarGroupContent>
          </SidebarGroup>

          {sections.map((section, index) => (
            <React.Fragment key={section.label}>
              <SidebarGroup className="gap-0 px-4 py-0">
                <div className="px-2 pb-2 text-base uppercase tracking-[0.08em] text-muted-foreground/55">
                  {section.label}
                </div>
                <SidebarGroupContent>
                  <SidebarMenu className="gap-1">
                    {section.items.map((item) => {
                      const Icon = item.icon;

                      return (
                        <SidebarMenuItem key={item.label}>
                          <SidebarMenuButton
                            className="h-12 rounded-xl px-3 text-base font-medium"
                            isActive={item.active}
                            onClick={item.onSelect}
                            tooltip={item.label}
                          >
                            <Icon className="size-5" weight={item.active ? "fill" : "regular"} />
                            <span className="min-w-0 flex-1 truncate">{item.label}</span>
                            {item.badgeLabel ? (
                              <span className="rounded-full bg-primary px-2.5 py-1 text-base font-semibold text-primary-foreground">
                                {item.badgeLabel}
                              </span>
                            ) : null}
                          </SidebarMenuButton>
                        </SidebarMenuItem>
                      );
                    })}
                  </SidebarMenu>
                </SidebarGroupContent>
              </SidebarGroup>
              {index < sections.length - 1 ? (
                <SidebarSeparator className="mx-4" />
              ) : null}
            </React.Fragment>
          ))}
        </SidebarContent>
      </Sidebar>
      <SidebarInset className="min-h-screen bg-background">
        <main className="min-w-0 px-8 py-8">{children}</main>
      </SidebarInset>
    </SidebarProvider>
  );
}
