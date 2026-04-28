"use client";

import * as React from "react";
import { Fire, Flag, House, Plus, Robot, TrendUp, type Icon } from "@phosphor-icons/react";

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
} from "@/components/compositions/system/sidebar/sidebar";
import {
  resolveDirectionalSide,
  useUiLocale,
  type UiPlacement,
} from "@/lib/ui-locale";
import { getLocaleMessages } from "@/locales";
import { cn } from "@/lib/utils";
import { dispatchHomeFeedSortChange, getCurrentHomeFeedSort, HOME_FEED_SORT_CHANGE_EVENT, type HomeFeedSort } from "@/lib/home-feed-sort";

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
  "px-4 pb-1.5 pt-3 text-base font-normal uppercase tracking-widest text-sidebar-foreground/32 hover:no-underline";

const topLevelRowClassName = "h-11 rounded-xl px-3.5 text-base font-medium";
const nestedRowClassName = "h-11 rounded-xl px-3.5 text-base font-medium";

const DEFAULT_PRIMARY_ITEMS: readonly AppSidebarPrimaryItem[] = [
  { id: "home", icon: House, label: "Home" },
  { id: "popular", icon: Fire, label: "Popular" },
  { id: "your-communities", icon: Flag, label: "Your Communities" },
  { id: "agents", icon: Robot, label: "Agents" },
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
  accordionId,
  items,
  label = "Resources",
  onItemSelect,
}: {
  accordionId: string;
  activeItemId?: string;
  items: readonly AppSidebarSectionItem[];
  label?: string;
  onItemSelect: (onSelect?: () => void) => void;
}) {
  return (
    <Accordion
      className="px-4 group-data-[collapsible=icon]:hidden"
      defaultValue={[accordionId]}
      type="multiple"
    >
      <AccordionItem className="border-b-0 border-sidebar-border" value={accordionId}>
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
  codeItems?: readonly AppSidebarSectionItem[];
  codeLabel?: string;
  homeAriaLabel?: string;
  onHomeClick?: () => void;
  onNavigate?: (path: string) => void;
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
  codeItems,
  codeLabel,
  homeAriaLabel,
  onHomeClick,
  onNavigate,
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
  const mobileHomeFeedSortItems = React.useMemo(() => [
    { id: "best" as HomeFeedSort, icon: Fire, label: copy.appSidebar.feedSortBestLabel },
    { id: "top" as HomeFeedSort, icon: TrendUp, label: copy.appSidebar.feedSortTopLabel },
  ], [copy.appSidebar.feedSortBestLabel, copy.appSidebar.feedSortTopLabel]);
  const [homeFeedSort, setHomeFeedSort] = React.useState<HomeFeedSort>(() => getCurrentHomeFeedSort());
  const handleItemSelect = React.useCallback((onSelect?: () => void) => {
    onSelect?.();
    if (isMobile) {
      setOpenMobile(false);
    }
  }, [isMobile, setOpenMobile]);
  const handleHomeFeedSortSelect = React.useCallback((sort: HomeFeedSort) => {
    dispatchHomeFeedSortChange(sort);
    onNavigate?.(sort === "best" ? "/popular" : "/");
    if (isMobile) {
      setOpenMobile(false);
    }
  }, [isMobile, onNavigate, setOpenMobile]);

  React.useEffect(() => {
    const handleSortChange = (event: Event) => {
      const sort = (event as CustomEvent<HomeFeedSort>).detail;
      if (sort === "best" || sort === "new" || sort === "top") {
        setHomeFeedSort(sort);
      }
    };

    window.addEventListener(HOME_FEED_SORT_CHANGE_EVENT, handleSortChange);
    return () => window.removeEventListener(HOME_FEED_SORT_CHANGE_EVENT, handleSortChange);
  }, []);
  const resolvedPrimaryItems = (primaryItems ?? DEFAULT_PRIMARY_ITEMS).map((item) => {
    if (item.id === "home") return { ...item, label: copy.appSidebar.homeLabel };
    if (item.id === "popular") return { ...item, label: copy.appSidebar.feedSortBestLabel };
    if (item.id === "your-communities") return { ...item, label: copy.appSidebar.yourCommunitiesLabel };
    if (item.id === "agents") return { ...item, label: copy.appSidebar.agentsLabel };
    if (item.id === "create-community") return { ...item, label: copy.appSidebar.createCommunityLabel };
    return item;
  }).map((item) =>
    item.id === "home" && onHomeClick && item.onSelect === undefined
      ? { ...item, onSelect: onHomeClick }
      : item,
  );
  const visiblePrimaryItems = isMobile
    ? resolvedPrimaryItems.filter((item) => item.id !== "home" && item.id !== "popular")
    : resolvedPrimaryItems;
  const resolvedCodeItems = codeItems ?? copy.appSidebar.codeItems;
  const resolvedCodeLabel = codeLabel ?? copy.appSidebar.codeLabel;
  const resolvedSections = sections ?? copy.appSidebar.sections;
  const resolvedResourceItems = resourceItems ?? copy.appSidebar.resourceItems;
  const resolvedResourcesLabel = resourcesLabel ?? copy.appSidebar.resourcesLabel;
  const resolvedSide = resolveDirectionalSide(side, dir);

  return (
    <Sidebar
      className={cn("w-[15.5rem] pt-0 md:top-[var(--header-height)]", className)}
      collapsible="icon"
      side={resolvedSide}
      {...props}
    >
      <SidebarContent className="gap-3 overflow-y-auto px-0 pb-4 pt-3">
        {isMobile ? (
          <SidebarGroup className="px-4 pt-1">
            <SidebarGroupContent>
              <SidebarMenu className="gap-1">
                {mobileHomeFeedSortItems.map((item) => {
                  const Icon = item.icon;
                  const active = item.id === homeFeedSort;

                  return (
                    <SidebarMenuItem key={item.id}>
                      <SidebarMenuButton
                        className={topLevelRowClassName}
                        isActive={active}
                        onClick={() => handleHomeFeedSortSelect(item.id)}
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
        ) : null}

        <SidebarGroup className="px-4 pt-1">
          <SidebarGroupContent>
            <SidebarMenu className="gap-1">
              {visiblePrimaryItems.map((item) => {
                const Icon = item.icon;
                const active = item.id === "popular"
                  ? activeItemId === "popular"
                  : item.id === "home"
                    ? activeItemId === "home"
                    : item.id === activeItemId;

                return (
                  <SidebarMenuItem key={item.id}>
                    <SidebarMenuButton
                      className={topLevelRowClassName}
                      isActive={active}
                      onClick={() => {
                        if (item.id === "popular") {
                          handleHomeFeedSortSelect("best");
                          return;
                        }

                        handleItemSelect(item.onSelect);
                      }}
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
          accordionId="resources"
          activeItemId={activeItemId}
          items={resolvedResourceItems}
          label={resolvedResourcesLabel}
          onItemSelect={handleItemSelect}
        />

        <SidebarResources
          accordionId="code"
          activeItemId={activeItemId}
          items={resolvedCodeItems}
          label={resolvedCodeLabel}
          onItemSelect={handleItemSelect}
        />
      </SidebarContent>

      <SidebarRail />
    </Sidebar>
  );
}
