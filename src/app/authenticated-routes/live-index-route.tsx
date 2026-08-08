"use client";

import { Television } from "@phosphor-icons/react";

import { Type } from "@/components/primitives/type";
import { useRouteMessages } from "@/hooks/use-route-messages";

export function LiveIndexPage() {
  const { copy } = useRouteMessages();
  return (
    <div className="grid min-h-full w-full place-items-center bg-background px-6 py-12 text-center">
      <div className="flex max-w-md flex-col items-center gap-4">
        <span className="grid size-16 place-items-center rounded-full bg-card text-muted-foreground">
          <Television className="size-8" weight="regular" />
        </span>
        <Type as="h1" variant="h2">{copy.home.liveEmptyTitle}</Type>
        <Type className="text-muted-foreground" variant="body">
          {copy.home.liveEmptyBody}
        </Type>
      </div>
    </div>
  );
}
