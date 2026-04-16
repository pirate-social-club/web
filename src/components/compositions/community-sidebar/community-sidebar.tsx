"use client";

import * as React from "react";
import { Globe, Lock } from "@phosphor-icons/react";
import { useIsMobile } from "@/hooks/use-mobile";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/primitives/accordion";
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

function formatCreatedDate(isoString: string): string {
  const date = new Date(isoString);
  return date.toLocaleDateString("en-US", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

const SECTION_LABEL =
  "py-3 text-[15px] font-semibold uppercase tracking-[0.18em] text-sidebar-foreground/55 hover:no-underline";

export function CommunitySidebar({
  charity,
  className,
  createdAt,
  description,
  displayName,
  flairPolicy,
  memberCount,
  membershipMode,
  moderator,
  referenceLinks,
  rules,
}: CommunitySidebarProps) {
  const isMobile = useIsMobile();

  const activeRules = (rules ?? [])
    .filter((r) => r.status === "active")
    .sort((a, b) => a.position - b.position);

  const activeLinks = (referenceLinks ?? [])
    .filter((l) => l.linkStatus === "active")
    .sort((a, b) => a.position - b.position);

  const hasFlairs =
    flairPolicy?.flairEnabled === true &&
    flairPolicy.definitions.some((f) => f.status === "active");

  const AccessIcon = membershipMode === "open" ? Globe : Lock;

  const accessLabel = membershipMode === "open"
    ? "Open"
    : membershipMode === "request"
      ? "Request to join"
      : "Gated";

  const content = (
    <div className="flex flex-col gap-5">
      <div className="flex flex-col gap-1.5">
        <h2 className="text-lg font-semibold leading-tight">{displayName}</h2>
        {description && (
          <p className="line-clamp-3 text-base leading-snug text-muted-foreground">
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
        <div className="flex flex-col gap-1.5 text-base text-muted-foreground">
          <div className="flex items-center gap-2">
            <AccessIcon className="size-5 text-muted-foreground/50" />
            <span>{accessLabel}</span>
          </div>
          <div className="text-muted-foreground/70">
            Created {formatCreatedDate(createdAt)}
          </div>
        </div>
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
        defaultValue={["links", "rules", "tags"]}
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

        {activeRules.length > 0 && (
          <AccordionItem className="border-b-0" value="rules">
            <AccordionTrigger className={SECTION_LABEL}>Rules</AccordionTrigger>
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
          "sticky top-[4.5rem] w-[352px] shrink-0",
          "max-h-[calc(100dvh-4.5rem-3rem)] overflow-y-auto",
          className,
        )}
      >
        <div className="rounded-lg bg-card px-4 py-4">{content}</div>
      </aside>
    </SidebarProvider>
  );
}
