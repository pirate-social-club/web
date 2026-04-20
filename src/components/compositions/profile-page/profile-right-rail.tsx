"use client";

import { DotsThree } from "@phosphor-icons/react";

import { Button } from "@/components/primitives/button";
import { Card } from "@/components/primitives/card";
import { CopyField } from "@/components/primitives/copy-field";
import { IconButton } from "@/components/primitives/icon-button";
import { VerificationRows } from "./profile-activity-panels";
import type { ProfileData, ProfilePageProps, ProfileSidebarStat } from "./profile-page.types";
import { cn } from "@/lib/utils";
import { useUiLocale, resolveLocaleLanguageTag } from "@/lib/ui-locale";
import { getLocaleMessages } from "@/locales";

function formatStatValue(value: string | number, localeTag: string) {
  return typeof value === "number" ? value.toLocaleString(localeTag) : value;
}

function SidebarStats({ stats, localeTag }: { stats: ProfileSidebarStat[]; localeTag: string }) {
  return (
    <dl className="grid grid-cols-2 gap-x-5 gap-y-5 px-5 py-5">
      {stats.map((stat) => (
        <div className="space-y-1" key={stat.label}>
          <dt className="text-base text-muted-foreground">{stat.label}</dt>
          <dd className="text-xl font-semibold tracking-tight text-foreground">
            {formatStatValue(stat.value, localeTag)}
          </dd>
          {stat.note ? (
            <div className="text-base leading-6 text-muted-foreground">{stat.note}</div>
          ) : null}
        </div>
      ))}
    </dl>
  );
}

function PublicProfileActionsCard({
  profile,
}: {
  profile: ProfileData;
}) {
  const { locale } = useUiLocale();
  const copy = getLocaleMessages(locale, "routes").profile;

  if (profile.viewerContext === "self") {
    return null;
  }

  return (
    <Card className="hidden overflow-hidden xl:block">
      <div className="flex items-start justify-between gap-4 px-5 py-5">
        <div className="space-y-1">
          <div className="text-xl font-semibold tracking-tight text-foreground">
            {profile.displayName}
          </div>
          <div className="text-base text-muted-foreground">{profile.handle}</div>
        </div>
        <IconButton aria-label={copy.moreActions} size="sm" variant="secondary">
          <DotsThree className="size-5" weight="bold" />
        </IconButton>
      </div>
      <div className="flex gap-3 px-5 pb-5">
        <Button
          className="flex-1"
          disabled={profile.followDisabled}
          loading={profile.followBusy}
          onClick={profile.onToggleFollow}
          variant={profile.viewerFollows ? "secondary" : "default"}
        >
          {profile.viewerFollows ? copy.following : copy.follow}
        </Button>
        <Button className="flex-1" disabled={!profile.canMessage} variant="secondary">
          {copy.message}
        </Button>
      </div>
    </Card>
  );
}

function ProfileStatsCard({
  stats,
  localeTag,
}: {
  stats: ProfileSidebarStat[];
  localeTag: string;
}) {
  return (
    <Card className="overflow-hidden">
      <SidebarStats localeTag={localeTag} stats={stats} />
    </Card>
  );
}

function WalletCard({ walletAddress }: { walletAddress: string }) {
  const { locale } = useUiLocale();
  const copy = getLocaleMessages(locale, "routes").profile;

  return (
    <Card className="overflow-hidden">
      <div className="border-b border-border px-5 py-4">
        <h2 className="text-lg font-semibold text-foreground">{copy.walletTitle}</h2>
      </div>
      <div className="px-5 py-5">
        <CopyField value={walletAddress} />
      </div>
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
        <h2 className="text-lg font-semibold text-foreground">{copy.verificationTitle}</h2>
      </div>
      <VerificationRows verificationItems={verificationItems} />
    </Card>
  );
}

export function ProfileRightRail({
  className,
  profile,
  rightRail,
}: {
  className?: string;
  profile: ProfileData;
  rightRail: ProfilePageProps["rightRail"];
}) {
  const { locale } = useUiLocale();
  const localeTag = resolveLocaleLanguageTag(locale);

  return (
    <aside className={cn("flex flex-col gap-4", className)}>
      <PublicProfileActionsCard profile={profile} />
      <ProfileStatsCard localeTag={localeTag} stats={rightRail.stats} />
      {rightRail.walletAddress ? <WalletCard walletAddress={rightRail.walletAddress} /> : null}
      {rightRail.verificationItems?.length ? (
        <VerificationCard verificationItems={rightRail.verificationItems} />
      ) : null}
    </aside>
  );
}
