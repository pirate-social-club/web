"use client";

import { IdentityHero } from "@/components/compositions/profiles/identity-hero/identity-hero";
import { Button } from "@/components/primitives/button";
import { useIsMobile } from "@/hooks/use-mobile";
import { useUiLocale } from "@/lib/ui-locale";
import { getLocaleMessages } from "@/locales";
import type { ProfileData, ProfileSidebarStat } from "./profile-page.types";
import { Type } from "@/components/primitives/type";

function formatStatValue(value: string | number, localeTag: string) {
  return typeof value === "number" ? value.toLocaleString(localeTag) : value;
}

function ProfileHeroActions({
  onEditProfile,
  onMessageProfile,
  profile,
}: {
  onEditProfile?: () => void;
  onMessageProfile?: () => void;
  profile: ProfileData;
}) {
  const { locale } = useUiLocale();
  const copy = getLocaleMessages(locale, "routes").profile;

  if (profile.viewerContext === "self") {
    return (
      <div>
        <Button className="flex-1 sm:flex-none" onClick={onEditProfile}>{copy.editProfile}</Button>
      </div>
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
        disabled={!profile.canMessage || !onMessageProfile}
        onClick={onMessageProfile}
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
  onMessageProfile,
  profile,
  stats = [],
}: {
  localeTag?: string;
  onEditProfile?: () => void;
  onMessageProfile?: () => void;
  profile: ProfileData;
  stats?: ProfileSidebarStat[];
}) {
  const isMobile = useIsMobile();
  const meta = profile.meta ?? [];
  const showMeta = meta.length > 0;
  const showMobileStats = isMobile && stats.length > 0;
  const details = showMeta || showMobileStats ? (
    <>
      {showMeta ? (
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-base text-muted-foreground">
          {meta.map((item) => (
            <div className="flex items-center gap-2" key={item.label}>
              <span className="font-medium text-foreground">{item.value}</span>
              <span>{item.label}</span>
            </div>
          ))}
        </div>
      ) : null}
      {showMobileStats ? (
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
  ) : undefined;

  return (
    <IdentityHero
      actions={<ProfileHeroActions onEditProfile={onEditProfile} onMessageProfile={onMessageProfile} profile={profile} />}
      avatarBadgeCountryCode={profile.nationalityBadgeCountryCode}
      avatarBadgeLabel={profile.nationalityBadgeLabel}
      avatarFallback={profile.displayName}
      avatarFallbackSeed={profile.avatarSeed}
      avatarSrc={profile.avatarSrc}
      coverClassName="bg-background md:h-60"
      coverOverlay={<div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-black/5 via-transparent to-black/45" />}
      coverSrc={profile.bannerSrc}
      details={details}
      subtitle={isMobile ? undefined : profile.tagline ?? profile.handle}
      title={profile.displayName}
    />
  );
}
