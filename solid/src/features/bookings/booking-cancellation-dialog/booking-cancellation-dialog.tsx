import { Button, Checkbox, CheckboxLabel, Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, FormNote, Separator, Type } from "../../../design-system";
import { createEffect, createSignal, Show } from "solid-js";
import { formatCentsAsUsdc } from "../booking-format";
import type { BookingCancellationPreview } from "../view-models";

export type BookingCancellationDialogState = "ready" | "submitting" | "terms-changed" | "error";

interface BookingCancellationDialogCopy {
  title: string;
  sessionWith: string;
  termsChanged: string;
  termsChangedDetail: string;
  sessionTotal: string;
  refund: string;
  fullRefund: string;
  refundBack: string;
  noRefund: string;
  acknowledgement: string;
  cutoffEnded: string;
  genericError: string;
  keepBooking: string;
  confirm: string;
}

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

const defaultCopy: BookingCancellationDialogCopy = {
  title: "Cancel booking?",
  sessionWith: "{time} with {name}",
  termsChanged: "Refund terms changed",
  termsChangedDetail: "Review the updated amount before cancelling.",
  sessionTotal: "Session total",
  refund: "Refund",
  fullRefund: "{name} receives a full refund.",
  refundBack: "You receive {amount} back.",
  noRefund: "This cancellation is not refundable.",
  acknowledgement: "I understand I will not receive a refund.",
  cutoffEnded: "The free-cancellation window ended {time}.",
  genericError: "The booking could not be cancelled. Try again.",
  keepBooking: "Keep booking",
  confirm: "Confirm cancellation",
};

function fill(template: string, values: Record<string, string>): string {
  return template.replace(/\{(\w+)\}/gu, (_match, key: string) => values[key] ?? `{${key}}`);
}

export function BookingCancellationDialog(props: BookingCancellationDialogProps) {
  const copy = () => ({ ...defaultCopy, ...props.copy });
  const requiresAcknowledgement = () => props.preview.cancelledBy === "booker" && props.preview.refundCents === 0;
  const [acknowledged, setAcknowledged] = createSignal(false, { ownedWrite: true });

  createEffect(
    () => [props.open, props.preview.previewedAt, props.preview.refundCents] as const,
    () => {
      setAcknowledged(false);
    },
  );

  const refundMessage = () => props.preview.cancelledBy === "host"
    ? fill(copy().fullRefund, { name: props.counterpartyName })
    : props.preview.refundCents > 0
      ? fill(copy().refundBack, { amount: formatCentsAsUsdc(props.preview.refundCents) })
      : copy().noRefund;

  return (
    <Dialog onOpenChange={props.onOpenChange} open={props.open}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{copy().title}</DialogTitle>
          <DialogDescription>{fill(copy().sessionWith, { name: props.counterpartyName, time: props.sessionTimeLabel })}</DialogDescription>
        </DialogHeader>

        <div class="flex flex-col gap-4">
          <Show when={props.state === "terms-changed"}>
            <div class="flex flex-col gap-1 rounded-[var(--radius-lg)] border border-warning/40 bg-warning/10 p-4">
              <Type variant="body-strong" class="text-warning">{copy().termsChanged}</Type>
              <Type variant="caption" class="text-warning">{copy().termsChangedDetail}</Type>
            </div>
          </Show>

          <div class="flex flex-col gap-3 rounded-[var(--radius-lg)] border border-border-soft p-4">
            <div class="flex items-center justify-between gap-4">
              <Type variant="body">{copy().sessionTotal}</Type>
              <Type variant="body-strong">{formatCentsAsUsdc(props.preview.grossCents)}</Type>
            </div>
            <Separator />
            <div class="flex items-center justify-between gap-4">
              <Type variant="body-strong">{copy().refund}</Type>
              <Type variant="body-strong" class={props.preview.refundCents === 0 ? "text-warning" : "text-success"}>
                {formatCentsAsUsdc(props.preview.refundCents)}
              </Type>
            </div>
            <Type variant="caption">{refundMessage()}</Type>
          </div>

          <Show when={requiresAcknowledgement()}>
            <div class="flex items-start gap-3 rounded-[var(--radius-lg)] border border-warning/40 bg-warning/10 p-4">
              <Checkbox
                checked={acknowledged()}
                controlClass="mt-0.5 border-warning data-checked:border-warning data-checked:bg-warning data-checked:text-warning-foreground"
                onChange={(checked) => setAcknowledged(checked === true)}
              >
                <CheckboxLabel class="flex-1 text-warning">{copy().acknowledgement}</CheckboxLabel>
              </Checkbox>
            </div>
          </Show>

          <Show when={props.preview.policyCutoffAt && requiresAcknowledgement()}>
            <Type variant="caption">{fill(copy().cutoffEnded, { time: props.policyCutoffLabel ?? props.sessionTimeLabel })}</Type>
          </Show>

          <Show when={props.state === "error"}>
            <FormNote tone="destructive">{props.errorMessage ?? copy().genericError}</FormNote>
          </Show>
        </div>

        <DialogFooter>
          <Button disabled={props.state === "submitting"} onClick={() => props.onOpenChange(false)} variant="outline">
            {copy().keepBooking}
          </Button>
          <Button
            disabled={requiresAcknowledgement() && !acknowledged()}
            loading={props.state === "submitting"}
            onClick={() => props.onConfirm(props.preview.refundCents)}
            variant="destructive"
          >
            {copy().confirm}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
