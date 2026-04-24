"use client";

import { CardShell } from "@/components/primitives/layout-shell";
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
    <div className="flex min-h-[60vh] w-full flex-1 items-center justify-center">
      <CardShell className="w-full max-w-xl px-6 py-8 text-center">
        <Type as="h1" variant="h2" className="">{title}</Type>
        <p className="mt-3 text-base leading-7 text-muted-foreground">{description}</p>
      </CardShell>
    </div>
  );
}
