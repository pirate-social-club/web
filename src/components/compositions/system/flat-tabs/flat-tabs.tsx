"use client";

import * as React from "react";

import { TabsList, TabsTrigger } from "@/components/primitives/tabs";
import { cn } from "@/lib/utils";

function columnsStyle(columns?: number): React.CSSProperties | undefined {
  return columns
    ? { gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))` }
    : undefined;
}

export function FlatTabsList({
  children,
  className,
  columns,
  isRtl,
}: {
  children: React.ReactNode;
  className?: string;
  columns?: number;
  isRtl?: boolean;
}) {
  return (
    <TabsList
      className={cn(
        "h-auto w-full rounded-none border-b border-border-soft bg-transparent p-0",
        columns ? "grid gap-0 overflow-visible" : "overflow-x-auto",
        isRtl ? "justify-end" : "justify-start",
        className,
      )}
      style={columnsStyle(columns)}
    >
      {children}
    </TabsList>
  );
}

export function FlatTabsTrigger({
  children,
  className,
  title,
  value,
}: {
  children: React.ReactNode;
  className?: string;
  title?: string;
  value: string;
}) {
  return (
    <TabsTrigger
      className={cn(
        "min-w-0 rounded-none border-b-2 border-transparent px-1 py-4 text-base font-semibold data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none",
        className,
      )}
      title={title}
      value={value}
    >
      {children}
    </TabsTrigger>
  );
}

export function FlatTabBar({
  actions,
  children,
  className,
  columns,
}: {
  actions?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
  columns?: number;
}) {
  return (
    <div
      className={cn(
        "flex items-center justify-between gap-4 border-b border-border-soft",
        className,
      )}
    >
      <div
        className={cn(
          "min-w-0",
          columns
            ? "grid flex-1 gap-0 overflow-visible"
            : "flex items-center gap-4 overflow-x-auto",
        )}
        style={columnsStyle(columns)}
      >
        {children}
      </div>
      {actions ? <div className="shrink-0">{actions}</div> : null}
    </div>
  );
}

export function FlatTabButton({
  active,
  children,
  className,
  onClick,
}: {
  active?: boolean;
  children: React.ReactNode;
  className?: string;
  onClick?: () => void;
}) {
  return (
    <button
      className={cn(
        "inline-flex h-12 min-w-0 cursor-pointer items-center justify-center border-b-2 px-1 text-base font-semibold transition-colors",
        active
          ? "border-primary text-foreground"
          : "border-transparent text-muted-foreground hover:text-foreground",
        className,
      )}
      onClick={onClick}
      type="button"
    >
      <span className="truncate">{children}</span>
    </button>
  );
}
