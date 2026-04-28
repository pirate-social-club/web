"use client";

import { FlatTabsList, FlatTabsTrigger } from "@/components/compositions/system/flat-tabs/flat-tabs";
import { Tabs } from "@/components/primitives/tabs";
import { cn } from "@/lib/utils";
import { tabMeta } from "./post-composer-config";
import type { ComposerTab } from "./post-composer.types";

export function PostComposerTabs({
  activeTab,
  isMobile,
  isRtl,
  labels,
  onTabChange,
  visibleTabs,
}: {
  activeTab: ComposerTab;
  isMobile: boolean;
  isRtl: boolean;
  labels: Record<ComposerTab, string>;
  onTabChange: (tab: ComposerTab) => void;
  visibleTabs: ComposerTab[];
}) {
  const orderedVisibleTabs = isRtl ? [...visibleTabs].reverse() : visibleTabs;
  const useEqualWidthMobileTabs = isMobile && orderedVisibleTabs.length <= 4;

  return (
    <Tabs
      value={activeTab}
      onValueChange={(value) => onTabChange(value as ComposerTab)}
    >
      <FlatTabsList
        className={cn(isMobile && "border-b-0")}
        columns={useEqualWidthMobileTabs ? orderedVisibleTabs.length : undefined}
        isRtl={isRtl}
      >
        {orderedVisibleTabs.map((tab) => (
          <FlatTabsTrigger
            key={tab}
            value={tab}
            title={labels[tab]}
            className={cn(
              "px-5",
              isMobile && "px-4 py-3 whitespace-nowrap",
              useEqualWidthMobileTabs && "min-w-0 px-1",
            )}
          >
            <span className={cn("inline-flex items-center gap-2", useEqualWidthMobileTabs && "min-w-0")}>
              {tabMeta[tab].icon}
              {!isMobile && <span className={cn(useEqualWidthMobileTabs && "truncate")}>{labels[tab]}</span>}
            </span>
          </FlatTabsTrigger>
        ))}
      </FlatTabsList>
    </Tabs>
  );
}
