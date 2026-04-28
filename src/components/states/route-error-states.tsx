"use client";

import { Button } from "@/components/primitives/button";
import { Type } from "@/components/primitives/type";

export function RouteLoadFailureState({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <section className="flex min-w-0 flex-1 flex-col gap-7 px-1 py-2 md:max-w-3xl md:px-6 md:py-8">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <Type as="h1" variant="h1" className="text-2xl md:text-3xl">
          {title}
        </Type>
        <Button className="w-fit" onClick={() => window.location.reload()} variant="secondary">
          Try Again
        </Button>
      </div>
      <div className="border-l-2 border-warning/60 pl-4">
        <Type as="p" variant="body-strong">
          Could not load this page
        </Type>
        <p className="mt-2 max-w-2xl text-base leading-7 text-muted-foreground">
          {description}
        </p>
      </div>
    </section>
  );
}

export function RootAppErrorState({
  title,
  description,
  reloadLabel,
}: {
  title: string;
  description: string;
  reloadLabel: string;
}) {
  return (
    <main className="flex min-h-screen items-center justify-center bg-background px-5 py-10">
      <div className="flex w-full max-w-md flex-col items-center gap-5 text-center">
        <div
          aria-hidden="true"
          className="flex size-12 items-center justify-center rounded-full border border-border-soft bg-muted text-muted-foreground"
        >
          <Type as="span" variant="h3">
            !
          </Type>
        </div>
        <div className="flex flex-col gap-3">
          <Type as="h1" variant="h1">
            {title}
          </Type>
          <Type as="p" variant="body" className="text-muted-foreground">
            {description}
          </Type>
        </div>
        <Button onClick={() => window.location.reload()} variant="secondary">
          {reloadLabel}
        </Button>
      </div>
    </main>
  );
}
