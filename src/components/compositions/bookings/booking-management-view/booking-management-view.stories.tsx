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
    counterpartyHandle: "amira.pirate",
    counterpartyAvatarUrl: null,
    sessionTimeLabel: "6–6:30 PM, July 10",
    amountLabel: "50.00 USDC",
    statusLabel: "In progress",
    statusDetail: "amira.pirate has started the session.",
    statusTone: "success",
    section: "upcoming",
    joinState: "live",
    canAddToCalendar: true,
  },
  {
    id: "booking_confirmed",
    counterpartyName: "Daniel Wu",
    counterpartyHandle: "daniel.eth",
    counterpartyAvatarUrl: null,
    sessionTimeLabel: "10:30–11:15 AM, July 11",
    amountLabel: "72.00 USDC",
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
    counterpartyHandle: "sofia.pirate",
    counterpartyAvatarUrl: null,
    sessionTimeLabel: "2–3 PM, July 8",
    amountLabel: "90.00 USDC",
    statusLabel: "Attendance under review",
    statusDetail: "No payment will move until the outcome is confirmed.",
    statusTone: "warning",
    section: "review",
  },
  {
    id: "booking_complete",
    counterpartyName: "Mateo Silva",
    counterpartyHandle: "mateo.pirate",
    counterpartyAvatarUrl: null,
    sessionTimeLabel: "4–4:30 PM, July 5",
    amountLabel: "45.00 USDC",
    statusLabel: "Completed",
    statusDetail: "Host payout completed.",
    statusTone: "muted",
    section: "past",
  },
  {
    id: "booking_cancelled",
    counterpartyName: "Nora Ibrahim",
    counterpartyHandle: "nora.eth",
    counterpartyAvatarUrl: null,
    sessionTimeLabel: "7–7:30 PM, July 3",
    amountLabel: "50.00 USDC",
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
    counterpartyHandle: "ravi.pirate",
    statusLabel: "Host missed the session",
    statusDetail: "Your full refund completed.",
    statusTone: "warning",
  },
  {
    ...items[3],
    id: "booker_no_show",
    counterpartyName: "Elena Petrova",
    counterpartyHandle: "elena.eth",
    statusLabel: "Booker missed the session",
    statusDetail: "The host payout completed under the attendance policy.",
    statusTone: "warning",
  },
  {
    ...items[4],
    id: "host_cancelled",
    counterpartyName: "Jon Bell",
    counterpartyHandle: "jon.pirate",
    statusLabel: "Cancelled by host",
    statusDetail: "Your full refund completed.",
  },
  {
    ...items[4],
    id: "booker_cancelled_refunded",
    counterpartyName: "Lina Park",
    counterpartyHandle: "lina.eth",
    statusLabel: "Cancelled — refunded",
    statusDetail: "Your full refund completed.",
  },
  {
    ...items[2],
    id: "legacy_unknown",
    counterpartyName: "Ada Morgan",
    counterpartyHandle: "ada.pirate",
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
