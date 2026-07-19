import { CheckCircle, Clock, Info, WarningCircle } from "@phosphor-icons/react";

import { cn } from "@/lib/utils";
import { postCardType } from "./post-card.styles";
import type { StoryLicenseNotice, StoryRegistrationStatus } from "./post-card.types";

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
  if (!status || status.state === "registered") return null;

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
      </span>
    </div>
  );
}

export function StoryLicenseNoticeBadge({
  className,
  notice,
}: {
  className?: string;
  notice?: StoryLicenseNotice;
}) {
  if (!notice) return null;

  return (
    <div
      className={cn(
        "inline-flex max-w-full items-start gap-2 rounded-lg border border-warning/25 bg-warning/10 px-3 py-2 text-start text-warning",
        className,
      )}
    >
      <Info aria-hidden="true" className="mt-0.5 size-4 shrink-0" weight="bold" />
      <span className="min-w-0">
        <span className={cn("block font-medium", postCardType.label)}>
          {notice.label}
        </span>
        {notice.description ? (
          <span className={cn("block text-warning/90", postCardType.meta)}>
            {notice.description}
          </span>
        ) : null}
      </span>
    </div>
  );
}
