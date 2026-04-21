"use client";

import { CardShell } from "@/components/primitives/layout-shell";
import { Spinner } from "@/components/primitives/spinner";

export function PublicRouteLoadingState() {
  return (
    <div className="flex min-h-[60vh] items-center justify-center">
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
    <div className="flex min-h-[60vh] items-center justify-center">
      <CardShell className="w-full max-w-xl px-6 py-8 text-center">
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">{title}</h1>
        <p className="mt-3 text-base leading-7 text-muted-foreground">{description}</p>
      </CardShell>
    </div>
  );
}
