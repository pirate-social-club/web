import { createMemo, omit, type ParentProps } from "solid-js";
import type { JSX } from "@solidjs/web";

import { TabsList, TabsTrigger } from "@/components/disclosure/tabs/tabs";
import { cn } from "@/lib/cn";

function columnsStyle(columns?: number): string | undefined {
  return columns
    ? `grid-template-columns: repeat(${columns}, minmax(0, 1fr))`
    : undefined;
}

export interface FlatTabsListProps {
  class?: string;
  columns?: number;
  isRtl?: boolean;
}

export function FlatTabsList(props: ParentProps<FlatTabsListProps>) {
  const className = createMemo(() =>
    cn(
      "h-auto w-full rounded-none border-b border-border-soft bg-transparent p-0",
      props.columns ? "grid gap-0 overflow-visible" : "overflow-x-auto",
      props.isRtl ? "justify-end" : "justify-start",
      props.class,
    ),
  );
  // Kobalte's TabsList props do not type `style`; forward the computed grid
  // columns through a non-fresh spread so the attribute still reaches the DOM.
  const columnProps = () =>
    props.columns
      ? {
          style: `grid-template-columns: repeat(${props.columns}, minmax(0, 1fr))`,
        }
      : {};

  return (
    <TabsList class={className()} {...columnProps()}>
      {props.children}
    </TabsList>
  );
}

export interface FlatTabsTriggerProps {
  class?: string;
  title?: string;
  value: string;
}

export function FlatTabsTrigger(props: ParentProps<FlatTabsTriggerProps>) {
  const className = createMemo(() =>
    cn(
      "min-w-0 rounded-none border-b-2 border-transparent px-1 py-4 text-base font-semibold data-[selected]:border-primary data-[selected]:bg-transparent data-[selected]:shadow-none",
      props.class,
    ),
  );
  const rest = omit(props, "class", "children");

  return (
    <TabsTrigger class={className()} {...rest}>
      {props.children}
    </TabsTrigger>
  );
}

export interface FlatTabBarProps {
  actions?: JSX.Element;
  class?: string;
  columns?: number;
}

export function FlatTabBar(props: ParentProps<FlatTabBarProps>) {
  const className = createMemo(() =>
    cn(
      "flex items-center justify-between gap-4 border-b border-border-soft",
      props.class,
    ),
  );

  return (
    <div class={className()}>
      <div
        class={cn(
          "min-w-0",
          props.columns
            ? "grid flex-1 gap-0 overflow-visible"
            : "flex items-center gap-4 overflow-x-auto",
        )}
        style={columnsStyle(props.columns)}
      >
        {props.children}
      </div>
      {props.actions ? <div class="shrink-0">{props.actions}</div> : null}
    </div>
  );
}

export interface FlatTabButtonProps {
  active?: boolean;
  class?: string;
  onClick?: () => void;
}

export function FlatTabButton(props: ParentProps<FlatTabButtonProps>) {
  const className = createMemo(() =>
    cn(
      "inline-flex h-12 min-w-0 cursor-pointer items-center justify-center border-b-2 px-1 text-base font-semibold transition-colors",
      props.active
        ? "border-primary text-foreground"
        : "border-transparent text-muted-foreground hover:text-foreground",
      props.class,
    ),
  );

  return (
    <button class={className()} onClick={() => props.onClick?.()} type="button">
      <span class="truncate">{props.children}</span>
    </button>
  );
}
