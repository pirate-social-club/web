import * as React from "react";
import { Broadcast, Check, Copy, DownloadSimple, PlayCircle, Robot, WarningCircle } from "@phosphor-icons/react";

import { Button } from "@/components/primitives/button";
import { resolveResourceHref } from "@/lib/resource-links";
import { cn } from "@/lib/utils";
import { useResettableTimeout } from "@/hooks/use-resettable-timeout";

export type LiveRoomBannerStatus = "scheduled" | "live" | "ended" | "canceled";
export type LiveRoomBannerRole = "host" | "guest" | "viewer";
export type LiveRoomBannerGuestInviteStatus = "pending" | "accepted" | "revoked";
export type LiveRoomBannerAccessState =
  | "allowed"
  | "gate_required"
  | "purchase_required"
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
  freedomDetected?: boolean;
  freedomHref?: string;
  guestInviteStatus?: LiveRoomBannerGuestInviteStatus | null;
  priceLabel?: string;
  role?: LiveRoomBannerRole;
  shareUrl?: string;
  status: LiveRoomBannerStatus;
  title?: string;
  onAcceptGuestInvite?: () => void;
  onBuyTicket?: () => void;
  onWatch?: () => void;
};

function statusLabel(status: LiveRoomBannerStatus): string {
  if (status === "live") return "Live now";
  if (status === "ended") return "Room ended";
  if (status === "canceled") return "Room canceled";
  return "Live room ready";
}

function viewerCanAttemptWatch(status: LiveRoomBannerStatus, accessState: LiveRoomBannerAccessState): boolean {
  return status === "live"
    && accessState !== "purchase_required"
    && accessState !== "gate_required"
    && accessState !== "missing_listing"
    && accessState !== "ended";
}

export function shouldShowLiveRoomBanner({
  role = "viewer",
}: Pick<LiveRoomBannerProps, "accessState" | "agentPurchaseUrl" | "role" | "status">): boolean {
  return role === "host" || role === "guest";
}

function stateDescription(props: {
  accessLabel?: string;
  accessState?: LiveRoomBannerAccessState;
  guestInviteStatus?: LiveRoomBannerGuestInviteStatus | null;
  priceLabel?: string;
  role?: LiveRoomBannerRole;
  status: LiveRoomBannerStatus;
}): string {
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
  if (props.status === "live" && viewerCanAttemptWatch(props.status, props.accessState ?? "allowed")) {
    return "Watch the concert from this page.";
  }
  return props.accessLabel ?? "Come back when the host goes live.";
}

export function LiveRoomBanner({
  accessLabel,
  accessState = "allowed",
  agentPurchaseUrl,
  anchorPostUrl,
  className,
  concertUrl,
  freedomDetected = false,
  freedomHref,
  guestInviteStatus,
  priceLabel,
  role = "viewer",
  shareUrl,
  status,
  title,
  onAcceptGuestInvite,
  onBuyTicket,
  onWatch,
}: LiveRoomBannerProps) {
  const [copied, setCopied] = React.useState(false);
  const { schedule: scheduleCopiedReset } = useResettableTimeout();
  const producerRole = role === "host" || role === "guest";
  const copyValue = producerRole ? shareUrl ?? concertUrl ?? anchorPostUrl : undefined;
  const hasSetupProblem = accessState === "missing_listing";
  const canWatch = !producerRole && viewerCanAttemptWatch(status, accessState);
  const producerCanOpenRoom = Boolean(producerRole && freedomHref && (role === "host" || guestInviteStatus === "accepted"));
  const showBroadcast = Boolean(producerCanOpenRoom && freedomDetected);
  const showDownload = Boolean(producerCanOpenRoom && !freedomDetected);

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
          <p className="text-base text-muted-foreground">{stateDescription({ accessLabel, accessState, guestInviteStatus, priceLabel, role, status })}</p>
        </div>

        <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center sm:justify-end">
          {copyValue ? (
            <Button onClick={() => void handleCopy()} size="sm" variant="outline">
              {copied ? <Check className="size-4" weight="bold" /> : <Copy className="size-4" weight="bold" />}
              {copied ? "Copied" : "Copy concert link"}
            </Button>
          ) : null}

          {showBroadcast ? (
            <Button asChild size="sm">
              <a href={freedomHref} rel="noreferrer" target="_blank">
                <Broadcast className="size-4" weight="bold" />
                Broadcast in Freedom
              </a>
            </Button>
          ) : null}

          {showDownload ? (
            <Button asChild size="sm" variant="outline">
              <a href={resolveResourceHref("source-freedom-browser") ?? "#"} rel="noreferrer" target="_blank">
                <DownloadSimple className="size-4" weight="bold" />
                Download Freedom
              </a>
            </Button>
          ) : null}

          {role === "guest" && guestInviteStatus === "pending" && onAcceptGuestInvite ? (
            <Button onClick={onAcceptGuestInvite} size="sm">
              <Check className="size-4" weight="bold" />
              Accept invite
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
            <Button onClick={onWatch} size="sm">
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
