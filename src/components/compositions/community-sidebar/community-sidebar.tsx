"use client";

import * as React from "react";
import { useIsMobile } from "@/hooks/use-mobile";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/primitives/accordion";
import { Avatar } from "@/components/primitives/avatar";
import { SidebarProvider } from "@/components/compositions/sidebar/sidebar";
import { cn } from "@/lib/utils";
import { CommunitySidebarCharity } from "./community-sidebar-charity";
import { CommunitySidebarFlairs } from "./community-sidebar-flairs";
import { CommunitySidebarLinks } from "./community-sidebar-links";
import { CommunitySidebarModerator } from "./community-sidebar-moderator";
import { CommunitySidebarRules } from "./community-sidebar-rules";
import type { CommunitySidebarProps } from "./community-sidebar.types";

function formatMemberCount(count: number): string {
  if (count >= 1_000_000) return `${(count / 1_000_000).toFixed(1)}M`;
  if (count >= 10_000) return `${(count / 1_000).toFixed(1)}K`;
  if (count >= 1_000) return `${(count / 1_000).toFixed(1)}K`;
  return count.toLocaleString("en-US");
}

const SECTION_LABEL =
  "py-3 text-[15px] font-semibold uppercase tracking-[0.18em] text-sidebar-foreground/55 hover:no-underline";

export function CommunitySidebar({
  avatarSrc,
  charity,
  className,
  description,
  displayName,
  flairPolicy,
  memberCount,
  moderator,
  requirements,
  referenceLinks,
  rulesAction,
  rules,
}: CommunitySidebarProps) {
  const isMobile = useIsMobile();

  const activeRules = (rules ?? [])
    .filter((r) => r.status === "active")
    .sort((a, b) => a.position - b.position);

  const activeLinks = (referenceLinks ?? [])
    .filter((l) => l.linkStatus === "active")
    .sort((a, b) => a.position - b.position);
  const activeRequirements = (requirements ?? []).filter((requirement) => requirement.trim().length > 0);

  const hasFlairs =
    flairPolicy?.flairEnabled === true &&
    flairPolicy.definitions.some((f) => f.status === "active");
  const showRulesSection = activeRules.length > 0;

  const content = (
    <div className="flex flex-col gap-5">
      <div className="grid grid-cols-[auto_minmax(0,1fr)] items-center gap-x-3 gap-y-2">
        <Avatar
          fallback={displayName}
          size="md"
          src={avatarSrc?.trim() || undefined}
        />
        <h2 className="min-w-0 text-lg font-semibold leading-tight">{displayName}</h2>
        {description && (
          <p className="col-span-2 min-w-0 line-clamp-4 text-base leading-snug text-muted-foreground">
            {description}
          </p>
        )}
      </div>

      <div className="flex flex-col gap-2">
        {memberCount != null && (
          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col">
              <span className="text-xl font-bold leading-none tabular-nums">
                {formatMemberCount(memberCount)}
              </span>
              <span className="mt-0.5 text-base text-muted-foreground/60">
                Members
              </span>
            </div>
          </div>
        )}
      </div>

      {moderator && (
        <div className="flex flex-col gap-1.5">
          <div className={SECTION_LABEL}>Moderator</div>
          <CommunitySidebarModerator moderator={moderator} />
        </div>
      )}

      {charity && (
        <div className="flex flex-col gap-1.5">
          <div className={SECTION_LABEL}>Charity</div>
          <CommunitySidebarCharity charity={charity} />
        </div>
      )}
      <Accordion
        className="border-b-0"
        defaultValue={["links", "requirements", "rules", "tags"]}
        type="multiple"
      >
        {activeLinks.length > 0 && (
          <AccordionItem className="border-b-0" value="links">
            <AccordionTrigger className={SECTION_LABEL}>Links</AccordionTrigger>
            <AccordionContent className="pb-0">
              <CommunitySidebarLinks links={activeLinks} />
            </AccordionContent>
          </AccordionItem>
        )}

        {activeRequirements.length > 0 && (
          <AccordionItem className="border-b-0" value="requirements">
            <AccordionTrigger className={SECTION_LABEL}>Requirements</AccordionTrigger>
            <AccordionContent className="pb-0">
              <ul className="list-disc space-y-1.5 pl-5 text-base leading-snug text-muted-foreground">
                {activeRequirements.map((requirement) => (
                  <li key={requirement}>{requirement}</li>
                ))}
              </ul>
            </AccordionContent>
          </AccordionItem>
        )}

        {showRulesSection && (
          <AccordionItem className="border-b-0" value="rules">
            <div className="flex items-center gap-3">
              <AccordionTrigger className={cn(SECTION_LABEL, "flex-1")}>Rules</AccordionTrigger>
              {rulesAction ? <div className="shrink-0">{rulesAction}</div> : null}
            </div>
            <AccordionContent className="pb-0">
              <CommunitySidebarRules rules={activeRules} />
            </AccordionContent>
          </AccordionItem>
        )}

        {hasFlairs && (
          <AccordionItem className="border-b-0" value="tags">
            <AccordionTrigger className={SECTION_LABEL}>Tags</AccordionTrigger>
            <AccordionContent className="pb-0">
              <CommunitySidebarFlairs flairPolicy={flairPolicy!} />
            </AccordionContent>
          </AccordionItem>
        )}
      </Accordion>
    </div>
  );

  if (isMobile) {
    return (
      <SidebarProvider>
        <div
          className={cn(
            "w-full rounded-lg bg-card",
            className,
          )}
        >
          <div className="px-4 py-4">{content}</div>
        </div>
      </SidebarProvider>
    );
  }

  return (
    <SidebarProvider>
      <aside
        className={cn(
          "sticky top-[4.5rem] w-full shrink-0",
          "max-h-[calc(100dvh-4.5rem-3rem)] overflow-y-auto",
          className,
        )}
      >
        <div className="rounded-lg bg-card px-4 py-4">{content}</div>
      </aside>
    </SidebarProvider>
  );
}
