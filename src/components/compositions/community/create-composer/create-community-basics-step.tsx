"use client";

import { Avatar } from "@/components/primitives/avatar";
import { Input } from "@/components/primitives/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/primitives/select";
import { Textarea } from "@/components/primitives/textarea";
import { Type } from "@/components/primitives/type";
import { cn } from "@/lib/utils";

import {
  acceptedCommunityImageTypes,
  FieldLabel,
  MediaPicker,
  Section,
} from "./create-community-composer.sections";
import type { CommunityDatabaseRegion } from "./create-community-composer.types";
import { DATABASE_REGION_OPTIONS } from "./create-community-composer.types";
import type { CreateCommunityComposerController } from "./use-create-community-composer-controller";

export function CreateCommunityBasicsStep({
  controller,
}: {
  controller: CreateCommunityComposerController;
}) {
  const { basics, copy, isMobile } = controller;

  return (
    <Section title="">
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(20rem,0.95fr)]">
        <div className="grid content-start gap-4">
          <div>
            <FieldLabel label={copy.displayNameLabel} />
            <Input
              className="h-12 rounded-[var(--radius-lg)]"
              onChange={(e) => basics.setActiveDisplayName(e.target.value)}
              placeholder={copy.displayNamePlaceholder}
              value={basics.activeDisplayName}
            />
          </div>

          <div>
            <FieldLabel label={copy.descriptionLabel} />
            <Textarea
              className="min-h-32"
              onChange={(e) => basics.setActiveDescription(e.target.value)}
              placeholder={copy.descriptionPlaceholder}
              value={basics.activeDescription}
            />
          </div>

          <div>
            <FieldLabel label={copy.databaseRegionLabel} />
            <Select
              onValueChange={(value) => basics.setActiveDatabaseRegion(value as CommunityDatabaseRegion)}
              value={basics.activeDatabaseRegion}
            >
              <SelectTrigger className="h-12 rounded-[var(--radius-lg)]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {DATABASE_REGION_OPTIONS.map((option) => (
                  <SelectItem key={option} value={option}>
                    {({
                      auto: copy.databaseRegionUsEast,
                      "aws-us-east-1": copy.databaseRegionUsEast,
                      "aws-us-east-2": copy.databaseRegionUsCentral,
                      "aws-us-west-2": copy.databaseRegionUsWest,
                      "aws-eu-west-1": copy.databaseRegionEurope,
                      "aws-ap-south-1": copy.databaseRegionIndia,
                      "aws-ap-northeast-1": copy.databaseRegionJapan,
                    })[option]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="hidden rounded-[var(--radius-lg)] border border-border-soft bg-card px-5 py-5 lg:block">
          <Type as="h3" variant="h4" className="mb-4">{copy.preview}</Type>
          <div className="overflow-hidden rounded-[var(--radius-lg)] border border-border-soft bg-background">
            <div
              className="h-36 w-full border-b border-border-soft bg-cover bg-center"
              style={{
                backgroundColor: "color-mix(in oklab, var(--primary) 18%, var(--card))",
                backgroundImage: `linear-gradient(135deg, color-mix(in oklab, var(--primary) 24%, transparent), color-mix(in oklab, var(--background) 18%, transparent)), url(${basics.previewBannerSrc})`,
              }}
            />
            <div className="-mt-8 flex items-end gap-5 bg-card px-5 pb-5">
              <Avatar
                className="h-24 w-24 border-4 border-card bg-card"
                fallback={basics.previewDisplayName}
                size="lg"
                src={basics.previewAvatarSrc}
              />
              <div className="min-w-0 space-y-1 pb-3">
                <p className="truncate text-2xl font-semibold text-foreground">
                  {basics.previewDisplayName}
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className={cn("border-t border-border-soft pt-6 lg:col-span-2", isMobile && "border-t-0 pt-1")}>
          <Section title="">
            <div className="grid gap-4 md:grid-cols-2">
              <MediaPicker
                accept={acceptedCommunityImageTypes}
                file={basics.activeAvatarFile}
                label={copy.avatarLabel}
                onRemove={() => basics.setActiveAvatarFile(null)}
                onSelect={(file) => {
                  basics.setActiveAvatarFile(file);
                  if (file) {
                    basics.setActiveAvatarRef("");
                  }
                }}
              />
              <MediaPicker
                accept={acceptedCommunityImageTypes}
                file={basics.activeBannerFile}
                label={copy.bannerLabel}
                onRemove={() => basics.setActiveBannerFile(null)}
                onSelect={(file) => {
                  basics.setActiveBannerFile(file);
                  if (file) {
                    basics.setActiveBannerRef("");
                  }
                }}
              />
            </div>
          </Section>
        </div>
      </div>
    </Section>
  );
}
