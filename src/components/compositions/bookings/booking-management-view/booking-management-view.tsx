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
  counterpartyAvatarUrl?: string | null;
  timeLabel: string;
  durationLabel: string;
  timezoneLabel: string;
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
}

const toneClass: Record<BookingManagementTone, string> = {
  default: "text-foreground",
  success: "text-success",
  warning: "text-warning",
  muted: "text-muted-foreground",
};

const sectionLabels: Record<BookingManagementSection, string> = {
  upcoming: "Upcoming",
  review: "Needs review",
  past: "Past",
  cancelled: "Cancelled",
};

function BookingManagementCard({
  item,
  onAddToCalendar,
  onCancel,
  onJoin,
}: {
  item: BookingManagementItem;
  onAddToCalendar?: (item: BookingManagementItem) => void;
  onCancel?: (item: BookingManagementItem) => void;
  onJoin?: (item: BookingManagementItem) => void;
}) {
  return (
    <Card>
      <CardContent className="flex flex-col gap-4 p-5">
        <div className="flex items-start gap-3">
          <Avatar fallback={item.counterpartyName} src={item.counterpartyAvatarUrl ?? undefined} />
          <div className="min-w-0 flex-1">
            <Type variant="body-strong">{item.counterpartyName}</Type>
            <Type variant="body">{item.timeLabel}</Type>
            <Type variant="caption">{item.durationLabel} · {item.timezoneLabel}</Type>
          </div>
          <Type variant="body-strong">{item.amountLabel}</Type>
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
                {item.joinState === "live" ? "Rejoin session" : "Join session"}
              </Button>
            ) : null}
            {item.canAddToCalendar ? (
              <IconButton
                aria-label="Add to calendar"
                onClick={() => onAddToCalendar?.(item)}
                title="Add to calendar"
                variant="outline"
              >
                <CalendarPlus aria-hidden="true" className="size-5" />
              </IconButton>
            ) : null}
            {item.canCancel ? (
              <Button className="text-destructive" onClick={() => onCancel?.(item)} variant="ghost">Cancel</Button>
            ) : null}
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}

function LoadingState() {
  return (
    <div className="flex flex-col gap-3" aria-label="Loading bookings">
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
}: BookingManagementViewProps) {
  const sections = (["upcoming", "review", "past", "cancelled"] as const)
    .map((section) => ({ section, items: items.filter((item) => item.section === section) }))
    .filter((entry) => entry.items.length > 0);

  return (
    <div className={cn("mx-auto flex w-full max-w-2xl flex-col gap-6", className)}>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <Type as="h1" variant="h2">Bookings</Type>
        <Tabs onValueChange={(value) => onRoleChange?.(value as "host" | "booker")} value={role}>
          <TabsList aria-label="Booking role">
            <TabsTrigger value="booker">As booker</TabsTrigger>
            <TabsTrigger value="host">As host</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {state === "loading" ? <LoadingState /> : null}

      {state === "signed-out" ? (
        <Card>
          <CardContent className="flex flex-col items-start gap-4 p-6">
            <div>
              <Type variant="body-strong">Sign in to view your bookings</Type>
              <Type variant="caption">Your upcoming and past sessions appear here.</Type>
            </div>
            <Button onClick={onSignIn}>Sign in</Button>
          </CardContent>
        </Card>
      ) : null}

      {state === "error" ? (
        <Card>
          <CardContent className="flex flex-col items-start gap-4 p-6">
            <div>
              <Type className="text-destructive" variant="body-strong">Bookings could not be loaded</Type>
              <Type variant="caption">{errorMessage ?? "Try again in a moment."}</Type>
            </div>
            <Button onClick={onRetry} variant="outline">Try again</Button>
          </CardContent>
        </Card>
      ) : null}

      {state === "empty" ? (
        <Card>
          <CardContent className="p-6">
            <Type variant="body-strong">No bookings yet</Type>
            <Type variant="caption">
              {role === "booker" ? "Booked sessions will appear here." : "Sessions booked with you will appear here."}
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
            />
          ))}
        </section>
      )) : null}
    </div>
  );
}
