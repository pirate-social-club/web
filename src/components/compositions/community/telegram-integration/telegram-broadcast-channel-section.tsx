"use client";

import * as React from "react";
import { Megaphone } from "@phosphor-icons/react";

import { Button } from "@/components/primitives/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/primitives/dialog";
import { FormNote } from "@/components/primitives/form-layout";
import { Skeleton } from "@/components/primitives/skeleton";
import { Type } from "@/components/primitives/type";
import type {
  TelegramBroadcastChannelInfo,
  TelegramBroadcastChannelSectionProps,
} from "./community-telegram-integration.types";
import { TELEGRAM_CHANNEL_BACKFILL_LIMIT } from "./community-telegram-integration.types";

function isIntentExpired(expiresAt: number): boolean {
  return expiresAt * 1000 <= Date.now();
}

function ChannelStatusRow({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="flex min-h-14 items-center justify-between gap-4 rounded-md border border-border-soft bg-muted/20 px-4 py-3.5">
      <Type as="div" variant="caption">{label}</Type>
      <Type as="div" variant="body-strong">{value}</Type>
    </div>
  );
}

function ConnectedChannelPanel({
  channel,
  notice = null,
  publishDisabled = false,
  onRequestBackfill,
  onRequestDisconnect,
}: {
  channel: TelegramBroadcastChannelInfo;
  notice?: React.ReactNode;
  publishDisabled?: boolean;
  onRequestBackfill?: () => void;
  onRequestDisconnect?: () => void;
}) {
  return (
    <div className="grid gap-3">
      <div className="flex min-h-28 flex-col justify-between gap-4 rounded-md border border-border-soft bg-card p-5 md:flex-row md:items-center">
        <div className="flex min-w-0 items-start gap-4">
          <div className="grid size-12 shrink-0 place-items-center rounded-md border border-border-soft bg-muted text-muted-foreground">
            <Megaphone aria-hidden="true" className="size-6" weight="bold" />
          </div>
          <div className="min-w-0 space-y-1">
            <Type as="h3" className="break-words" variant="body-strong">{channel.title}</Type>
            {channel.username ? (
              <Type as="div" className="break-all" variant="caption">@{channel.username}</Type>
            ) : null}
          </div>
        </div>
        <div className="flex shrink-0 flex-wrap items-center gap-2">
          <Button disabled={publishDisabled} onClick={onRequestBackfill} type="button" variant="secondary">
            Publish recent posts
          </Button>
          <Button onClick={onRequestDisconnect} type="button" variant="secondary">
            Disconnect
          </Button>
        </div>
      </div>

      <ChannelStatusRow
        label="Automatically publish new posts"
        value={channel.publicationMode === "off" ? "off" : "on"}
      />

      {notice}
    </div>
  );
}

