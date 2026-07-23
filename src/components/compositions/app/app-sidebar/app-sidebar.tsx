"use client";

import * as React from "react";
import { Fire, Flag, House, MagnifyingGlass, Plus, TrendUp, type Icon } from "@phosphor-icons/react";

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
  SidebarHeader,
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
import { VersionBadge } from "./version-badge";
import { dispatchHomeFeedSortChange, getCurrentHomeFeedSort, HOME_FEED_SORT_CHANGE_EVENT, type HomeFeedSort } from "@/lib/home-feed-sort";
import { PirateBrandMark } from "@/components/primitives/pirate-brand-mark";
import { Type } from "@/components/primitives/type";

type SidebarIcon = Icon;

export interface AppSidebarPrimaryItem {
  id: string;
  icon: SidebarIcon;
  label: string;
  onSelect?: () => void;
}

interface AppSidebarSectionItem {
  avatarSrc?: string | null;
  icon?: SidebarIcon;
  id: string;
  label: string;
  onSelect?: () => void;
}

export interface AppSidebarSection {
  action?: {
    ariaLabel: string;
    icon: SidebarIcon;
    onSelect: () => void;
  };
  id: string;
  defaultOpen?: boolean;
  items: readonly AppSidebarSectionItem[];
  label: string;
}

const sectionLabelClassName =
  "px-4 pb-1.5 pt-3 text-base font-normal uppercase tracking-[0.03em] text-sidebar-foreground/32 hover:no-underline";

const topLevelRowClassName = "h-11 rounded-xl px-3.5 text-base font-medium";
const nestedRowClassName = "h-11 rounded-xl px-3.5 text-base font-medium";

const DEFAULT_PRIMARY_ITEMS: readonly AppSidebarPrimaryItem[] = [
  { id: "home", icon: House, label: "Home" },
  { id: "popular", icon: Fire, label: "Popular" },
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
    () => sections.reduce<string[]>((result, section) => {
      if (section.defaultOpen) {
        result.push(section.id);
      }
      return result;
    }, []),
    [sections],
  );
  const [openSectionIds, setOpenSectionIds] = React.useState<string[]>(defaultValue);
  const previousSectionIdsRef = React.useRef<string[]>(sections.map((section) => section.id));

  React.useEffect(() => {
    const sectionIds = sections.map((section) => section.id);
    const sectionIdSet = new Set(sectionIds);
    const previousSectionIds = new Set(previousSectionIdsRef.current);

    setOpenSectionIds((current) => {
      const validOpenIds = current.filter((id) => sectionIdSet.has(id));
      const nextOpenIds = [...validOpenIds];
      const nextOpenIdSet = new Set(nextOpenIds);

      for (const section of sections) {
        if (!section.defaultOpen || previousSectionIds.has(section.id) || nextOpenIdSet.has(section.id)) {
          continue;
        }

        nextOpenIdSet.add(section.id);
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
          <div className="flex items-center">
            <AccordionTrigger className={cn(sectionLabelClassName, "min-w-0 flex-1")}>
              {section.label}
            </AccordionTrigger>
            {section.action ? (
              <button
                aria-label={section.action.ariaLabel}
                className="me-2 grid size-9 shrink-0 place-items-center rounded-full text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                onClick={() => onItemSelect(section.action?.onSelect)}
                type="button"
              >
                {React.createElement(section.action.icon, { className: "size-5", weight: "bold" })}
              </button>
            ) : null}
          </div>
          <AccordionContent className="pb-0">
            <SidebarGroup className="gap-0 p-0">
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
                            className="size-7 border-border-soft"
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
          <SidebarGroup className="gap-0 p-0">
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
  appearance?: "default" | "media";
  brandLabel?: string;
  className?: string;
  codeItems?: readonly AppSidebarSectionItem[];
  codeLabel?: string;
  homeAriaLabel?: string;
  mediaAction?: React.ReactNode;
  onHomeClick?: () => void;
  onNavigate?: (path: string) => void;
  onSearchClick?: () => void;
  primaryItems?: readonly AppSidebarPrimaryItem[];
  resourceItems?: readonly AppSidebarSectionItem[];
  resourcesLabel?: string;
  searchLabel?: string;
  sections?: readonly AppSidebarSection[];
  side?: UiPlacement;
}

export function AppSidebar({
  activeItemId = "home",
  appearance = "default",
  brandLabel,
  className,
  codeItems,
  codeLabel,
  homeAriaLabel,
  mediaAction,
  onHomeClick,
  onNavigate,
  onSearchClick,
  primaryItems,
  resourceItems,
  resourcesLabel,
  searchLabel = "Search",
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
  const selectedPrimaryItems = primaryItems ?? DEFAULT_PRIMARY_ITEMS;
  const resolvedPrimaryItems = selectedPrimaryItems.map((item) => {
    if (primaryItems) {
      if (item.id === "home" && onHomeClick && item.onSelect === undefined) {
        return { ...item, onSelect: onHomeClick };
      }
      return item;
    }

    let resolvedItem = item;
    if (item.id === "home") resolvedItem = { ...item, label: copy.appSidebar.homeLabel };
    if (item.id === "popular") resolvedItem = { ...item, label: copy.appSidebar.feedSortBestLabel };
    if (item.id === "your-communities") resolvedItem = { ...item, label: copy.appSidebar.yourCommunitiesLabel };
    if (item.id === "agents") resolvedItem = { ...item, label: copy.appSidebar.agentsLabel };
    if (item.id === "create-community") resolvedItem = { ...item, label: copy.appSidebar.createCommunityLabel };
    if (item.id === "home" && onHomeClick && item.onSelect === undefined) return { ...resolvedItem, onSelect: onHomeClick };
    return resolvedItem;
  });
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
      className={cn(
        "w-[15.5rem] pt-0",
        appearance === "media"
          ? "md:top-0 md:h-svh"
          : "md:top-[var(--header-height)] md:h-[calc(100svh-var(--header-height))]",
        className,
      )}
      collapsible="icon"
      side={resolvedSide}
      {...props}
    >
      {appearance === "media" ? (
        <SidebarHeader className="hidden gap-3 border-b border-sidebar-border px-4 pb-4 pt-5 md:flex">
          <button
            aria-label={homeAriaLabel ?? copy.appSidebar.homeAriaLabel}
            className="flex h-11 items-center gap-3 rounded-xl px-1 text-start focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring group-data-[collapsible=icon]:justify-center"
            onClick={onHomeClick}
            type="button"
          >
            <PirateBrandMark className="size-10 shrink-0" decorative={false} />
            <Type as="span" className="font-display tracking-wide group-data-[collapsible=icon]:hidden" variant="h3">
              {brandLabel ?? copy.appSidebar.brandLabel}
            </Type>
          </button>
          <button
            aria-label={searchLabel}
            className="flex h-11 items-center gap-3 rounded-xl bg-sidebar-accent px-3.5 text-sidebar-foreground/70 hover:text-sidebar-accent-foreground group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:px-0"
            onClick={onSearchClick}
            type="button"
          >
            <MagnifyingGlass className="size-5 shrink-0" />
            <span className="truncate group-data-[collapsible=icon]:hidden">{searchLabel}</span>
          </button>
        </SidebarHeader>
      ) : null}
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

        {appearance === "media" && !isMobile && mediaAction ? (
          <div className="px-4 group-data-[collapsible=icon]:hidden">
            {mediaAction}
          </div>
        ) : null}

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

        <div className="group-data-[collapsible=icon]:hidden px-4 pb-3 pt-1">
          <VersionBadge />
        </div>
      </SidebarContent>

      <SidebarRail />
    </Sidebar>
  );
}
