"use client";

import * as React from "react";

import { Card } from "@/components/primitives/card";
import { Type } from "@/components/primitives/type";
import { useIsMobile } from "@/hooks/use-mobile";
import { cn } from "@/lib/utils";

export function ProfilePanelFrame({
  children,
  emptyCopy,
  hasContent,
  title,
}: {
  children?: React.ReactNode;
  emptyCopy: string;
  hasContent: boolean;
  title: string;
}) {
  const isMobile = useIsMobile();

  return (
    <Card className={cn("overflow-hidden", isMobile && "border-0 bg-transparent shadow-none")}>
      {isMobile ? null : (
        <div className="border-b border-border px-5 py-4">
          <Type as="h2" variant="h4" className="text-start">
            {title}
          </Type>
        </div>
      )}
      {hasContent ? children : (
        <div className={cn("text-start px-5 py-8 text-base leading-7 text-muted-foreground", isMobile && "px-0")}>
          {emptyCopy}
        </div>
      )}
    </Card>
  );
}
