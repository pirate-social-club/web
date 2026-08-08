"use client";

import { PhoneDisconnect } from "@phosphor-icons/react";

import { Button } from "@/components/primitives/button";
import { IconButton } from "@/components/primitives/icon-button";
import { Spinner } from "@/components/primitives/spinner";
import { Type } from "@/components/primitives/type";
import { cn } from "@/lib/utils";

export type AttendanceReportingHealth = "healthy" | "retrying" | "degraded";
type BookingSessionControlsState = "in-session" | "ready-to-settle" | "settling" | "settled";

export interface BookingSessionControlsProps {
  state: BookingSessionControlsState;
  viewerRole: "host" | "booker";
  counterpartyName: string;
  attendanceHealth?: AttendanceReportingHealth;
  onLeave: () => void;
  onComplete?: () => void;
  onReviewAttendance?: () => void;
  className?: string;
  copy?: Partial<BookingSessionControlsCopy>;
}

interface BookingSessionControlsCopy {
  attendanceInterrupted: string; attendanceRetrying: string; degradedDetail: string; retryingDetail: string;
  sessionWith: string; paymentUnlocks: string; leave: string; sessionEnded: string; attendanceDetermines: string;
  finish: string; report: string; checking: string; checkingDetail: string; confirmed: string; confirmedDetail: string;
}

const defaultBookingSessionControlsCopy: BookingSessionControlsCopy = {
  attendanceInterrupted: "Attendance reporting interrupted", attendanceRetrying: "Reconnecting attendance reporting",
  degradedDetail: "Stay in the session while we retry. Your video call can continue.", retryingDetail: "Your presence is being retried automatically.",
  sessionWith: "Session with {name}", paymentUnlocks: "Payment actions unlock after the scheduled session ends.", leave: "Leave session",
  sessionEnded: "Scheduled session ended", attendanceDetermines: "Attendance records determine the payout or refund.",
  finish: "Finish session", report: "Report attendance issue", checking: "Checking attendance",
  checkingDetail: "Keep this page open while the outcome is confirmed.", confirmed: "Session outcome confirmed",
  confirmedDetail: "The final payment status is available in your bookings.",
};

function AttendanceNotice({ health, copy }: { health: AttendanceReportingHealth; copy: BookingSessionControlsCopy }) {
  if (health === "healthy") return null;
  return (
    <div className={cn(
      "flex flex-col gap-1 rounded-[var(--radius-lg)] border p-4",
      health === "degraded"
        ? "border-destructive/40 bg-destructive/10"
        : "border-warning/40 bg-warning/10",
    )}>
      <Type className={health === "degraded" ? "text-destructive" : "text-warning"} variant="body-strong">
        {health === "degraded" ? copy.attendanceInterrupted : copy.attendanceRetrying}
      </Type>
      <Type className={health === "degraded" ? "text-destructive" : "text-warning"} variant="caption">
        {health === "degraded"
          ? copy.degradedDetail
          : copy.retryingDetail}
      </Type>
    </div>
  );
}

export function BookingSessionControls({
  attendanceHealth = "healthy",
  className,
  counterpartyName,
  onComplete,
  onLeave,
  onReviewAttendance,
  state,
  viewerRole,
  copy: copyOverrides,
}: BookingSessionControlsProps) {
  const copy = { ...defaultBookingSessionControlsCopy, ...copyOverrides };
  return (
    <section className={cn("flex flex-col gap-4", className)}>
      <AttendanceNotice health={attendanceHealth} copy={copy} />

      {state === "in-session" ? (
        <div className="flex items-center justify-between gap-4 rounded-[var(--radius-lg)] border border-border-soft bg-card p-4">
          <div className="flex min-w-0 flex-col gap-1">
            <Type variant="body-strong">{copy.sessionWith.replace("{name}", counterpartyName)}</Type>
            <Type variant="caption">{copy.paymentUnlocks}</Type>
          </div>
          <IconButton aria-label={copy.leave} onClick={onLeave} title={copy.leave} variant="destructive">
            <PhoneDisconnect aria-hidden="true" className="size-5" weight="fill" />
          </IconButton>
        </div>
      ) : null}

      {state === "ready-to-settle" ? (
        <div className="flex flex-col gap-4 rounded-[var(--radius-lg)] border border-border-soft bg-card p-4">
          <div className="flex flex-col gap-1">
            <Type variant="body-strong">{copy.sessionEnded}</Type>
            <Type variant="caption">{copy.attendanceDetermines}</Type>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row">
            {viewerRole === "host" ? (
              <Button className="sm:flex-1" onClick={onComplete}>{copy.finish}</Button>
            ) : null}
            <Button className="sm:flex-1" onClick={onReviewAttendance} variant="outline">
              {copy.report}
            </Button>
          </div>
        </div>
      ) : null}

      {state === "settling" ? (
        <div className="flex items-center gap-3 rounded-[var(--radius-lg)] border border-border-soft bg-card p-4">
          <Spinner className="size-5" />
          <div className="flex flex-col gap-1">
            <Type variant="body-strong">{copy.checking}</Type>
            <Type variant="caption">{copy.checkingDetail}</Type>
          </div>
        </div>
      ) : null}

      {state === "settled" ? (
        <div className="flex flex-col gap-1 rounded-[var(--radius-lg)] border border-success/40 bg-success/10 p-4">
          <Type className="text-success" variant="body-strong">{copy.confirmed}</Type>
          <Type className="text-success" variant="caption">{copy.confirmedDetail}</Type>
        </div>
      ) : null}
    </section>
  );
}