export function TelegramBroadcastChannelSection({
  botConnected,
  onCancelBackfill,
  onCancelDisconnect,
  onCancelSetup,
  onCheckConnection,
  onConfirmBackfill,
  onConfirmDisconnect,
  onConnect,
  onOpenTelegramAgain,
  onRequestBackfill,
  onRequestDisconnect,
  state,
}: TelegramBroadcastChannelSectionProps) {
  // Re-render exactly when the setup intent expires so the "Start again"
  // state appears even if the owner never interacts with the page.
  const [, forceRender] = React.useReducer((count: number) => count + 1, 0);
  React.useEffect(() => {
    if (state.kind !== "awaiting_telegram") {
      return;
    }
    const remainingMs = state.expiresAt * 1000 - Date.now();
    if (remainingMs <= 0) {
      return;
    }
    const timeout = setTimeout(forceRender, remainingMs);
    return () => {
      clearTimeout(timeout);
    };
  }, [state]);

  let content: React.ReactNode;

  switch (state.kind) {
    case "loading":
      content = (
        <div aria-busy="true" className="grid gap-3">
          <Skeleton className="h-28 w-full" />
          <Skeleton className="h-14 w-full" />
        </div>
      );
      break;
    case "creating_intent":
    case "unconnected":
      content = (
        <div className="grid gap-3 rounded-md border border-border-soft bg-card p-5">
          <Type as="p" variant="body">
            Connect a Telegram broadcast channel to publish new community posts straight to Telegram.
          </Type>
          {!botConnected ? (
            <FormNote tone="warning">Connect the community bot first.</FormNote>
          ) : null}
          <div>
            <Button
              loading={state.kind === "creating_intent"}
              onClick={onConnect}
              type="button"
            >
              Connect channel
            </Button>
          </div>
        </div>
      );
      break;
    case "awaiting_telegram": {
      const expired = isIntentExpired(state.expiresAt);
      content = (
        <div className="grid gap-3 rounded-md border border-border-soft bg-card p-5">
          <div aria-live="polite">
            {expired ? (
              <Type as="p" variant="body">This connection request expired.</Type>
            ) : (
              <Type as="p" variant="body">Complete the connection in Telegram.</Type>
            )}
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {expired ? (
              <Button onClick={onConnect} type="button">
                Start again
              </Button>
            ) : (
              <Button onClick={onOpenTelegramAgain} type="button">
                Open Telegram again
              </Button>
            )}
            <Button loading={state.checking} onClick={onCheckConnection} type="button" variant="secondary">
              Check connection
            </Button>
            <Button onClick={onCancelSetup} type="button" variant="ghost">
              Cancel
            </Button>
          </div>
        </div>
      );
      break;
    }
    case "connected":
      content = (
        <ConnectedChannelPanel
          channel={state.channel}
          onRequestBackfill={onRequestBackfill}
          onRequestDisconnect={onRequestDisconnect}
        />
      );
      break;
    case "backfill_queued":
      content = (
        <ConnectedChannelPanel
          channel={state.channel}
          notice={(
            <FormNote tone="default">
              {state.enqueued} {state.enqueued === 1 ? "post" : "posts"} queued for publication. They will appear gradually in Telegram.
            </FormNote>
          )}
          onRequestBackfill={onRequestBackfill}
          onRequestDisconnect={onRequestDisconnect}
          publishDisabled
        />
      );
      break;
    case "backfill_confirm":
    case "backfilling":
    case "disconnect_confirm":
    case "disconnecting":
      content = (
        <ConnectedChannelPanel
          channel={state.channel}
          onRequestBackfill={onRequestBackfill}
          onRequestDisconnect={onRequestDisconnect}
        />
      );
      break;
    case "error":
      content = state.channel ? (
        <ConnectedChannelPanel
          channel={state.channel}
          notice={<FormNote tone="destructive">{state.message}</FormNote>}
          onRequestBackfill={onRequestBackfill}
          onRequestDisconnect={onRequestDisconnect}
        />
      ) : (
        <div className="grid gap-3 rounded-md border border-border-soft bg-card p-5">
          <Type as="p" variant="body">
            Connect a Telegram broadcast channel to publish new community posts straight to Telegram.
          </Type>
          <FormNote tone="destructive">{state.message}</FormNote>
          <div>
            <Button onClick={onConnect} type="button">
              Connect channel
            </Button>
          </div>
        </div>
      );
      break;
    default:
      content = null;
  }

  const backfillDialogOpen = state.kind === "backfill_confirm" || state.kind === "backfilling";
  const disconnectDialogOpen = state.kind === "disconnect_confirm" || state.kind === "disconnecting";

  return (
    <section aria-labelledby="telegram-broadcast-channel-heading" className="space-y-4 border-t border-border-soft pt-6 md:pt-8">
      <Type as="h2" id="telegram-broadcast-channel-heading" variant="h2">Broadcast channel</Type>

      {content}

      <Dialog
        onOpenChange={(open) => {
          if (!open && state.kind === "backfill_confirm") {
            onCancelBackfill?.();
          }
        }}
        open={backfillDialogOpen}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Publish recent posts to Telegram?</DialogTitle>
            <DialogDescription>
              Pirate will publish up to {TELEGRAM_CHANNEL_BACKFILL_LIMIT} eligible posts to this channel, oldest first. Only public, non-adult posts are included. Locked content uses its preview.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button disabled={state.kind === "backfilling"} onClick={onCancelBackfill} variant="outline">
              Cancel
            </Button>
            <Button loading={state.kind === "backfilling"} onClick={onConfirmBackfill}>
              Publish posts
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        onOpenChange={(open) => {
          if (!open && state.kind === "disconnect_confirm") {
            onCancelDisconnect?.();
          }
        }}
        open={disconnectDialogOpen}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Disconnect Telegram channel?</DialogTitle>
            <DialogDescription>
              Pirate will stop publishing new posts. Existing Telegram channel posts will remain visible.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button disabled={state.kind === "disconnecting"} onClick={onCancelDisconnect} variant="outline">
              Cancel
            </Button>
            <Button loading={state.kind === "disconnecting"} onClick={onConfirmDisconnect} variant="destructive">
              Disconnect
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </section>
  );
}
