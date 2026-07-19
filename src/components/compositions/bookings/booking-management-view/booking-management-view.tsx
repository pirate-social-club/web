"use client";

import { CalendarPlus } from "@phosphor-icons/react";

import { Avatar } from "@/components/primitives/avatar";
import { Button } from "@/components/primitives/button";
import { Card, CardContent } from "@/components/primitives/card";
import { IconButton } from "@/components/primitives/icon-button";
import { Skeleton } from "@/components/primitives/skeleton";
import { Tabs, TabsList, TabsTrigger } from "@/components/primitives/tabs";
import { Type } from "@/components/primitives/type";
import { cn } from "@/lib/utils";

import type { BookingManagementSection } from "./booking-management-policy";

export type BookingManagementTone = "default" | "success" | "warning" | "muted";

export interface BookingManagementItem {
  id: string;
  counterpartyName: string;
  counterpartyHandle: string;
  counterpartyAvatarUrl?: string | null;
  sessionTimeLabel: string;
  amountLabel: string;
  statusLabel: string;
  statusDetail: string;
  statusTone: BookingManagementTone;
  section: BookingManagementSection;
  joinState?: "unavailable" | "available" | "live";
  joinAvailabilityLabel?: string;
  canCancel?: boolean;
  canAddToCalendar?: boolean;
}

export interface BookingManagementViewProps {
  state: "ready" | "loading" | "empty" | "error" | "signed-out";
  role: "host" | "booker";
  items?: BookingManagementItem[];
  errorMessage?: string;
  onRoleChange?: (role: "host" | "booker") => void;
  onJoin?: (item: BookingManagementItem) => void;
  onCancel?: (item: BookingManagementItem) => void;
  onAddToCalendar?: (item: BookingManagementItem) => void;
  onRetry?: () => void;
  onSignIn?: () => void;
  className?: string;
  copy?: Partial<BookingManagementViewCopy>;
}

interface BookingManagementViewCopy {
  title: string; roleLabel: string; asBooker: string; asHost: string;
  upcoming: string; review: string; past: string; cancelled: string;
  join: string; rejoin: string; addToCalendar: string; cancel: string;
  loading: string; signedOutTitle: string; signedOutDetail: string; signIn: string;
  errorTitle: string; errorDetail: string; retry: string;
  emptyTitle: string; emptyBookerDetail: string; emptyHostDetail: string;
}

const defaultBookingManagementViewCopy: BookingManagementViewCopy = {
  title: "Bookings", roleLabel: "Booking role", asBooker: "As booker", asHost: "As host",
  upcoming: "Upcoming", review: "Needs review", past: "Past", cancelled: "Cancelled",
  join: "Join session", rejoin: "Rejoin session", addToCalendar: "Add to calendar", cancel: "Cancel booking",
  loading: "Loading bookings", signedOutTitle: "Sign in to view your bookings", signedOutDetail: "Your upcoming and past sessions appear here.", signIn: "Sign in",
  errorTitle: "Bookings could not be loaded", errorDetail: "Try again in a moment.", retry: "Try again",
  emptyTitle: "No bookings yet", emptyBookerDetail: "Booked sessions will appear here.", emptyHostDetail: "Sessions booked with you will appear here.",
};

const toneClass: Record<BookingManagementTone, string> = {
  default: "text-foreground",
  success: "text-success",
  warning: "text-warning",
  muted: "text-muted-foreground",
};

