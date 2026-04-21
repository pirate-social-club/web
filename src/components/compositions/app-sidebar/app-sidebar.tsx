"use client";

import * as React from "react";
import { Flag, House, Plus, type Icon } from "@phosphor-icons/react";

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
  useSidebar,
} from "@/components/compositions/sidebar/sidebar";
import {
  resolveDirectionalSide,
  useUiLocale,
  type UiPlacement,
} from "@/lib/ui-locale";
import { getLocaleMessages } from "@/locales";
import { cn } from "@/lib/utils";

type SidebarIcon = Icon;

export interface AppSidebarPrimaryItem {
  id: string;
  icon: SidebarIcon;
  label: string;
  onSelect?: () => void;
}

export interface AppSidebarSectionItem {
  avatarSrc?: string | null;
  icon?: SidebarIcon;
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

function SidebarSectionBlock({
  activeItemId,
  onItemSelect,
  sections,
}: {
  activeItemId?: string;
  onItemSelect: (onSelect?: () => void) => void;
  sections: readonly AppSidebarSection[];
}) {
  const defaultValue = React.useMemo(
    () => sections
      .filter((section) => section.defaultOpen)
      .map((section) => section.id),
    [sections],
  );
  const [openSectionIds, setOpenSectionIds] = React.useState<string[]>(defaultValue);
  const previousSectionIdsRef = React.useRef<string[]>(sections.map((section) => section.id));

  React.useEffect(() => {
    const sectionIds = sections.map((section) => section.id);
    const previousSectionIds = new Set(previousSectionIdsRef.current);

    setOpenSectionIds((current) => {
      const validOpenIds = current.filter((id) => sectionIds.includes(id));
      const nextOpenIds = [...validOpenIds];

      for (const section of sections) {
        if (!section.defaultOpen || previousSectionIds.has(section.id) || nextOpenIds.includes(section.id)) {
          continue;
        }

        nextOpenIds.push(section.id);
      }

      return nextOpenIds;
    });

    previousSectionIdsRef.current = sectionIds;
  }, [sections]);

  return (
    <Accordion
      className="px-4 group-data-[collapsible=icon]:hidden"
      onValueChange={setOpenSectionIds}
      type="multiple"
      value={openSectionIds}
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
                        onClick={() => onItemSelect(item.onSelect)}
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
  onItemSelect,
}: {
  activeItemId?: string;
  items: readonly AppSidebarSectionItem[];
  label?: string;
  onItemSelect: (onSelect?: () => void) => void;
}) {
  return (
    <Accordion
      className="px-4 group-data-[collapsible=icon]:hidden"
      defaultValue={["resources"]}
      type="multiple"
    >
      <AccordionItem className="border-b-0 border-sidebar-border" value="resources">
        <AccordionTrigger className={sectionLabelClassName}>
          {label}
        </AccordionTrigger>
        <AccordionContent className="pb-0">
          <SidebarGroup className="gap-0 px-0 py-0">
            <SidebarGroupContent>
              <SidebarMenu className="gap-1">
                {items.map((item) => {
                  const Icon = item.icon;

                  return (
                    <SidebarMenuItem key={item.id}>
                    <SidebarMenuButton
                      className={nestedRowClassName}
                      isActive={item.id === activeItemId}
                      onClick={() => onItemSelect(item.onSelect)}
                      tooltip={item.label}
                    >
                      {Icon ? <Icon className="size-5" /> : null}
                      <span>{item.label}</span>
                    </SidebarMenuButton>
                    </SidebarMenuItem>
                  );
                })}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        </AccordionContent>
      </AccordionItem>
    </Accordion>
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
  brandLabel,
  className,
  homeAriaLabel,
  onHomeClick,
  primaryItems,
  resourceItems,
  resourcesLabel,
  sections,
  side = "start",
  ...props
}: AppSidebarProps) {
  const { dir, locale } = useUiLocale();
  const { isMobile, setOpenMobile } = useSidebar();
  const copy = getLocaleMessages(locale, "shell");
  const handleItemSelect = React.useCallback((onSelect?: () => void) => {
    onSelect?.();
    if (isMobile) {
      setOpenMobile(false);
    }
  }, [isMobile, setOpenMobile]);
  const resolvedPrimaryItems = (primaryItems ?? DEFAULT_PRIMARY_ITEMS).map((item) => {
    if (item.id === "home") return { ...item, label: copy.appSidebar.homeLabel };
    if (item.id === "your-communities") return { ...item, label: copy.appSidebar.yourCommunitiesLabel };
    if (item.id === "create-community") return { ...item, label: copy.appSidebar.createCommunityLabel };
    return item;
  }).map((item) =>
    item.id === "home" && onHomeClick && item.onSelect === undefined
      ? { ...item, onSelect: onHomeClick }
      : item,
  );
  const resolvedSections = sections ?? copy.appSidebar.sections;
  const resolvedResourceItems = resourceItems ?? copy.appSidebar.resourceItems;
  const resolvedResourcesLabel = resourcesLabel ?? copy.appSidebar.resourcesLabel;
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
                      onClick={() => handleItemSelect(item.onSelect)}
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

        <SidebarSectionBlock
          activeItemId={activeItemId}
          onItemSelect={handleItemSelect}
          sections={resolvedSections}
        />

        <SidebarSeparator className="mx-4 group-data-[collapsible=icon]:hidden" />

        <SidebarResources
          activeItemId={activeItemId}
          items={resolvedResourceItems}
          label={resolvedResourcesLabel}
          onItemSelect={handleItemSelect}
        />
      </SidebarContent>

      <SidebarRail />
    </Sidebar>
  );
}
