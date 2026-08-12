import * as React from "react";

import { Avatar } from "@/components/primitives/avatar";
import { Button } from "@/components/primitives/button";
import { Card, CardContent } from "@/components/primitives/card";
import { Separator } from "@/components/primitives/separator";
import { Type } from "@/components/primitives/type";
import { formatCentsAsUsdc } from "@/lib/formatting/currency";
import { cn } from "@/lib/utils";

export interface HostBookingPageProps {
  name: string;
  bio: string;
  topics: string[];
  photoSrc: string;
  introVideoSrc?: string;
  basePriceCents: number;
  availabilityPreview?: React.ReactNode;
  onBookSession?: () => void;
  className?: string;
}

export function HostBookingPage({
  name,
  bio,
  topics,
  photoSrc,
  introVideoSrc,
  basePriceCents,
  availabilityPreview,
  onBookSession,
  className,
}: HostBookingPageProps) {
  return (
    <div className={cn("flex flex-col gap-6", className)}>
      <Card>
        <CardContent className="flex flex-col gap-4 p-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
            <Avatar fallback={name} size="lg" src={photoSrc} />
            <div className="flex flex-col gap-2">
              <Type as="h1" variant="h2">
                {name}
              </Type>
              <Type variant="caption">{formatCentsAsUsdc(basePriceCents)} per session</Type>
            </div>
          </div>

          <Separator />

          <div className="flex flex-col gap-2">
            <Type variant="label">About</Type>
            <Type variant="body">{bio}</Type>
          </div>

          {topics.length > 0 ? (
            <div className="flex flex-col gap-2">
              <Type variant="label">Topics</Type>
              <div className="flex flex-wrap gap-2">
                {topics.map((topic) => (
                  <Type
                    key={topic}
                    as="span"
                    variant="body"
                    className="rounded-[var(--radius-md)] border border-border-soft bg-surface-skeleton px-3 py-1"
                  >
                    {topic}
                  </Type>
                ))}
              </div>
            </div>
          ) : null}

          {introVideoSrc ? (
            <div className="flex flex-col gap-2">
              <Type variant="label">Intro video</Type>
              <video
                className="aspect-video w-full rounded-[var(--radius-md)] border border-border-soft bg-black"
                controls
                preload="metadata"
                src={introVideoSrc}
              />
            </div>
          ) : null}
        </CardContent>
      </Card>

      {availabilityPreview ? (
        <div className="flex flex-col gap-3">
          <Type as="h2" variant="h3">
            Availability
          </Type>
          {availabilityPreview}
        </div>
      ) : null}

      <div className="sticky bottom-4 z-10 flex justify-center sm:static sm:z-auto">
        <Button
          className="w-full sm:w-auto"
          onClick={onBookSession}
          size="lg"
        >
          Book a session
        </Button>
      </div>
    </div>
  );
}
