"use client";

import * as React from "react";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/primitives/accordion";
import { cn } from "@/lib/utils";
import type { CommunitySidebarRule } from "./community-sidebar.types";

export interface CommunitySidebarRulesProps {
  className?: string;
  rules: CommunitySidebarRule[];
}

export function CommunitySidebarRules({
  className,
  rules,
}: CommunitySidebarRulesProps) {
  if (rules.length === 0) return null;

  return (
    <div className={cn("flex flex-col", className)}>
      <Accordion collapsible type="single">
        {rules.map((rule, i) => (
          <AccordionItem
            className="border-b-0"
            key={rule.ruleId}
            value={rule.ruleId}
          >
            <AccordionTrigger className="py-1.5 text-base hover:no-underline">
              <span className="flex items-start gap-2.5">
                <span className="shrink-0 tabular-nums text-muted-foreground/60">
                  {i + 1}
                </span>
                <span className="text-left leading-snug">{rule.title}</span>
              </span>
            </AccordionTrigger>
            {rule.body && (
              <AccordionContent>
                <p className="pl-7 leading-snug text-muted-foreground/70">
                  {rule.body}
                </p>
              </AccordionContent>
            )}
          </AccordionItem>
        ))}
      </Accordion>
    </div>
  );
}