function BookingManagementCard({
  item,
  onAddToCalendar,
  onCancel,
  onJoin,
  copy,
}: {
  item: BookingManagementItem;
  onAddToCalendar?: (item: BookingManagementItem) => void;
  onCancel?: (item: BookingManagementItem) => void;
  onJoin?: (item: BookingManagementItem) => void;
  copy: BookingManagementViewCopy;
}) {
  return (
    <Card>
      <CardContent className="flex flex-col gap-4 p-5">
        <div className="flex items-center gap-3">
          <Avatar fallback={item.counterpartyName} src={item.counterpartyAvatarUrl ?? undefined} />
          <div className="flex min-w-0 flex-1 flex-col gap-1">
            <div className="flex items-start justify-between gap-3">
              <Type className="min-w-0 truncate" title={item.counterpartyHandle} variant="body-strong">
                {item.counterpartyHandle}
              </Type>
              <Type className="shrink-0" variant="body-strong">{item.amountLabel}</Type>
            </div>
            <Type as="p" variant="caption">{item.sessionTimeLabel}</Type>
          </div>
        </div>

        <div className="flex flex-col gap-1 border-t border-border-soft pt-4">
          <Type className={toneClass[item.statusTone]} variant="body-strong">{item.statusLabel}</Type>
          <Type variant="caption">{item.statusDetail}</Type>
          {item.joinState === "unavailable" && item.joinAvailabilityLabel ? (
            <Type variant="caption">{item.joinAvailabilityLabel}</Type>
          ) : null}
        </div>

        {(item.joinState === "available" || item.joinState === "live" || item.canCancel || item.canAddToCalendar) ? (
          <div className="flex flex-wrap items-center gap-2">
            {item.joinState === "available" || item.joinState === "live" ? (
              <Button className="flex-1" onClick={() => onJoin?.(item)}>
                {item.joinState === "live" ? copy.rejoin : copy.join}
              </Button>
            ) : null}
            {item.canAddToCalendar ? (
              <IconButton
                aria-label={copy.addToCalendar}
                onClick={() => onAddToCalendar?.(item)}
                title={copy.addToCalendar}
                variant="outline"
              >
                <CalendarPlus aria-hidden="true" className="size-5" />
              </IconButton>
            ) : null}
            {item.canCancel ? (
              <Button onClick={() => onCancel?.(item)} variant="outline">{copy.cancel}</Button>
            ) : null}
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}

function LoadingState({ label }: { label: string }) {
  return (
    <div className="flex flex-col gap-3" aria-label={label}>
      {[0, 1].map((key) => (
        <Card key={key}>
          <CardContent className="flex gap-3 p-5">
            <Skeleton className="size-11 rounded-full" />
            <div className="flex flex-1 flex-col gap-2">
              <Skeleton className="h-5 w-36" />
              <Skeleton className="h-5 w-52" />
              <Skeleton className="h-4 w-28" />
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

export function BookingManagementView({
  className,
  errorMessage,
  items = [],
  onAddToCalendar,
  onCancel,
  onJoin,
  onRetry,
  onRoleChange,
  onSignIn,
  role,
  state,
  copy: copyOverrides,
}: BookingManagementViewProps) {
  const copy = { ...defaultBookingManagementViewCopy, ...copyOverrides };
  const sectionLabels: Record<BookingManagementSection, string> = {
    upcoming: copy.upcoming, review: copy.review, past: copy.past, cancelled: copy.cancelled,
  };
  const sections = (["upcoming", "review", "past", "cancelled"] as const)
    .map((section) => ({ section, items: items.filter((item) => item.section === section) }))
    .filter((entry) => entry.items.length > 0);

  return (
    <div className={cn("mx-auto flex w-full max-w-2xl flex-col gap-6", className)}>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <Type as="h1" variant="h2">{copy.title}</Type>
        <Tabs onValueChange={(value) => onRoleChange?.(value as "host" | "booker")} value={role}>
          <TabsList aria-label={copy.roleLabel}>
            <TabsTrigger value="booker">{copy.asBooker}</TabsTrigger>
            <TabsTrigger value="host">{copy.asHost}</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {state === "loading" ? <LoadingState label={copy.loading} /> : null}

      {state === "signed-out" ? (
        <Card>
          <CardContent className="flex flex-col items-start gap-4 p-6">
            <div className="flex flex-col gap-1">
              <Type variant="body-strong">{copy.signedOutTitle}</Type>
              <Type variant="caption">{copy.signedOutDetail}</Type>
            </div>
            <Button onClick={onSignIn}>{copy.signIn}</Button>
          </CardContent>
        </Card>
      ) : null}

      {state === "error" ? (
        <Card>
          <CardContent className="flex flex-col items-start gap-4 p-6">
            <div className="flex flex-col gap-1">
              <Type className="text-destructive" variant="body-strong">{copy.errorTitle}</Type>
              <Type variant="caption">{errorMessage ?? copy.errorDetail}</Type>
            </div>
            <Button onClick={onRetry} variant="outline">{copy.retry}</Button>
          </CardContent>
        </Card>
      ) : null}

      {state === "empty" ? (
        <Card>
          <CardContent className="flex flex-col gap-1 p-6">
            <Type variant="body-strong">{copy.emptyTitle}</Type>
            <Type variant="caption">
              {role === "booker" ? copy.emptyBookerDetail : copy.emptyHostDetail}
            </Type>
          </CardContent>
        </Card>
      ) : null}

      {state === "ready" ? sections.map(({ items: sectionItems, section }) => (
        <section className="flex flex-col gap-3" key={section}>
          <Type as="h2" variant="h4">{sectionLabels[section]}</Type>
          {sectionItems.map((item) => (
            <BookingManagementCard
              item={item}
              key={item.id}
              onAddToCalendar={onAddToCalendar}
              onCancel={onCancel}
              onJoin={onJoin}
              copy={copy}
            />
          ))}
        </section>
      )) : null}
    </div>
  );
}
