"use client";

import * as React from "react";
import { useIsMobile } from "@/hooks/use-mobile";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/primitives/accordion";
import { CommunityAvatar } from "@/components/primitives/community-avatar";
import { SidebarProvider } from "@/components/compositions/system/sidebar/sidebar";
import { useUiLocale } from "@/lib/ui-locale";
import { resolveLocaleLanguageTag } from "@/lib/ui-locale-core";
import { getLocaleMessages } from "@/locales";
import { cn } from "@/lib/utils";
import { CommunitySidebarCharity } from "./community-sidebar-charity";
import { CommunitySidebarFlairs } from "./community-sidebar-flairs";
import { CommunitySidebarLinks } from "./community-sidebar-links";
import { CommunitySidebarRoleHolderComponent } from "./community-sidebar-role-holder";
import { CommunitySidebarRules } from "./community-sidebar-rules";
import type { CommunitySidebarProps } from "./community-sidebar.types";
import { Type } from "@/components/primitives/type";

function formatMemberCount(count: number, localeTag: string): string {
  if (count >= 1_000_000) return `${(count / 1_000_000).toFixed(1)}M`;
  if (count >= 10_000) return `${(count / 1_000).toFixed(1)}K`;
  if (count >= 1_000) return `${(count / 1_000).toFixed(1)}K`;
  return count.toLocaleString(localeTag);
}

const SECTION_LABEL =
  "py-3 text-base font-semibold uppercase tracking-widest text-sidebar-foreground/55 hover:no-underline";

function CommunitySidebarSections({
  charity,
  description,
  flairPolicy,
  followerCount,
  memberCount,
  owner,
  moderators,
  requirements,
  referenceLinks,
  rules,
  showDescriptionSection = false,
}: Pick<
  CommunitySidebarProps,
  "charity" | "description" | "flairPolicy" | "followerCount" | "memberCount" | "owner" | "moderators" | "requirements" | "referenceLinks" | "rules"
> & {
  showDescriptionSection?: boolean;
}) {
  const { locale } = useUiLocale();
  const copy = getLocaleMessages(locale, "routes").community;
  const localeTag = resolveLocaleLanguageTag(locale);
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

  return (
    <>
      {showDescriptionSection && description ? (
        <div className="flex flex-col gap-1.5">
          <div className={SECTION_LABEL}>{copy.aboutTab}</div>
          <Type as="p" variant="caption">{description}</Type>
        </div>
      ) : null}

      {followerCount != null || memberCount != null ? (
        <div className="grid grid-cols-2 gap-4">
          {followerCount != null ? (
            <div className="flex min-w-0 flex-col">
              <Type as="span" variant="h3" className="leading-none tabular-nums">
                {formatMemberCount(followerCount, localeTag)}
              </Type>
              <Type as="span" variant="caption" className="mt-0.5 /60">
                {copy.followersLabel}
              </Type>
            </div>
          ) : null}
          {memberCount != null ? (
            <div className="flex min-w-0 flex-col">
              <Type as="span" variant="h3" className="leading-none tabular-nums">
                {formatMemberCount(memberCount, localeTag)}
              </Type>
              <Type as="span" variant="caption" className="mt-0.5 /60">
                {copy.citizensLabel}
              </Type>
            </div>
          ) : null}
        </div>
      ) : null}

      {owner && (
        <div className="flex flex-col gap-1.5">
          <div className={SECTION_LABEL}>{copy.ownerLabel}</div>
          <CommunitySidebarRoleHolderComponent roleHolder={owner} />
        </div>
      )}
      {moderators.length > 0 && (
        <div className="flex flex-col gap-1.5">
          <div className={SECTION_LABEL}>{copy.moderatorsLabel}</div>
          {moderators.map((mod) => (
            <CommunitySidebarRoleHolderComponent key={mod.user_id} roleHolder={mod} />
          ))}
        </div>
      )}

      {charity && (
        <div className="flex flex-col gap-1.5">
          <div className={SECTION_LABEL}>{copy.charityLabel}</div>
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
            <AccordionTrigger className={SECTION_LABEL}>{copy.linksLabel}</AccordionTrigger>
            <AccordionContent className="pb-0">
              <CommunitySidebarLinks links={activeLinks} />
            </AccordionContent>
          </AccordionItem>
        )}

        {activeRequirements.length > 0 && (
          <AccordionItem className="border-b-0" value="requirements">
            <AccordionTrigger className={SECTION_LABEL}>{copy.requirementsLabel}</AccordionTrigger>
            <AccordionContent className="pb-0">
              <ul className="list-disc space-y-1.5 ps-5 text-base leading-snug text-muted-foreground">
                {activeRequirements.map((requirement) => (
                  <li key={requirement}>{requirement}</li>
                ))}
              </ul>
            </AccordionContent>
          </AccordionItem>
        )}

        {showRulesSection && (
          <AccordionItem className="border-b-0" value="rules">
            <AccordionTrigger className={SECTION_LABEL}>{copy.rulesLabel}</AccordionTrigger>
            <AccordionContent className="pb-0">
              <CommunitySidebarRules rules={activeRules} />
            </AccordionContent>
          </AccordionItem>
        )}

        {hasFlairs && (
          <AccordionItem className="border-b-0" value="tags">
            <AccordionTrigger className={SECTION_LABEL}>{copy.tagsLabel}</AccordionTrigger>
            <AccordionContent className="pb-0">
              <CommunitySidebarFlairs flairPolicy={flairPolicy!} />
            </AccordionContent>
          </AccordionItem>
        )}
      </Accordion>
    </>
  );
}

