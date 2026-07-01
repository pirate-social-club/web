import * as React from "react";
import type { Meta, StoryObj } from "@storybook/react-vite";

import type {
  AvailabilityException,
  AvailabilityRule,
  PriceRule,
} from "@/lib/api/bookings-types";

import {
  ProfileBookingsSection,
  type ProfileBookingsSectionProps,
  type ProfileBookingsValues,
} from "../profile-bookings-section";

// A small interactive harness so the section behaves like it does in edit profile:
// field edits + add/remove mutate local state, exactly as the container hook will.
function InteractiveProfileBookings(
  props: Partial<ProfileBookingsSectionProps> & { initialValues: ProfileBookingsValues },
) {
  const { initialValues, ...overrides } = props;
  const [values, setValues] = React.useState<ProfileBookingsValues>(initialValues);
  const [rules, setRules] = React.useState<AvailabilityRule[]>(overrides.rules ?? []);
  const [priceRules, setPriceRules] = React.useState<PriceRule[]>(overrides.priceRules ?? []);
  const [exceptions, setExceptions] = React.useState<AvailabilityException[]>(overrides.exceptions ?? []);
  const [bookable, setBookable] = React.useState(overrides.bookable ?? false);

  let seq = React.useRef(100).current;
  const nextId = (prefix: string) => `${prefix}_${(seq += 1)}`;

  return (
    <div className="mx-auto max-w-2xl p-6">
      <ProfileBookingsSection
        {...overrides}
        values={values}
        onValuesChange={(patch) => setValues((prev) => ({ ...prev, ...patch }))}
        rules={rules}
        priceRules={priceRules}
        exceptions={exceptions}
        bookable={bookable}
        payoutReady={overrides.payoutReady ?? true}
        timezoneOptions={overrides.timezoneOptions ?? ["UTC", "America/New_York", "Europe/Vienna", "Asia/Tokyo"]}
        onAddRule={(d) => setRules((prev) => [...prev, {
          object: "availability_rule", id: nextId("bar"), by_weekday: d.byWeekday,
          start_local: d.startLocal, end_local: d.endLocal, slot_duration_seconds: values.durationSeconds,
          effective_from: null, effective_until: null, created: 0, updated: 0,
        }])}
        onDeleteRule={(id) => setRules((prev) => prev.filter((r) => r.id !== id))}
        onAddPriceRule={(d) => setPriceRules((prev) => [...prev, {
          object: "price_rule", id: nextId("bprl"), match_weekday: d.matchWeekday,
          match_local_start: d.startLocal, match_local_end: d.endLocal, match_duration_seconds: null,
          price_cents: Math.round(Number(d.priceUsd) * 100), priority: prev.length + 1,
        } as PriceRule])}
        onDeletePriceRule={(id) => setPriceRules((prev) => prev.filter((r) => r.id !== id))}
        onAddException={(d) => setExceptions((prev) => [...prev, {
          object: "availability_exception", id: nextId("bae"), kind: d.kind,
          start: Math.floor(new Date(d.startLocal).getTime() / 1000) || 0,
          end: Math.floor(new Date(d.endLocal).getTime() / 1000) || 0, created: 0,
        }])}
        onDeleteException={(id) => setExceptions((prev) => prev.filter((e) => e.id !== id))}
        onToggleBookable={() => setBookable((p) => !p)}
      />
    </div>
  );
}

const meta = {
  title: "Compositions/Bookings/ProfileBookingsSection",
  component: ProfileBookingsSection,
  parameters: { layout: "fullscreen" },
} satisfies Meta<typeof ProfileBookingsSection>;

export default meta;
type Story = StoryObj<typeof meta>;

const EMPTY_VALUES: ProfileBookingsValues = {
  timezone: "Europe/Vienna",
  durationSeconds: 1800,
  priceUsd: "0.00",
};

const CONFIGURED_VALUES: ProfileBookingsValues = {
  timezone: "Europe/Vienna",
  durationSeconds: 1800,
  priceUsd: "50.00",
};

const WEEKLY_RULES: AvailabilityRule[] = [
  { object: "availability_rule", id: "bar_1", by_weekday: [1, 2, 3, 4, 5], start_local: "09:00", end_local: "17:00", slot_duration_seconds: 1800, effective_from: null, effective_until: null, created: 0, updated: 0 },
  { object: "availability_rule", id: "bar_2", by_weekday: [6], start_local: "10:00", end_local: "13:00", slot_duration_seconds: 1800, effective_from: null, effective_until: null, created: 0, updated: 0 },
];

const PRICE_RULES: PriceRule[] = [
  { object: "price_rule", id: "bprl_1", match_weekday: [6], match_local_start: "10:00", match_local_end: "13:00", match_duration_seconds: null, price_cents: 7500, priority: 1 },
];

const EXCEPTIONS: AvailabilityException[] = [
  { object: "availability_exception", id: "bae_1", kind: "block", start: 1_790_000_000, end: 1_790_086_400, created: 0 },
];

/** Brand new — never set up bookings. App wallet is ready, so publish is allowed once a slot exists. */
export const NotConfigured: Story = {
  render: () => <InteractiveProfileBookings initialValues={EMPTY_VALUES} />,
};

/** Edge: the user has no app wallet yet → publish is blocked with guidance. */
export const NoAppWallet: Story = {
  render: () => (
    <InteractiveProfileBookings
      initialValues={CONFIGURED_VALUES}
      rules={WEEKLY_RULES}
      payoutReady={false}
    />
  ),
};

/** Fully configured + published: weekly windows, a weekend price rule, and a one-off block. */
export const PublishedWithAvailability: Story = {
  render: () => (
    <InteractiveProfileBookings
      initialValues={CONFIGURED_VALUES}
      rules={WEEKLY_RULES}
      priceRules={PRICE_RULES}
      exceptions={EXCEPTIONS}
      bookable
    />
  ),
};

export const Mobile: Story = {
  parameters: { viewport: { defaultViewport: "mobile1" } },
  render: () => (
    <InteractiveProfileBookings
      initialValues={CONFIGURED_VALUES}
      rules={WEEKLY_RULES}
      priceRules={PRICE_RULES}
      bookable
    />
  ),
};
