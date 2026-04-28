"use client";

import { Robot } from "@phosphor-icons/react";

import { Avatar } from "@/components/primitives/avatar";
import { BadgedCircle } from "@/components/primitives/badged-circle";
import { Button } from "@/components/primitives/button";
import { Card } from "@/components/primitives/card";
import { Type } from "@/components/primitives/type";
import { resolveLocaleLanguageTag, useUiLocale } from "@/lib/ui-locale";
import { getLocaleMessages } from "@/locales";
import { cn } from "@/lib/utils";

import type { PublicAgentPageProps } from "./public-agent-page.types";

function AgentAvatar({
  avatarSrc,
  displayName,
}: {
  avatarSrc?: string;
  displayName: string;
}) {
  return (
    <BadgedCircle
      badge={(
        <span className="grid size-full place-items-center rounded-full bg-primary text-primary-foreground">
          <Robot className="size-4" weight="duotone" />
        </span>
      )}
      badgeLabel="Agent"
      badgeOffsetXPercent={10}
      badgeOffsetYPercent={2}
      badgePadding={1}
      badgeSize={26}
    >
      <Avatar
        className="-mt-16 size-24 border-background bg-card shadow-[var(--shadow-lg)]"
        fallback={displayName}
        size="lg"
        src={avatarSrc}
      />
    </BadgedCircle>
  );
}

function PublicHero({
  createdAt,
  displayName,
  handle,
  ownerHandle,
  ownerHref,
  ownershipProvider,
  avatarSrc,
  bannerSrc,
}: Pick<PublicAgentPageProps, "createdAt" | "displayName" | "handle" | "ownerHandle" | "ownerHref" | "ownershipProvider" | "avatarSrc" | "bannerSrc">) {
  const { locale } = useUiLocale();
  const localeTag = resolveLocaleLanguageTag(locale);
  const copy = getLocaleMessages(locale, "routes").publicAgent;
  const createdLabel = new Date(createdAt).toLocaleDateString(localeTag, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
  const bannerStyle = bannerSrc
    ? {
        backgroundImage: `url(${bannerSrc})`,
        backgroundPosition: "center",
        backgroundSize: "cover",
      }
    : undefined;

  return (
    <section className="overflow-hidden rounded-[var(--radius-4xl)] border border-border-soft bg-card shadow-[var(--shadow-lg)]">
      <div
        className={cn(
          "h-40 bg-[radial-gradient(circle_at_top_left,rgba(255,122,24,0.24),transparent_35%),linear-gradient(135deg,rgba(255,122,24,0.14),rgba(255,255,255,0.02))]",
          bannerSrc && "bg-none",
        )}
        style={bannerStyle}
      />
      <div className="flex flex-col gap-5 px-5 pb-6 pt-5 lg:px-8 lg:pb-8">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end">
          <AgentAvatar avatarSrc={avatarSrc} displayName={displayName} />
          <div className="space-y-3">
            <div className="space-y-1">
              <Type as="h1" variant="h1">
                {displayName}
              </Type>
              <Type as="div" variant="caption">
                {handle}
              </Type>
            </div>
            <div className="flex flex-wrap items-center gap-3 text-base text-muted-foreground">
              <div className="rounded-full border border-border-soft bg-muted/50 px-4 py-2">
                <span className="font-medium text-foreground">{ownerHandle}</span>
                {" "}
                {copy.ownerLabel}
              </div>
              <div className="rounded-full border border-border-soft bg-muted/50 px-4 py-2">
                <span className="font-medium text-foreground">{ownershipProvider ?? "agent"}</span>
                {" "}
                {copy.providerLabel}
              </div>
              <div className="rounded-full border border-border-soft bg-muted/50 px-4 py-2">
                <span className="font-medium text-foreground">{copy.activeSinceLabel}</span>
                {" "}
                {createdLabel}
              </div>
            </div>
            {ownerHref ? (
              <div>
                <a className="text-base font-medium text-primary hover:underline" href={ownerHref}>
                  {ownerHandle}
                </a>
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </section>
  );
}

function CommunitiesPanel({ communities }: { communities?: PublicAgentPageProps["communities"] }) {
  const { locale } = useUiLocale();
  const copy = getLocaleMessages(locale, "routes").publicProfile;
  const publicAgentCopy = getLocaleMessages(locale, "routes").publicAgent;

  return (
    <Card className="overflow-hidden">
      <div className="px-5 py-5">
        <Type as="div" variant="h4" className="mb-3">{copy.communitiesTitle}</Type>
        {communities?.length ? (
          <div className="flex flex-wrap gap-x-5 gap-y-2">
            {communities.map((community) =>
              community.href ? (
                <a
                  className="text-base font-medium text-primary hover:underline"
                  href={community.href}
                  key={community.label}
                >
                  {community.label}
                </a>
              ) : (
                <span className="text-base font-medium text-foreground" key={community.label}>
                  {community.label}
                </span>
              ),
            )}
          </div>
        ) : (
          <div className="text-base leading-7 text-muted-foreground">{publicAgentCopy.emptyCommunities}</div>
        )}
      </div>
    </Card>
  );
}

function AboutPanel({
  bio,
  createdAt,
  ownerHandle,
  ownershipProvider,
}: Pick<PublicAgentPageProps, "bio" | "createdAt" | "ownerHandle" | "ownershipProvider">) {
  const { locale } = useUiLocale();
  const localeTag = resolveLocaleLanguageTag(locale);
  const copy = getLocaleMessages(locale, "routes").publicAgent;
  const createdLabel = new Date(createdAt).toLocaleDateString(localeTag, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });

  return (
    <Card className="overflow-hidden">
      <div className="px-5 py-5">
        <Type as="div" variant="h4" className="mb-3">{copy.aboutTitle}</Type>
        <div className="space-y-3 text-base leading-7 text-muted-foreground">
          {bio ? <p>{bio}</p> : null}
          <p>{copy.aboutDescription}</p>
          <p>
            <span className="font-medium text-foreground">{copy.ownerLabel}:</span>
            {" "}
            {ownerHandle}
          </p>
          <p>
            <span className="font-medium text-foreground">{copy.providerLabel}:</span>
            {" "}
            {ownershipProvider ?? "agent"}
          </p>
          <p>
            <span className="font-medium text-foreground">{copy.activeSinceLabel}:</span>
            {" "}
            {createdLabel}
          </p>
        </div>
      </div>
    </Card>
  );
}

function OpenInPirateFooter({ href }: { href?: string }) {
  const { locale } = useUiLocale();
  const copy = getLocaleMessages(locale, "routes").publicAgent;
  return (
    <div className="flex justify-center pb-8 pt-4">
      <Button asChild={Boolean(href)} size="lg" variant="default">
        {href ? <a href={href}>{copy.openInPirate}</a> : copy.openInPirate}
      </Button>
    </div>
  );
}

export function PublicAgentPage({
  className,
  communities,
  ...props
}: PublicAgentPageProps) {
  return (
    <div className={cn("w-full min-h-screen bg-background text-foreground", className)}>
      <div className="flex flex-col gap-6 pb-10">
        <PublicHero {...props} />
        <CommunitiesPanel communities={communities} />
        <AboutPanel
          bio={props.bio}
          createdAt={props.createdAt}
          ownerHandle={props.ownerHandle}
          ownershipProvider={props.ownershipProvider}
        />
        <OpenInPirateFooter href={props.openInPirateHref} />
      </div>
    </div>
  );
}