export function CommunitySidebarDetails({
  charity,
  className,
  description,
  flairPolicy,
  followerCount,
  memberCount,
  owner,
  moderators,
  requirements,
  referenceLinks,
  rules,
}: Pick<
  CommunitySidebarProps,
  "charity" | "className" | "description" | "flairPolicy" | "followerCount" | "memberCount" | "owner" | "moderators" | "requirements" | "referenceLinks" | "rules"
>) {
  return (
    <div className={cn("rounded-lg bg-card px-4 py-4", className)}>
      <div className="flex flex-col gap-5">
        <CommunitySidebarSections
          charity={charity}
          description={description}
          flairPolicy={flairPolicy}
          followerCount={followerCount}
          memberCount={memberCount}
          owner={owner}
          moderators={moderators}
          referenceLinks={referenceLinks}
          requirements={requirements}
          rules={rules}
          showDescriptionSection
        />
      </div>
    </div>
  );
}

export function CommunitySidebar({
  avatarSrc,
  charity,
  className,
  communityId,
  description,
  displayName,
  flairPolicy,
  followerCount,
  memberCount,
  owner,
  moderators,
  requirements,
  referenceLinks,
  rules,
}: CommunitySidebarProps) {
  const isMobile = useIsMobile();

  const content = (
    <div className="flex flex-col gap-5">
      <div className="grid grid-cols-[auto_minmax(0,1fr)] items-center gap-x-3 gap-y-2">
        <CommunityAvatar
          avatarSrc={avatarSrc}
          communityId={communityId ?? displayName}
          displayName={displayName}
          size="md"
        />
        <Type as="h2" variant="h4" className="min-w-0">{displayName}</Type>
        {description && (
          <Type as="p" variant="caption" className="col-span-2 min-w-0 ">
            {description}
          </Type>
        )}
      </div>

      <CommunitySidebarSections
        charity={charity}
        description={description}
        flairPolicy={flairPolicy}
        followerCount={followerCount}
        memberCount={memberCount}
        owner={owner}
        moderators={moderators}
        referenceLinks={referenceLinks}
        requirements={requirements}
        rules={rules}
      />
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
          "sticky top-[var(--header-height)] w-full shrink-0",
          "max-h-[calc(100dvh-4.5rem-3rem)] overflow-y-auto",
          className,
        )}
      >
        <div className="rounded-lg bg-card px-4 py-4">{content}</div>
      </aside>
    </SidebarProvider>
  );
}
