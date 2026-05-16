import * as React from "react";
import { Broadcast, Check, Copy, PlayCircle, Robot, WarningCircle } from "@phosphor-icons/react";

import { Button } from "@/components/primitives/button";
import { cn } from "@/lib/utils";
import { useResettableTimeout } from "@/hooks/use-resettable-timeout";

export type LiveRoomBannerStatus = "scheduled" | "live" | "ended" | "canceled";
export type LiveRoomBannerRole = "host" | "guest" | "viewer";
export type LiveRoomBannerGuestInviteStatus = "pending" | "accepted" | "revoked";
export type LiveRoomBannerAccessState =
  | "allowed"
  | "purchase_required"
  | "gate_required"
  | "waiting"
  | "missing_listing"
  | "ended";

export type LiveRoomBannerProps = {
  accessLabel?: string;
  accessState?: LiveRoomBannerAccessState;
  agentPurchaseUrl?: string;
  anchorPostUrl?: string;
  className?: string;
  concertUrl?: string;
  freedomHref?: string;
  guestInviteStatus?: LiveRoomBannerGuestInviteStatus | null;
  liveRoomId: string;
  priceLabel?: string;
  role?: LiveRoomBannerRole;
  shareUrl?: string;
  status: LiveRoomBannerStatus;
  title?: string;
  onBuyTicket?: () => void;
  onGate?: () => void;
  onWatch?: () => void;
};

function statusLabel(status: LiveRoomBannerStatus): string {
  if (status === "live") return "Live now";
  if (status === "ended") return "Room ended";
  if (status === "canceled") return "Room canceled";
  return "Live room ready";
}

function stateDescription(props: LiveRoomBannerProps): string {
  if (props.accessState === "missing_listing") {
    return "Ticket setup is incomplete. Finish the listing before sharing this paid room.";
  }
  if (props.accessState === "purchase_required") {
    return `${props.priceLabel ?? "Ticket"} required to watch.`;
  }
  if (props.accessState === "gate_required") {
    return "Community access is required before viewers can watch.";
  }
  if (props.status === "ended" || props.accessState === "ended") {
    return "This room has ended.";
  }
  if (props.role === "host") {
    return "Share the concert link or broadcast from Freedom.";
  }
  if (props.role === "guest") {
    if (props.guestInviteStatus === "pending") {
      return "Accept the producer invite before broadcasting from Freedom.";
    }
    if (props.guestInviteStatus === "revoked") {
      return "This producer invite has been revoked.";
    }
    return "Open the producer room in Freedom when the host starts.";
  }
  if (props.status === "live" && props.accessState === "allowed") {
    return "Watch the concert from this page.";
  }
  return props.accessLabel ?? "Share this concert link with attendees.";
}

export function LiveRoomBanner({
  accessState = "allowed",
  agentPurchaseUrl,
  anchorPostUrl,
  className,
  concertUrl,
  freedomHref,
  guestInviteStatus,
  liveRoomId,
  priceLabel,
  role = "viewer",
  shareUrl,
  status,
  title,
  onBuyTicket,
  onGate,
  onWatch,
}: LiveRoomBannerProps) {
  const [copied, setCopied] = React.useState(false);
  const { schedule: scheduleCopiedReset } = useResettableTimeout();
  const producerRole = role === "host" || role === "guest";
  const copyValue = shareUrl ?? concertUrl ?? anchorPostUrl;
  const hasSetupProblem = accessState === "missing_listing";
  const canWatch = !producerRole && status === "live" && accessState === "allowed";

  const handleCopy = React.useCallback(async () => {
    if (!copyValue) return;
    await navigator.clipboard.writeText(copyValue);
    setCopied(true);
    scheduleCopiedReset(() => setCopied(false), 2000);
  }, [copyValue, scheduleCopiedReset]);

  return (
    <section className={cn("border-b border-border-soft bg-card px-4 py-3 md:px-6", className)}>
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div className="min-w-0 space-y-1">
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-base font-semibold text-foreground">{title ?? statusLabel(status)}</p>
            {hasSetupProblem ? (
              <span className="inline-flex items-center gap-1 rounded-full bg-destructive/10 px-2 py-0.5 text-base font-medium text-destructive">
                <WarningCircle className="size-4" />
                Setup needed
              </span>
            ) : null}
          </div>
          <p className="text-base text-muted-foreground">{stateDescription({ accessState, agentPurchaseUrl, anchorPostUrl, concertUrl, freedomHref, guestInviteStatus, liveRoomId, priceLabel, role, shareUrl, status, title, onBuyTicket, onGate, onWatch })}</p>
          <p className="text-base text-muted-foreground">{liveRoomId}</p>
        </div>

        <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center sm:justify-end">
          {copyValue ? (
            <Button onClick={() => void handleCopy()} size="sm" variant="outline">
              {copied ? <Check className="size-4" weight="bold" /> : <Copy className="size-4" weight="bold" />}
              {copied ? "Copied" : "Copy concert link"}
            </Button>
          ) : null}

          {producerRole && freedomHref ? (
            <Button asChild size="sm">
              <a href={freedomHref}>
                <Broadcast className="size-4" weight="bold" />
                Broadcast in Freedom
              </a>
            </Button>
          ) : null}

          {canWatch ? (
            <Button onClick={onWatch} size="sm">
              <PlayCircle className="size-4" weight="bold" />
              Watch live
            </Button>
          ) : null}

          {!producerRole && accessState === "purchase_required" ? (
            <Button onClick={onBuyTicket} size="sm">
              Buy ticket
            </Button>
          ) : null}

          {!producerRole && accessState === "gate_required" ? (
            <Button onClick={onGate} size="sm">
              Verify access
            </Button>
          ) : null}

          {agentPurchaseUrl ? (
            <Button asChild size="sm" variant="outline">
              <a href={agentPurchaseUrl}>
                <Robot className="size-4" weight="duotone" />
                Agent checkout
              </a>
            </Button>
          ) : null}
        </div>
      </div>
    </section>
  );
}
