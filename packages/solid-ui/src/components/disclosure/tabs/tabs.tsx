import {
  Tabs as KTabs,
  type TabsContentProps as KTabsContentProps,
  type TabsListProps as KTabsListProps,
  type TabsTriggerProps as KTabsTriggerProps,
} from "@kobalte/core/tabs";
import {
  createMemo,
  omit,
  type ParentProps,
} from "solid-js";

import { cn } from "@/lib/cn";

const Tabs = KTabs;

export interface TabsContentProps extends KTabsContentProps {
  class?: string;
}

function TabsList(props: ParentProps<KTabsListProps & { class?: string }>) {
  const className = createMemo(() =>
    cn(
      "inline-flex h-11 items-center justify-center gap-1 rounded-full bg-muted p-1 text-muted-foreground",
      props.class,
    ),
  );
  const rest = omit(props, "class", "children");

  return (
    <KTabs.List class={className()} {...rest}>
      {props.children}
    </KTabs.List>
  );
}

function TabsTrigger(props: ParentProps<KTabsTriggerProps & { class?: string }>) {
  const className = createMemo(() =>
    cn(
      "inline-flex cursor-pointer items-center justify-center whitespace-nowrap rounded-full px-4 py-2 text-base font-medium transition-all motion-reduce:transition-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-border focus-visible:ring-offset-2 ring-offset-background disabled:pointer-events-none disabled:opacity-50 data-[selected]:bg-card data-[selected]:text-foreground data-[selected]:shadow-sm",
      props.class,
    ),
  );
  const rest = omit(props, "class", "children");

  return (
    <KTabs.Trigger class={className()} {...rest}>
      {props.children}
    </KTabs.Trigger>
  );
}

function TabsContent(props: ParentProps<TabsContentProps>) {
  const className = createMemo(() =>
    cn(
      "mt-4 ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
      props.class,
    ),
  );
  const rest = omit(props, "class", "children");

  return (
    <KTabs.Content class={className()} {...rest}>
      {props.children}
    </KTabs.Content>
  );
}

export { Tabs, TabsContent, TabsList, TabsTrigger };
