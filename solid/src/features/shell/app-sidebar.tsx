import type { JSX } from "@solidjs/web";
import { Dynamic } from "@solidjs/web";
import { createSignal, For, Show, type Component } from "solid-js";

import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
  Avatar,
  IconFire,
  IconFlag,
  IconHouse,
  IconMagnifyingGlass,
  IconPlus,
  IconTrendUp,
  PirateBrandMark,
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
  Type,
  useSidebar,
} from "../../design-system";

import { cn } from "../../lib/cn";
import { VersionBadge } from "./version-badge";

export type SidebarIconComponent = Component<{ class?: string }>;

export interface AppSidebarPrimaryItem {
  avatarFallback?: string;
  avatarSeed?: string | null;
  /** `undefined` renders the icon; a string or null renders the viewer's avatar. */
  avatarSrc?: string | null;
  /** Unread count overlaid on the item visual; 0 or undefined hides the badge. */
  badgeCount?: number;
  id: string;
  icon: SidebarIconComponent;
  label: string;
  onSelect?: () => void;
}

export interface AppSidebarSectionItem {
  avatarSrc?: string | null;
  icon?: SidebarIconComponent;
  id: string;
  label: string;
  onSelect?: () => void;
}

export interface AppSidebarSection {
  action?: {
    ariaLabel: string;
    icon: SidebarIconComponent;
    onSelect: () => void;
  };
  /** Rendered in place of the item list when the section has no items. */
  emptyLabel?: string;
  id: string;
  defaultOpen?: boolean;
  items: readonly AppSidebarSectionItem[];
  label: string;
}

const sectionLabelClassName =
  "px-4 pb-1.5 pt-3 text-base font-normal uppercase tracking-[0.03em] text-sidebar-foreground/32 hover:no-underline";

const topLevelRowClassName = "h-11 rounded-xl px-3.5 text-base font-medium";
const nestedRowClassName = "h-11 rounded-xl px-3.5 text-base font-medium";

// These destinations already have persistent, one-tap homes in the mobile footer.
// Keep the drawer focused on search, feed controls, discovery, and communities.
const mobileFooterItemIds = new Set(["home", "popular", "chat", "activity", "wallet", "profile"]);

function formatUnreadCount(count: number): string {
  return count > 99 ? "99+" : String(count);
}

function normalizeUnreadCount(count: number | undefined): number {
  if (count === undefined || !Number.isFinite(count)) return 0;
  return Math.max(0, Math.floor(count));
}

export function filterPrimaryItemsForLayout(
  items: readonly AppSidebarPrimaryItem[],
  isMobile: boolean,
): readonly AppSidebarPrimaryItem[] {
  return isMobile ? items.filter((item) => !mobileFooterItemIds.has(item.id)) : items;
}

function SidebarSectionBlock(props: {
  activeItemId?: string;
  onItemSelect: (onSelect?: () => void) => void;
  sections: readonly AppSidebarSection[];
}) {
  const defaultValue = () =>
    props.sections.reduce<string[]>((result, section) => {
      if (section.defaultOpen) result.push(section.id);
      return result;
    }, []);
  const [openSectionIds, setOpenSectionIds] = createSignal<string[]>(defaultValue());

  return (
    <Accordion
      class="px-4 group-data-[collapsible=icon]:hidden"
      multiple
      value={openSectionIds()}
      onChange={setOpenSectionIds}
    >
      <For each={props.sections}>
        {(section) => (
          <AccordionItem class="border-b-0 border-sidebar-border" value={section.id}>
            <div class="flex items-center">
              {/* Symmetric vertical padding keeps the section action button
                  centered on the label text. */}
              <AccordionTrigger class={cn(sectionLabelClassName, "min-w-0 flex-1 py-2.5")}>
                {section.label}
              </AccordionTrigger>
              <Show when={section.action}>
                {(action) => (
                  <button
                    aria-label={action().ariaLabel}
                    class="me-2 grid size-9 shrink-0 place-items-center rounded-full text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                    onClick={() => props.onItemSelect(action().onSelect)}
                    type="button"
                  >
                    <Dynamic component={action().icon} class="size-5" />
                  </button>
                )}
              </Show>
            </div>
            <AccordionContent class="pb-0">
              <SidebarGroup class="gap-0 p-0">
                <SidebarGroupContent>
                  <Show when={section.items.length === 0 && section.emptyLabel}>
                    <Type as="p" class="px-3.5 pb-2 text-sidebar-foreground/50" variant="caption">
                      {section.emptyLabel}
                    </Type>
                  </Show>
                  <SidebarMenu class="gap-1">
                    <For each={section.items}>
                      {(item) => (
                        <SidebarMenuItem>
                          <SidebarMenuButton
                            class={nestedRowClassName}
                            isActive={item.id === props.activeItemId}
                            onClick={() => props.onItemSelect(item.onSelect)}
                            tooltip={item.label}
                          >
                            <Show when={item.avatarSrc} fallback={item.icon ? <item.icon class="size-5" /> : null}>
                              <Avatar
                                class="size-7 border-border-soft"
                                fallback={item.label}
                                size="xs"
                                src={item.avatarSrc ?? undefined}
                              />
                            </Show>
                            <span>{item.label}</span>
                          </SidebarMenuButton>
                        </SidebarMenuItem>
                      )}
                    </For>
                  </SidebarMenu>
                </SidebarGroupContent>
              </SidebarGroup>
            </AccordionContent>
          </AccordionItem>
        )}
      </For>
    </Accordion>
  );
}

