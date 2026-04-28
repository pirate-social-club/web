"use client";

import { Type } from "@/components/primitives/type";
import * as React from "react";

import { CardShell } from "@/components/primitives/layout-shell";
import { cn } from "@/lib/utils";

export function ActionCalloutPanel({
  action,
  children,
  className,
  description,
  descriptionClassName,
  icon,
  title,
}: {
  action?: React.ReactNode;
  children?: React.ReactNode;
  className?: string;
  description?: React.ReactNode;
  descriptionClassName?: string;
  icon?: React.ReactNode;
  title: React.ReactNode;
}) {
  const hasAction = Boolean(action);

  return (
    <CardShell
      className={cn(
        hasAction ? "px-5 py-5 sm:px-6 sm:py-6" : "px-5 py-5",
        className,
      )}
    >
      <div
        className={
          hasAction
            ? "grid gap-5 md:grid-cols-[minmax(0,1fr)_auto] md:items-center"
            : "flex flex-col gap-4 md:flex-row md:items-center md:justify-between"
        }
      >
        <div
          className={cn(
            "min-w-0",
            icon
              ? "flex items-start gap-3"
              : hasAction
                ? "space-y-2.5"
                : "space-y-1.5",
          )}
        >
          {icon}
          <div
            className={cn(
              "min-w-0",
              icon && (hasAction ? "space-y-2.5" : "space-y-1.5"),
            )}
          >
            <Type as="p" variant="h4" className="leading-7">
              {title}
            </Type>
            {description ? (
              <p
                className={cn(
                  "text-base leading-6 text-muted-foreground",
                  descriptionClassName,
                )}
              >
                {description}
              </p>
            ) : null}
            {children}
          </div>
        </div>

        {action}
      </div>
    </CardShell>
  );
}
