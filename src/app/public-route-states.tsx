"use client";

import { Spinner } from "@/components/primitives/spinner";
import { Type } from "@/components/primitives/type";

export function PublicRouteLoadingState() {
  return (
    <div className="flex min-h-[60vh] w-full flex-1 items-center justify-center">
      <Spinner className="size-6" />
    </div>
  );
}

export function PublicRouteMessageState({
  description,
  title,
}: {
  description: string;
  title: string;
}) {
  return (
    <div className="flex min-h-[60vh] w-full flex-1 items-start justify-start px-1 py-8 md:px-6 md:py-12">
      <div className="w-full max-w-2xl">
        <Type as="h1" variant="h2">
          {title}
        </Type>
        <p className="mt-3 text-base leading-7 text-muted-foreground">
          {description}
        </p>
      </div>
    </div>
  );
}
