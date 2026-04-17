"use client";

import { Avatar } from "@/components/primitives/avatar";
import { Button } from "@/components/primitives/button";
import { cn } from "@/lib/utils";
import type { ProfileData } from "./profile-page.types";

function ProfileHeroActions({
  onEditProfile,
  profile,
}: {
  onEditProfile?: () => void;
  profile: ProfileData;
}) {
  if (profile.viewerContext === "self") {
    return (
      <>
        <Button className="flex-1 sm:flex-none" onClick={onEditProfile}>Edit profile</Button>
        <Button className="flex-1 sm:flex-none" variant="secondary">
          Share profile
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
        {profile.viewerFollows ? "Following" : "Follow"}
      </Button>
      <Button
        className="flex-1 sm:flex-none"
        disabled={!profile.canMessage}
        variant="secondary"
      >
        Message
      </Button>
    </>
  );
}

export function ProfileHero({
  onEditProfile,
  profile,
}: {
  onEditProfile?: () => void;
  profile: ProfileData;
}) {
  const bannerStyle = profile.bannerSrc
    ? {
        backgroundImage: `url(${profile.bannerSrc})`,
        backgroundPosition: "center",
        backgroundSize: "cover",
      }
    : undefined;

  return (
    <section className="overflow-hidden rounded-[var(--radius-4xl)] border border-border-soft bg-card shadow-[var(--shadow-lg)]">
      <div
        className={cn("h-40 bg-muted", profile.bannerSrc && "bg-none")}
        style={bannerStyle}
      />
      <div className="flex flex-col gap-5 px-5 pb-6 pt-5 lg:px-8 lg:pb-8">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end">
            <Avatar
              className="-mt-16 size-24 border-background bg-card shadow-[var(--shadow-lg)]"
              fallback={profile.displayName}
              size="lg"
              src={profile.avatarSrc}
            />
            <div className="space-y-2">
              <div className="space-y-1">
                <h1 className="text-3xl font-semibold tracking-tight text-foreground">
                  {profile.displayName}
                </h1>
                <div className="text-base text-muted-foreground">
                  {profile.tagline ?? profile.handle}
                </div>
              </div>
              {profile.bio ? (
                <p className="max-w-3xl text-base leading-7 text-muted-foreground">{profile.bio}</p>
              ) : null}
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
            </div>
          </div>

          {profile.viewerContext === "self" ? (
            <div className="hidden flex-wrap gap-3 lg:flex">
              <ProfileHeroActions onEditProfile={onEditProfile} profile={profile} />
            </div>
          ) : null}
        </div>

        <div
          className={cn(
            "flex flex-wrap gap-3",
            profile.viewerContext === "self" ? "lg:hidden" : "xl:hidden",
          )}
        >
          <ProfileHeroActions onEditProfile={onEditProfile} profile={profile} />
        </div>
      </div>
    </section>
  );
}