function SidebarResources(props: {
  accordionId: string;
  activeItemId?: string;
  items: readonly AppSidebarSectionItem[];
  label: string;
  onItemSelect: (onSelect?: () => void) => void;
}) {
  return (
    <Accordion class="px-4 group-data-[collapsible=icon]:hidden" defaultValue={[props.accordionId]} multiple>
      <AccordionItem class="border-b-0 border-sidebar-border" value={props.accordionId}>
        <AccordionTrigger class={sectionLabelClassName}>
          {props.label}
        </AccordionTrigger>
        <AccordionContent class="pb-0">
          <SidebarGroup class="gap-0 p-0">
            <SidebarGroupContent>
              <SidebarMenu class="gap-1">
                <For each={props.items}>
                  {(item) => (
                    <SidebarMenuItem>
                      <SidebarMenuButton
                        class={nestedRowClassName}
                        isActive={item.id === props.activeItemId}
                        onClick={() => props.onItemSelect(item.onSelect)}
                        tooltip={item.label}
                      >
                        {item.icon ? <item.icon class="size-5" /> : null}
                        <span>{item.label}</span>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  )}
                </For>
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        </AccordionContent>
      </AccordionItem>
    </Accordion>
  );
}

export type HomeFeedSort = "best" | "new" | "top";

export interface AppSidebarProps {
  activeItemId?: string;
  appearance?: "default" | "media";
  brandAccentColor?: string | null;
  brandHref?: string;
  brandImageSrc?: string | null;
  brandLabel?: string;
  class?: string;
  codeItems?: readonly AppSidebarSectionItem[];
  codeLabel?: string;
  homeAriaLabel?: string;
  /** Current home feed sort; host-owned state (the React version subscribed
      to a window event). */
  homeFeedSort?: HomeFeedSort;
  isRtl?: boolean;
  isSovereignOrigin?: boolean;
  mediaAction?: JSX.Element;
  onHomeClick?: () => void;
  onHomeFeedSortChange?: (sort: HomeFeedSort) => void;
  onSearchClick?: () => void;
  primaryItems?: readonly AppSidebarPrimaryItem[];
  resourceItems?: readonly AppSidebarSectionItem[];
  resourcesLabel?: string;
  searchLabel?: string;
  sections?: readonly AppSidebarSection[];
  /** Logical placement; resolved against isRtl. */
  side?: "start" | "end" | "left" | "right";
  versionApiSha?: string | null;
  versionWebSha?: string | null;
}

export function communityBrandInitial(label: string | null | undefined): string {
  const first = Array.from(label?.trim() ?? "")[0];
  return first?.toLocaleUpperCase() ?? "C";
}

const DEFAULT_PRIMARY_ITEMS: readonly AppSidebarPrimaryItem[] = [
  { id: "home", icon: IconHouse, label: "Home" },
  { id: "popular", icon: IconFire, label: "Popular" },
  { id: "your-communities", icon: IconFlag, label: "Your Communities" },
  { id: "create-community", icon: IconPlus, label: "Create Community" },
];

