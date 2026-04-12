"use client";

import { Avatar } from "@/components/primitives/avatar";
import { Button } from "@/components/primitives/button";
import { cn } from "@/lib/utils";
import type { ProfileData } from "./profile-page.types";

function ProfileHeroActions({
  profile,
}: {
  profile: ProfileData;
}) {
  if (profile.viewerContext === "self") {
    return (
      <>
        <Button className="flex-1 sm:flex-none">Edit profile</Button>
        <Button className="flex-1 sm:flex-none" variant="secondary">
          Share profile
        </Button>
      </>
    );
  }

  return (
    <>
      <Button className="flex-1 sm:flex-none" variant={profile.viewerFollows ? "secondary" : "default"}>
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
  profile,
}: {
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
    <section className="overflow-hidden md:rounded-[var(--radius-4xl)] md:border md:border-border-soft md:bg-card md:shadow-[var(--shadow-lg)]">
      <div
        className={cn("h-28 bg-muted md:h-40", profile.bannerSrc && "bg-none")}
        style={bannerStyle}
      />
      <div className="flex flex-col gap-5 px-0 pb-2 pt-4 md:px-5 md:pb-6 md:pt-5 lg:px-8 lg:pb-8">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div className="flex items-end gap-4">
            <Avatar
              className="-mt-10 size-20 border-4 border-background bg-card shadow-[var(--shadow-lg)] md:-mt-16 md:size-24"
              fallback={profile.displayName}
              size="lg"
              src={profile.avatarSrc}
            />
            <div className="min-w-0 space-y-2 pb-1">
              <div className="space-y-1">
                <h1 className="truncate text-3xl font-semibold tracking-tight text-foreground">
                  {profile.displayName}
                </h1>
                <div className="truncate text-base text-muted-foreground">
                  {profile.tagline ?? profile.handle}
                </div>
              </div>
            </div>
          </div>

          {profile.viewerContext === "self" ? (
            <div className="hidden flex-wrap gap-3 lg:flex">
              <ProfileHeroActions profile={profile} />
            </div>
          ) : null}
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

        <div
          className={cn(
            "flex flex-wrap gap-3",
            profile.viewerContext === "self" ? "lg:hidden" : "xl:hidden",
          )}
        >
          <ProfileHeroActions profile={profile} />
        </div>
      </div>
    </section>
  );
}
