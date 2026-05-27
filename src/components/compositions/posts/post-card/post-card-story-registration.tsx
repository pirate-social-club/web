import * as React from "react";
import { ArrowSquareOut, CheckCircle, Clock, WarningCircle } from "@phosphor-icons/react";

import { cn } from "@/lib/utils";
import { postCardType } from "./post-card.styles";
import type { StoryRegistrationStatus } from "./post-card.types";

const statusClassName: Record<StoryRegistrationStatus["state"], string> = {
  registered: "border-success/20 bg-success/10 text-success",
  pending: "border-warning/25 bg-warning/10 text-warning",
  failed: "border-destructive/20 bg-destructive/10 text-destructive",
};

const descriptionClassName: Record<StoryRegistrationStatus["state"], string> = {
  registered: "text-success/90",
  pending: "text-warning/90",
  failed: "text-destructive/90",
};

function StoryRegistrationIcon({ state }: { state: StoryRegistrationStatus["state"] }) {
  if (state === "registered") {
    return <CheckCircle aria-hidden="true" className="mt-0.5 size-4 shrink-0" weight="fill" />;
  }
  if (state === "pending") {
    return <Clock aria-hidden="true" className="mt-0.5 size-4 shrink-0" weight="bold" />;
  }
  return <WarningCircle aria-hidden="true" className="mt-0.5 size-4 shrink-0" weight="fill" />;
}

export function StoryRegistrationBadge({
  className,
  status,
}: {
  className?: string;
  status?: StoryRegistrationStatus;
}) {
  if (!status) return null;

  return (
    <div
      className={cn(
        "inline-flex max-w-full items-start gap-2 rounded-lg border px-3 py-2 text-start",
        statusClassName[status.state],
        className,
      )}
    >
      <StoryRegistrationIcon state={status.state} />
      <span className="min-w-0">
        <span className={cn("block font-medium", postCardType.label)}>
          {status.label}
        </span>
        {status.description ? (
          <span className={cn("block", postCardType.meta, descriptionClassName[status.state])}>
            {status.description}
          </span>
        ) : null}
        {status.portalHref ? (
          <a
            className={cn("mt-1 inline-flex max-w-full items-center gap-1.5 font-medium hover:underline", postCardType.meta)}
            data-post-card-interactive="true"
            href={status.portalHref}
            rel="noopener noreferrer"
            target="_blank"
          >
            <span className="truncate">View on Story</span>
            <ArrowSquareOut aria-hidden="true" className="size-3.5 shrink-0" />
          </a>
        ) : null}
      </span>
    </div>
  );
}
