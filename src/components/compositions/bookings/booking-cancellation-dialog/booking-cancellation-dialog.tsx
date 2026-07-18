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
  copy?: Partial<BookingCancellationDialogCopy>;
}

export interface BookingCancellationDialogCopy {
  title: string; sessionWith: string; termsChanged: string; termsChangedDetail: string;
  sessionTotal: string; refund: string; fullRefund: string; refundBack: string; noRefund: string;
  acknowledgement: string; cutoffEnded: string; genericError: string; keepBooking: string; confirm: string;
}

export const defaultBookingCancellationDialogCopy: BookingCancellationDialogCopy = {
  title: "Cancel booking?", sessionWith: "{time} with {name}", termsChanged: "Refund terms changed",
  termsChangedDetail: "Review the updated amount before cancelling.", sessionTotal: "Session total", refund: "Refund",
  fullRefund: "{name} receives a full refund.", refundBack: "You receive {amount} back.", noRefund: "This cancellation is not refundable.",
  acknowledgement: "I understand I will not receive a refund.", cutoffEnded: "The free-cancellation window ended {time}.",
  genericError: "The booking could not be cancelled. Try again.", keepBooking: "Keep booking", confirm: "Confirm cancellation",
};

function fill(template: string, values: Record<string, string>): string {
  return template.replace(/\{(\w+)\}/gu, (_match, key: string) => values[key] ?? `{${key}}`);
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
  copy: copyOverrides,
}: BookingCancellationDialogProps) {
  const copy = { ...defaultBookingCancellationDialogCopy, ...copyOverrides };
  const requiresAcknowledgement = preview.cancelled_by === "booker" && preview.refund_cents === 0;
  const [acknowledged, setAcknowledged] = React.useState(false);

  React.useEffect(() => {
    setAcknowledged(false);
  }, [open, preview.previewed_at, preview.refund_cents]);

  const refundMessage = preview.cancelled_by === "host"
    ? fill(copy.fullRefund, { name: counterpartyName })
    : preview.refund_cents > 0
      ? fill(copy.refundBack, { amount: formatCentsAsUsdc(preview.refund_cents) })
      : copy.noRefund;

  return (
    <Dialog onOpenChange={onOpenChange} open={open}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{copy.title}</DialogTitle>
          <DialogDescription>{fill(copy.sessionWith, { time: sessionTimeLabel, name: counterpartyName })}</DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-4">
          {state === "terms-changed" ? (
            <div className="flex flex-col gap-1 rounded-[var(--radius-lg)] border border-warning/40 bg-warning/10 p-4">
              <Type className="text-warning" variant="body-strong">{copy.termsChanged}</Type>
              <Type className="text-warning" variant="caption">{copy.termsChangedDetail}</Type>
            </div>
          ) : null}

          <div className="flex flex-col gap-3 rounded-[var(--radius-lg)] border border-border-soft p-4">
            <div className="flex items-center justify-between gap-4">
              <Type variant="body">{copy.sessionTotal}</Type>
              <Type variant="body-strong">{formatCentsAsUsdc(preview.gross_cents)}</Type>
            </div>
            <Separator />
            <div className="flex items-center justify-between gap-4">
              <Type variant="body-strong">{copy.refund}</Type>
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
                className="mt-0.5 border-warning focus-visible:ring-warning focus-visible:ring-offset-warning/10 data-[state=checked]:border-warning data-[state=checked]:bg-warning data-[state=checked]:text-warning-foreground"
                onCheckedChange={(checked) => setAcknowledged(checked === true)}
              />
              <Type className="text-warning" variant="body-strong">
                {copy.acknowledgement}
              </Type>
            </label>
          ) : null}

          {preview.policy_cutoff_at && requiresAcknowledgement ? (
            <Type variant="caption">
              {fill(copy.cutoffEnded, { time: policyCutoffLabel ?? sessionTimeLabel })}
            </Type>
          ) : null}

          {state === "error" ? (
            <FormNote tone="destructive">{errorMessage ?? copy.genericError}</FormNote>
          ) : null}
        </div>

        <DialogFooter>
          <Button disabled={state === "submitting"} onClick={() => onOpenChange(false)} variant="outline">
            {copy.keepBooking}
          </Button>
          <Button
            disabled={requiresAcknowledgement && !acknowledged}
            loading={state === "submitting"}
            onClick={() => onConfirm(preview.refund_cents)}
            variant="destructive"
          >
            {copy.confirm}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