export function AppSidebar(props: AppSidebarProps) {
  const { isMobile, setOpenMobile } = useSidebar();

  const handleItemSelect = (onSelect?: () => void) => {
    onSelect?.();
    if (isMobile()) setOpenMobile(false);
  };
  const handleHomeFeedSortSelect = (sort: HomeFeedSort) => {
    props.onHomeFeedSortChange?.(sort);
    if (isMobile()) setOpenMobile(false);
  };

  const selectedPrimaryItems = () => props.primaryItems ?? DEFAULT_PRIMARY_ITEMS;
  const resolvedPrimaryItems = () =>
    selectedPrimaryItems().map((item) =>
      item.id === "home" && props.onHomeClick && item.onSelect === undefined
        ? { ...item, onSelect: props.onHomeClick }
        : item,
    );
  const visiblePrimaryItems = () => filterPrimaryItemsForLayout(resolvedPrimaryItems(), isMobile());

  const resolvedSide = () => {
    const side = props.side ?? "start";
    if (side === "left" || side === "right") return side;
    const rtl = props.isRtl ?? false;
    return (side === "start") !== rtl ? "left" : "right";
  };

  const brandLabel = () => props.brandLabel ?? "Pirate";
  const homeFeedSort = () => props.homeFeedSort ?? "best";

  const mobileHomeFeedSortItems = () => [
    { id: "best" as HomeFeedSort, icon: IconFire, label: "Best" },
    { id: "top" as HomeFeedSort, icon: IconTrendUp, label: "Top" },
  ];

  const brandIdentity = (
    <>
      <Show
        when={props.isSovereignOrigin}
        fallback={<PirateBrandMark class="size-10 shrink-0" />}
      >
        <span
          class="size-10 shrink-0 rounded-full border-2"
          style={props.brandAccentColor ? `border-color: ${props.brandAccentColor}` : undefined}
        >
          <Avatar
            class="size-full"
            fallback={brandLabel()}
            fallbackIcon={
              <Type as="span" variant="label">
                {communityBrandInitial(props.brandLabel)}
              </Type>
            }
            src={props.brandImageSrc ?? undefined}
          />
        </span>
      </Show>
      <Type as="span" class="font-display uppercase tracking-wide group-data-[collapsible=icon]:hidden" variant="h3">
        {brandLabel()}
      </Type>
    </>
  );

  return (
    <Sidebar
      class={cn(
        "w-[15.5rem] pt-0",
        (props.appearance ?? "default") === "media"
          ? "md:top-0 md:h-svh"
          : "md:top-[var(--header-height)] md:h-[calc(100svh-var(--header-height))]",
        props.class,
      )}
      collapsible="icon"
      side={resolvedSide()}
    >
      <Show when={(props.appearance ?? "default") === "media"}>
        <SidebarHeader class="hidden gap-3 border-b border-sidebar-border px-4 pb-4 pt-5 md:flex">
          {/* The sovereign production probe consumes data-brand-* as a
              presentation-scope contract. */}
          <Show
            when={props.brandHref}
            fallback={
              <button
                aria-label={props.homeAriaLabel ?? "Go to home"}
                class="flex h-11 items-center gap-3 rounded-xl px-1 text-start focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring group-data-[collapsible=icon]:justify-center"
                data-brand-label={brandLabel()}
                data-brand-scope={props.isSovereignOrigin ? "community" : "pirate"}
                onClick={() => props.onHomeClick?.()}
                type="button"
              >
                {brandIdentity}
              </button>
            }
          >
            <a
              aria-label={brandLabel()}
              class="flex h-11 items-center gap-3 rounded-xl px-1 text-start focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring group-data-[collapsible=icon]:justify-center"
              data-brand-label={brandLabel()}
              data-brand-scope={props.isSovereignOrigin ? "community" : "pirate"}
              href={props.brandHref}
            >
              {brandIdentity}
            </a>
          </Show>
          <button
            aria-label={props.searchLabel ?? "Search"}
            class="flex h-11 items-center gap-3 rounded-xl bg-sidebar-accent px-3.5 text-sidebar-foreground/70 hover:text-sidebar-accent-foreground group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:px-0"
            onClick={() => props.onSearchClick?.()}
            type="button"
          >
            <IconMagnifyingGlass class="size-5 shrink-0" />
            <span class="truncate group-data-[collapsible=icon]:hidden">{props.searchLabel ?? "Search"}</span>
          </button>
        </SidebarHeader>
      </Show>
      <SidebarContent class="gap-3 overflow-y-auto px-0 pb-4 pt-3">
        <Show when={isMobile()}>
          <SidebarGroup class="px-4 pt-1">
            <SidebarGroupContent>
              <SidebarMenu>
                <SidebarMenuItem>
                  <SidebarMenuButton
                    class={topLevelRowClassName}
                    onClick={() => handleItemSelect(props.onSearchClick)}
                    tooltip={props.searchLabel ?? "Search"}
                  >
                    <IconMagnifyingGlass class="size-5" />
                    <span>{props.searchLabel ?? "Search"}</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
          <SidebarGroup class="px-4 pt-1">
            <SidebarGroupContent>
              <SidebarMenu class="gap-1">
                <For each={mobileHomeFeedSortItems()}>
                  {(item) => (
                    <SidebarMenuItem>
                      <SidebarMenuButton
                        class={topLevelRowClassName}
                        isActive={item.id === homeFeedSort()}
                        onClick={() => handleHomeFeedSortSelect(item.id)}
                        tooltip={item.label}
                      >
                        <item.icon class="size-5" />
                        <span>{item.label}</span>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  )}
                </For>
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        </Show>

        <SidebarGroup class="px-4 pt-1">
          <SidebarGroupContent>
            <SidebarMenu class="gap-1">
              <For each={visiblePrimaryItems()}>
                {(item) => {
                  const badgeCount = normalizeUnreadCount(item.badgeCount);
                  return (
                    <SidebarMenuItem>
                      <SidebarMenuButton
                        aria-label={badgeCount > 0 ? `${item.label}, ${badgeCount}` : undefined}
                        class={topLevelRowClassName}
                        isActive={item.id === (props.activeItemId ?? "home")}
                        onClick={() => {
                          if (item.id === "popular") {
                            handleHomeFeedSortSelect("best");
                            return;
                          }
                          handleItemSelect(item.onSelect);
                        }}
                        tooltip={item.label}
                      >
                        <span class="relative inline-flex shrink-0">
                          <Show
                            when={item.avatarSrc !== undefined}
                            fallback={<item.icon class="size-5" />}
                          >
                            <Avatar
                              class="size-7 border-border-soft"
                              fallback={item.avatarFallback ?? item.label}
                              fallbackSeed={item.avatarSeed ?? undefined}
                              size="xs"
                              src={item.avatarSrc ?? undefined}
                            />
                          </Show>
                          <Show when={badgeCount > 0}>
                            <span
                              aria-hidden="true"
                              class="notification-count-badge absolute -end-2 -top-2"
                            >
                              {formatUnreadCount(badgeCount)}
                            </span>
                          </Show>
                        </span>
                        <span>{item.label}</span>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  );
                }}
              </For>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <Show when={(props.appearance ?? "default") === "media" && !isMobile() && props.mediaAction}>
          <div class="px-4 group-data-[collapsible=icon]:hidden">{props.mediaAction}</div>
        </Show>

        <Show when={props.sections}>
          <SidebarSectionBlock
            activeItemId={props.activeItemId}
            onItemSelect={handleItemSelect}
            sections={props.sections!}
          />
        </Show>

        <SidebarSeparator class="mx-4 group-data-[collapsible=icon]:hidden" />

        <Show when={props.resourceItems}>
          <SidebarResources
            accordionId="resources"
            activeItemId={props.activeItemId}
            items={props.resourceItems!}
            label={props.resourcesLabel ?? "Resources"}
            onItemSelect={handleItemSelect}
          />
        </Show>

        <Show when={props.codeItems}>
          <SidebarResources
            accordionId="code"
            activeItemId={props.activeItemId}
            items={props.codeItems!}
            label={props.codeLabel ?? "Code"}
            onItemSelect={handleItemSelect}
          />
        </Show>

        <div class="group-data-[collapsible=icon]:hidden px-4 pb-3 pt-1">
          <VersionBadge webSha={props.versionWebSha} apiSha={props.versionApiSha} />
        </div>
      </SidebarContent>

      <SidebarRail />
    </Sidebar>
  );
}
