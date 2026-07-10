import type { Meta, StoryObj } from "@storybook/react-vite";

import { StandardRoutePage } from "@/components/compositions/app/page-shell";

import {
  BookingManagementView,
  type BookingManagementItem,
} from "./booking-management-view";

const items: BookingManagementItem[] = [
  {
    id: "booking_live",
    counterpartyName: "Amira Hassan",
    counterpartyAvatarUrl: null,
    timeLabel: "Today at 6:00 PM",
    durationLabel: "30 min",
    timezoneLabel: "Asia/Tbilisi",
    amountLabel: "$50.00",
    statusLabel: "In progress",
    statusDetail: "Amira has started the session.",
    statusTone: "success",
    section: "upcoming",
    joinState: "live",
    canAddToCalendar: true,
  },
  {
    id: "booking_confirmed",
    counterpartyName: "Daniel Wu",
    counterpartyAvatarUrl: null,
    timeLabel: "Tomorrow at 10:30 AM",
    durationLabel: "45 min",
    timezoneLabel: "Asia/Tbilisi",
    amountLabel: "$72.00",
    statusLabel: "Confirmed",
    statusDetail: "Your session is booked.",
    statusTone: "success",
    section: "upcoming",
    joinState: "unavailable",
    joinAvailabilityLabel: "Join opens 5 minutes before the session.",
    canAddToCalendar: true,
    canCancel: true,
  },
  {
    id: "booking_review",
    counterpartyName: "Sofia Marin",
    counterpartyAvatarUrl: null,
    timeLabel: "July 8 at 2:00 PM",
    durationLabel: "60 min",
    timezoneLabel: "Asia/Tbilisi",
    amountLabel: "$90.00",
    statusLabel: "Attendance under review",
    statusDetail: "No payment will move until the outcome is confirmed.",
    statusTone: "warning",
    section: "review",
  },
  {
    id: "booking_complete",
    counterpartyName: "Mateo Silva",
    counterpartyAvatarUrl: null,
    timeLabel: "July 5 at 4:00 PM",
    durationLabel: "30 min",
    timezoneLabel: "Asia/Tbilisi",
    amountLabel: "$45.00",
    statusLabel: "Completed",
    statusDetail: "Host payout completed.",
    statusTone: "muted",
    section: "past",
  },
  {
    id: "booking_cancelled",
    counterpartyName: "Nora Ibrahim",
    counterpartyAvatarUrl: null,
    timeLabel: "July 3 at 7:00 PM",
    durationLabel: "30 min",
    timezoneLabel: "Asia/Tbilisi",
    amountLabel: "$50.00",
    statusLabel: "Cancelled — no refund",
    statusDetail: "The free-cancellation window had ended.",
    statusTone: "muted",
    section: "cancelled",
  },
];

const terminalItems: BookingManagementItem[] = [
  {
    ...items[3],
    id: "completed_paid",
    statusLabel: "Completed",
    statusDetail: "Host payout completed.",
  },
  {
    ...items[3],
    id: "host_no_show",
    counterpartyName: "Ravi Kapoor",
    statusLabel: "Host missed the session",
    statusDetail: "Your full refund completed.",
    statusTone: "warning",
  },
  {
    ...items[3],
    id: "booker_no_show",
    counterpartyName: "Elena Petrova",
    statusLabel: "Booker missed the session",
    statusDetail: "The host payout completed under the attendance policy.",
    statusTone: "warning",
  },
  {
    ...items[4],
    id: "host_cancelled",
    counterpartyName: "Jon Bell",
    statusLabel: "Cancelled by host",
    statusDetail: "Your full refund completed.",
  },
  {
    ...items[4],
    id: "booker_cancelled_refunded",
    counterpartyName: "Lina Park",
    statusLabel: "Cancelled — refunded",
    statusDetail: "Your full refund completed.",
  },
  {
    ...items[2],
    id: "legacy_unknown",
    counterpartyName: "Legacy booking",
    statusLabel: "Payment complete",
    statusDetail: "The original session outcome is unavailable.",
    statusTone: "muted",
    section: "past",
  },
];

const meta = {
  title: "Compositions/Bookings/BookingManagementView",
  component: BookingManagementView,
  args: {
    onAddToCalendar: () => {},
    onCancel: () => {},
    onJoin: () => {},
    onRetry: () => {},
    onRoleChange: () => {},
    onSignIn: () => {},
    role: "booker",
  },
  decorators: [
    (Story) => <StandardRoutePage size="rail"><div className="p-6"><Story /></div></StandardRoutePage>,
  ],
  parameters: { layout: "fullscreen" },
} satisfies Meta<typeof BookingManagementView>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Booker: Story = {
  args: { items, state: "ready" },
};

export const Host: Story = {
  args: {
    items: items.map((item) => ({
      ...item,
      statusDetail: item.id === "booking_complete" ? "Your payout completed." : item.statusDetail,
    })),
    role: "host",
    state: "ready",
  },
};

export const TerminalOutcomes: Story = {
  args: { items: terminalItems, state: "ready" },
};

export const Loading: Story = {
  args: { state: "loading" },
};

export const Empty: Story = {
  args: { state: "empty" },
};

export const Failure: Story = {
  args: { errorMessage: "The connection timed out.", state: "error" },
};

export const SignedOut: Story = {
  args: { state: "signed-out" },
};

export const Mobile: Story = {
  args: { items, state: "ready" },
  parameters: { viewport: { defaultViewport: "mobile1" } },
};
