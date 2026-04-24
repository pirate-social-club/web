"use client";

import { Card } from "@/components/primitives/card";
import { Separator } from "@/components/primitives/separator";
import { VerificationRows } from "./profile-activity-panels";
import type { ProfilePageProps, ProfileSidebarStat } from "./profile-page.types";
import { cn } from "@/lib/utils";
import { resolveLocaleLanguageTag, useUiLocale } from "@/lib/ui-locale";
import { getLocaleMessages } from "@/locales";
import { Type } from "@/components/primitives/type";

function formatStatValue(value: string | number, localeTag: string) {
  return typeof value === "number" ? value.toLocaleString(localeTag) : value;
}

function SidebarStats({ stats, localeTag }: { stats: ProfileSidebarStat[]; localeTag: string }) {
  return (
    <dl className="grid grid-cols-2 gap-x-5 gap-y-5 px-5 py-5">
      {stats.map((stat) => (
        <div className="space-y-1" key={stat.label}>
          <dt className="text-base text-muted-foreground">{stat.label}</dt>
          <Type as="dd" variant="h3">
            {formatStatValue(stat.value, localeTag)}
          </Type>
          {stat.note ? (
            <div className="text-base leading-6 text-muted-foreground">{stat.note}</div>
          ) : null}
        </div>
      ))}
    </dl>
  );
}

function ProfileStatsCard({
  description,
  stats,
  localeTag,
}: {
  description?: string;
  stats: ProfileSidebarStat[];
  localeTag: string;
}) {
  return (
    <Card className="overflow-hidden">
      {description ? (
        <>
          <Type as="p" variant="caption" className="px-5 py-5">
            {description}
          </Type>
          <Separator />
        </>
      ) : null}
      <SidebarStats localeTag={localeTag} stats={stats} />
    </Card>
  );
}

function VerificationCard({
  verificationItems,
}: {
  verificationItems: NonNullable<ProfilePageProps["rightRail"]["verificationItems"]>;
}) {
  const { locale } = useUiLocale();
  const copy = getLocaleMessages(locale, "routes").profile;

  return (
    <Card className="overflow-hidden">
      <div className="border-b border-border px-5 py-4">
        <Type as="h2" variant="h4">{copy.verificationTitle}</Type>
      </div>
      <VerificationRows verificationItems={verificationItems} />
    </Card>
  );
}

export function ProfileRightRail({
  className,
  rightRail,
}: {
  className?: string;
  rightRail: ProfilePageProps["rightRail"];
}) {
  const { locale } = useUiLocale();
  const localeTag = resolveLocaleLanguageTag(locale);

  return (
    <aside className={cn("flex flex-col gap-4", className)}>
      <ProfileStatsCard description={rightRail.description} localeTag={localeTag} stats={rightRail.stats} />
      {rightRail.verificationItems?.length ? (
        <VerificationCard verificationItems={rightRail.verificationItems} />
      ) : null}
    </aside>
  );
}
