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
  return (
    <CardShell className={cn("px-5 py-5", className)}>
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div
          className={cn(
            "min-w-0",
            icon ? "flex items-start gap-4" : "space-y-2",
          )}
        >
          {icon}
          <div className={cn("min-w-0", icon && "space-y-2")}>
            <Type as="p" variant="h4" className="leading-7">
              {title}
            </Type>
            {description ? (
              <p
                className={cn(
                  "text-base leading-7 text-muted-foreground",
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
