"use client";

import { IdentityHero } from "@/components/compositions/identity-hero/identity-hero";
import { Button } from "@/components/primitives/button";
import { useUiLocale } from "@/lib/ui-locale";
import { getLocaleMessages } from "@/locales";
import type { ProfileData, ProfileSidebarStat } from "./profile-page.types";
import { Type } from "@/components/primitives/type";

function formatStatValue(value: string | number, localeTag: string) {
  return typeof value === "number" ? value.toLocaleString(localeTag) : value;
}

function ProfileHeroActions({
  onEditProfile,
  profile,
}: {
  onEditProfile?: () => void;
  profile: ProfileData;
}) {
  const { locale } = useUiLocale();
  const copy = getLocaleMessages(locale, "routes").profile;

  if (profile.viewerContext === "self") {
    return (
      <>
        <Button className="flex-1 sm:flex-none" onClick={onEditProfile}>{copy.editProfile}</Button>
        <Button className="flex-1 sm:flex-none" variant="secondary">
          {copy.shareProfile}
        </Button>
      </>
    );
  }

  return (
    <>
      <Button
        className="flex-1 sm:flex-none"
        disabled={profile.followDisabled}
        loading={profile.followBusy}
        onClick={profile.onToggleFollow}
        variant={profile.viewerFollows ? "secondary" : "default"}
      >
        {profile.viewerFollows ? copy.following : copy.follow}
      </Button>
      <Button
        className="flex-1 sm:flex-none"
        disabled={!profile.canMessage}
        variant="secondary"
      >
        {copy.message}
      </Button>
    </>
  );
}

export function ProfileHero({
  localeTag,
  onEditProfile,
  profile,
  stats = [],
}: {
  localeTag?: string;
  onEditProfile?: () => void;
  profile: ProfileData;
  stats?: ProfileSidebarStat[];
}) {
  const details = (
    <>
      {profile.meta?.length ? (
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-base text-muted-foreground">
          {profile.meta.map((item) => (
            <div className="flex items-center gap-2" key={item.label}>
              <span className="font-medium text-foreground">{item.value}</span>
              <span>{item.label}</span>
            </div>
          ))}
        </div>
      ) : null}
      {stats.length ? (
        <dl className="grid grid-cols-3 gap-x-4 gap-y-3 pt-1 md:hidden">
          {stats.map((stat) => (
            <div className="min-w-0" key={stat.label}>
              <dt className="text-base text-muted-foreground">{stat.label}</dt>
              <Type as="dd" variant="h4" className="truncate">
                {formatStatValue(stat.value, localeTag ?? "en-US")}
              </Type>
            </div>
          ))}
        </dl>
      ) : null}
    </>
  );

  return (
    <IdentityHero
      actions={<ProfileHeroActions onEditProfile={onEditProfile} profile={profile} />}
      avatarBadgeCountryCode={profile.nationalityBadgeCountryCode}
      avatarBadgeLabel={profile.nationalityBadgeLabel}
      avatarFallback={profile.displayName}
      avatarSrc={profile.avatarSrc}
      coverSrc={profile.bannerSrc}
      details={details}
      subtitle={profile.tagline ?? profile.handle}
      title={profile.displayName}
    />
  );
}
