"use client";

import * as React from "react";
import { Flag, House, Plus } from "@phosphor-icons/react";

import { Avatar } from "@/components/primitives/avatar";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/primitives/accordion";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
  SidebarSeparator,
} from "@/components/compositions/sidebar/sidebar";
import {
  resolveDirectionalSide,
  useUiLocale,
  type UiPlacement,
} from "@/lib/ui-locale";
import { cn } from "@/lib/utils";

type SidebarIcon = React.ComponentType<React.ComponentProps<typeof House>>;

export interface AppSidebarPrimaryItem {
  id: string;
  icon: SidebarIcon;
  label: string;
  onSelect?: () => void;
}

export interface AppSidebarSectionItem {
  avatarSrc?: string | null;
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

const topLevelRowClassName = "h-11 rounded-xl px-3.5 text-base font-medium";
const nestedRowClassName = "h-11 rounded-xl px-3.5 text-base font-medium";

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
                        {item.avatarSrc ? (
                          <Avatar
                            className="h-7 w-7 border-border-soft"
                            fallback={item.label}
                            size="xs"
                            src={item.avatarSrc}
                          />
                        ) : null}
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
  label = "Resources",
}: {
  activeItemId?: string;
  items: readonly AppSidebarSectionItem[];
  label?: string;
}) {
  return (
    <SidebarGroup className="gap-0 px-4 py-0 group-data-[collapsible=icon]:hidden">
      <div className={sectionLabelClassName}>{label}</div>
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

export interface AppSidebarProps
  extends Omit<React.ComponentProps<typeof Sidebar>, "side"> {
  activeItemId?: string;
  brandLabel?: string;
  className?: string;
  homeAriaLabel?: string;
  onHomeClick?: () => void;
  primaryItems?: readonly AppSidebarPrimaryItem[];
  resourceItems?: readonly AppSidebarSectionItem[];
  resourcesLabel?: string;
  sections?: readonly AppSidebarSection[];
  side?: UiPlacement;
}

export function AppSidebar({
  activeItemId = "home",
  brandLabel = "Pirate",
  className,
  homeAriaLabel = "Go to home",
  onHomeClick,
  primaryItems = DEFAULT_PRIMARY_ITEMS,
  resourceItems = DEFAULT_RESOURCE_ITEMS,
  resourcesLabel = "Resources",
  sections = DEFAULT_SECTIONS,
  side = "start",
  ...props
}: AppSidebarProps) {
  const { dir } = useUiLocale();
  const resolvedPrimaryItems = primaryItems.map((item) =>
    item.id === "home" && onHomeClick && item.onSelect === undefined
      ? { ...item, onSelect: onHomeClick }
      : item,
  );
  const resolvedSide = resolveDirectionalSide(side, dir);

  return (
    <Sidebar
      className={cn("w-[15.5rem] pt-0 md:top-[4.5rem]", className)}
      collapsible="icon"
      side={resolvedSide}
      {...props}
    >
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

        <SidebarResources
          activeItemId={activeItemId}
          items={resourceItems}
          label={resourcesLabel}
        />
      </SidebarContent>

      <SidebarRail />
    </Sidebar>
  );
}
