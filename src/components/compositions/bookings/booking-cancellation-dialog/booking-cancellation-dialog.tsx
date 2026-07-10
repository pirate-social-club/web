"use client";

import * as React from "react";

import { Button } from "@/components/primitives/button";
import { Checkbox } from "@/components/primitives/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/primitives/dialog";
import { FormNote } from "@/components/primitives/form-layout";
import { Separator } from "@/components/primitives/separator";
import { Type } from "@/components/primitives/type";
import type { BookingCancellationPreview } from "@/lib/api/bookings-types";

import { formatCentsAsUsdc } from "../fixtures/bookings-format";

export type BookingCancellationDialogState = "ready" | "submitting" | "terms-changed" | "error";

export interface BookingCancellationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  preview: BookingCancellationPreview;
  counterpartyName: string;
  sessionTimeLabel: string;
  policyCutoffLabel?: string;
  state?: BookingCancellationDialogState;
  errorMessage?: string;
  onConfirm: (expectedRefundCents: number) => void;
}

export function BookingCancellationDialog({
  counterpartyName,
  errorMessage,
  onConfirm,
  onOpenChange,
  open,
  policyCutoffLabel,
  preview,
  sessionTimeLabel,
  state = "ready",
}: BookingCancellationDialogProps) {
  const requiresAcknowledgement = preview.cancelled_by === "booker" && preview.refund_cents === 0;
  const [acknowledged, setAcknowledged] = React.useState(false);

  React.useEffect(() => {
    setAcknowledged(false);
  }, [open, preview.previewed_at, preview.refund_cents]);

  const refundMessage = preview.cancelled_by === "host"
    ? `${counterpartyName} receives a full refund.`
    : preview.refund_cents > 0
      ? `You receive ${formatCentsAsUsdc(preview.refund_cents)} back.`
      : "This cancellation is not refundable.";

  return (
    <Dialog onOpenChange={onOpenChange} open={open}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Cancel booking?</DialogTitle>
          <DialogDescription>{sessionTimeLabel} with {counterpartyName}</DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-4">
          {state === "terms-changed" ? (
            <div className="flex flex-col gap-1 rounded-[var(--radius-lg)] border border-warning/40 bg-warning/10 p-4">
              <Type className="text-warning" variant="body-strong">Refund terms changed</Type>
              <Type className="text-warning" variant="caption">Review the updated amount before cancelling.</Type>
            </div>
          ) : null}

          <div className="flex flex-col gap-3 rounded-[var(--radius-lg)] border border-border-soft p-4">
            <div className="flex items-center justify-between gap-4">
              <Type variant="body">Session total</Type>
              <Type variant="body-strong">{formatCentsAsUsdc(preview.gross_cents)}</Type>
            </div>
            <Separator />
            <div className="flex items-center justify-between gap-4">
              <Type variant="body-strong">Refund</Type>
              <Type className={preview.refund_cents === 0 ? "text-warning" : "text-success"} variant="body-strong">
                {formatCentsAsUsdc(preview.refund_cents)}
              </Type>
            </div>
            <Type variant="caption">{refundMessage}</Type>
          </div>

          {requiresAcknowledgement ? (
            <label className="flex cursor-pointer items-start gap-3 rounded-[var(--radius-lg)] border border-warning/40 bg-warning/10 p-4">
              <Checkbox
                checked={acknowledged}
                className="mt-0.5 data-[state=checked]:border-warning data-[state=checked]:bg-warning data-[state=checked]:text-warning-foreground"
                onCheckedChange={(checked) => setAcknowledged(checked === true)}
              />
              <Type className="text-warning" variant="body-strong">
                I understand I will not receive a refund.
              </Type>
            </label>
          ) : null}

          {preview.policy_cutoff_at && requiresAcknowledgement ? (
            <Type variant="caption">
              The free-cancellation window ended {policyCutoffLabel ?? "before this session"}.
            </Type>
          ) : null}

          {state === "error" ? (
            <FormNote tone="destructive">{errorMessage ?? "The booking could not be cancelled. Try again."}</FormNote>
          ) : null}
        </div>

        <DialogFooter>
          <Button disabled={state === "submitting"} onClick={() => onOpenChange(false)} variant="outline">
            Keep booking
          </Button>
          <Button
            disabled={requiresAcknowledgement && !acknowledged}
            loading={state === "submitting"}
            onClick={() => onConfirm(preview.refund_cents)}
            variant="destructive"
          >
            Confirm cancellation
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
