"use client";

import * as React from "react";
import { Flag, House, Plus } from "@phosphor-icons/react";

import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/primitives/accordion";
import { PirateBrandMark } from "@/components/primitives/pirate-brand-mark";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
  SidebarSeparator,
} from "@/components/primitives/sidebar";
import { cn } from "@/lib/utils";

type SidebarIcon = React.ComponentType<React.ComponentProps<typeof House>>;

export interface AppSidebarPrimaryItem {
  id: string;
  icon: SidebarIcon;
  label: string;
  onSelect?: () => void;
}

export interface AppSidebarSectionItem {
  id: string;
  label: string;
  onSelect?: () => void;
}

export interface AppSidebarSection {
  id: string;
  defaultOpen?: boolean;
  items: readonly AppSidebarSectionItem[];
  label: string;
}

const sectionLabelClassName =
  "px-4 pb-1.5 pt-3 text-base font-normal uppercase tracking-[0.06em] text-sidebar-foreground/32 hover:no-underline";

const topLevelRowClassName = "h-12 rounded-xl px-4 text-base font-medium";
const nestedRowClassName = "h-12 rounded-xl px-4 text-base font-medium";

const DEFAULT_PRIMARY_ITEMS: readonly AppSidebarPrimaryItem[] = [
  { id: "home", icon: House, label: "Home" },
  { id: "your-communities", icon: Flag, label: "Your Communities" },
  { id: "create-community", icon: Plus, label: "Create Community" },
];

const DEFAULT_SECTIONS: readonly AppSidebarSection[] = [
  {
    id: "recent",
    label: "Recent",
    defaultOpen: true,
    items: [
      { id: "c/club1", label: "c/club1" },
      { id: "c/club2", label: "c/club2" },
      { id: "c/club3", label: "c/club3" },
    ],
  },
  {
    id: "communities",
    label: "Communities",
    defaultOpen: true,
    items: [
      { id: "c/pirates", label: "c/pirates" },
      { id: "c/music", label: "c/music" },
      { id: "c/builders", label: "c/builders" },
    ],
  },
];

const DEFAULT_RESOURCE_ITEMS: readonly AppSidebarSectionItem[] = [
  { id: "blog", label: "Blog" },
  { id: "terms-of-service", label: "Terms of Service" },
  { id: "privacy-policy", label: "Privacy Policy" },
];

function SidebarSectionBlock({
  activeItemId,
  sections,
}: {
  activeItemId?: string;
  sections: readonly AppSidebarSection[];
}) {
  const defaultValue = sections
    .filter((section) => section.defaultOpen)
    .map((section) => section.id);

  return (
    <Accordion
      className="px-4 group-data-[collapsible=icon]:hidden"
      defaultValue={defaultValue}
      type="multiple"
    >
      {sections.map((section) => (
        <AccordionItem
          className="border-b-0 border-sidebar-border"
          key={section.id}
          value={section.id}
        >
          <AccordionTrigger className={sectionLabelClassName}>
            {section.label}
          </AccordionTrigger>
          <AccordionContent className="pb-0">
            <SidebarGroup className="gap-0 px-0 py-0">
              <SidebarGroupContent>
                <SidebarMenu className="gap-1">
                  {section.items.map((item) => (
                    <SidebarMenuItem key={item.id}>
                      <SidebarMenuButton
                        className={nestedRowClassName}
                        isActive={item.id === activeItemId}
                        onClick={item.onSelect}
                        tooltip={item.label}
                      >
                        <span>{item.label}</span>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  ))}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
          </AccordionContent>
        </AccordionItem>
      ))}
    </Accordion>
  );
}

function SidebarResources({
  activeItemId,
  items,
}: {
  activeItemId?: string;
  items: readonly AppSidebarSectionItem[];
}) {
  return (
    <SidebarGroup className="gap-0 px-4 py-0 group-data-[collapsible=icon]:hidden">
      <div className={sectionLabelClassName}>Resources</div>
      <SidebarGroupContent>
        <SidebarMenu className="gap-1">
          {items.map((item) => (
            <SidebarMenuItem key={item.id}>
              <SidebarMenuButton
                className={nestedRowClassName}
                isActive={item.id === activeItemId}
                onClick={item.onSelect}
                tooltip={item.label}
              >
                <span>{item.label}</span>
              </SidebarMenuButton>
            </SidebarMenuItem>
          ))}
        </SidebarMenu>
      </SidebarGroupContent>
    </SidebarGroup>
  );
}

export interface AppSidebarProps extends React.ComponentProps<typeof Sidebar> {
  activeItemId?: string;
  className?: string;
  onHomeClick?: () => void;
  primaryItems?: readonly AppSidebarPrimaryItem[];
  resourceItems?: readonly AppSidebarSectionItem[];
  sections?: readonly AppSidebarSection[];
}

export function AppSidebar({
  activeItemId = "home",
  className,
  onHomeClick,
  primaryItems = DEFAULT_PRIMARY_ITEMS,
  resourceItems = DEFAULT_RESOURCE_ITEMS,
  sections = DEFAULT_SECTIONS,
  side = "left",
  ...props
}: AppSidebarProps) {
  const resolvedPrimaryItems = primaryItems.map((item) =>
    item.id === "home" && onHomeClick && item.onSelect === undefined
      ? { ...item, onSelect: onHomeClick }
      : item,
  );

  return (
    <Sidebar
      className={cn("w-[18rem] pt-0", className)}
      collapsible="icon"
      side={side}
      {...props}
    >
      <SidebarHeader className="border-b border-sidebar-border px-4 py-4">
        <button
          aria-label="Go to home"
          className="flex w-full items-center gap-3 rounded-lg text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sidebar-ring"
          onClick={onHomeClick}
          type="button"
        >
          <PirateBrandMark className="h-10 w-10 shrink-0" decorative={false} />
          <span className="truncate text-lg font-semibold group-data-[collapsible=icon]:hidden">
            Pirate
          </span>
        </button>
      </SidebarHeader>

      <SidebarContent className="gap-3 overflow-y-auto px-0 pb-4 pt-3">
        <SidebarGroup className="px-4 pt-1">
          <SidebarGroupContent>
            <SidebarMenu className="gap-1">
              {resolvedPrimaryItems.map((item) => {
                const Icon = item.icon;
                const active = item.id === activeItemId;

                return (
                  <SidebarMenuItem key={item.id}>
                    <SidebarMenuButton
                      className={topLevelRowClassName}
                      isActive={active}
                      onClick={item.onSelect}
                      tooltip={item.label}
                    >
                      <Icon className="size-5" weight={active ? "fill" : "regular"} />
                      <span>{item.label}</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarSectionBlock activeItemId={activeItemId} sections={sections} />

        <SidebarSeparator className="mx-4 group-data-[collapsible=icon]:hidden" />

        <SidebarResources activeItemId={activeItemId} items={resourceItems} />
      </SidebarContent>

      <SidebarRail />
    </Sidebar>
  );
}
