import * as React from "react";
import type { Meta, StoryObj } from "@storybook/react-vite";

import { Button } from "@/components/primitives/button";
import type { BookingCancellationPreview } from "@/lib/api/bookings-types";

import {
  BookingCancellationDialog,
  type BookingCancellationDialogProps,
} from "./booking-cancellation-dialog";

const meta = {
  title: "Compositions/Bookings/BookingCancellationDialog",
  component: BookingCancellationDialog,
  parameters: { layout: "centered" },
} satisfies Meta<typeof BookingCancellationDialog>;

export default meta;

type Story = StoryObj<typeof meta>;

const fullRefund: BookingCancellationPreview = {
  object: "booking_cancellation_preview",
  booking_id: "booking_01",
  cancelled_by: "booker",
  gross_cents: 5000,
  refund_cents: 5000,
  host_payout_cents: 0,
  platform_fee_cents: 0,
  previewed_at: "2026-07-10T10:00:00.000Z",
  policy_cutoff_at: "2026-07-11T14:00:00.000Z",
};

const zeroRefund: BookingCancellationPreview = {
  ...fullRefund,
  refund_cents: 0,
  host_payout_cents: 4500,
  platform_fee_cents: 500,
  previewed_at: "2026-07-12T15:00:00.000Z",
};

const hostCancellation: BookingCancellationPreview = {
  ...fullRefund,
  cancelled_by: "host",
  policy_cutoff_at: null,
};

function DialogStory(props: Omit<BookingCancellationDialogProps, "open" | "onOpenChange" | "onConfirm">) {
  const [open, setOpen] = React.useState(true);
  return (
    <>
      {!open ? <Button onClick={() => setOpen(true)}>Open cancellation review</Button> : null}
      <BookingCancellationDialog {...props} onConfirm={() => {}} onOpenChange={setOpen} open={open} />
    </>
  );
}

const baseProps = {
  counterpartyName: "Amira Hassan",
  policyCutoffLabel: "Sunday, July 12 at 6:00 PM",
  sessionTimeLabel: "Monday, July 13 at 6:00 PM",
} as const;

export const BookerFullRefund: Story = {
  render: () => <DialogStory {...baseProps} preview={fullRefund} />,
};

export const BookerNoRefund: Story = {
  render: () => <DialogStory {...baseProps} preview={zeroRefund} />,
};

export const HostCancellation: Story = {
  render: () => <DialogStory {...baseProps} counterpartyName="Daniel Wu" preview={hostCancellation} />,
};

export const TermsChanged: Story = {
  render: () => <DialogStory {...baseProps} preview={zeroRefund} state="terms-changed" />,
};

export const Submitting: Story = {
  render: () => <DialogStory {...baseProps} preview={fullRefund} state="submitting" />,
};

export const Failure: Story = {
  render: () => (
    <DialogStory
      {...baseProps}
      errorMessage="The refund terms could not be confirmed. Review them again before cancelling."
      preview={fullRefund}
      state="error"
    />
  ),
};

export const MobileNoRefund: Story = {
  parameters: { viewport: { defaultViewport: "mobile1" } },
  render: () => <DialogStory {...baseProps} preview={zeroRefund} />,
};

export const LongCounterpartyName: Story = {
  render: () => (
    <DialogStory
      {...baseProps}
      counterpartyName="Alexandria Montgomery-Washington"
      preview={fullRefund}
    />
  ),
};
