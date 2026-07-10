"use client";

import { PhoneDisconnect } from "@phosphor-icons/react";

import { Button } from "@/components/primitives/button";
import { IconButton } from "@/components/primitives/icon-button";
import { Spinner } from "@/components/primitives/spinner";
import { Type } from "@/components/primitives/type";
import { cn } from "@/lib/utils";

export type AttendanceReportingHealth = "healthy" | "retrying" | "degraded";
export type BookingSessionControlsState = "in-session" | "ready-to-settle" | "settling" | "settled";

export interface BookingSessionControlsProps {
  state: BookingSessionControlsState;
  viewerRole: "host" | "booker";
  counterpartyName: string;
  attendanceHealth?: AttendanceReportingHealth;
  onLeave: () => void;
  onComplete?: () => void;
  onReviewAttendance?: () => void;
  className?: string;
}

function AttendanceNotice({ health }: { health: AttendanceReportingHealth }) {
  if (health === "healthy") return null;
  return (
    <div className={cn(
      "flex flex-col gap-1 rounded-[var(--radius-lg)] border p-4",
      health === "degraded"
        ? "border-destructive/40 bg-destructive/10"
        : "border-warning/40 bg-warning/10",
    )}>
      <Type className={health === "degraded" ? "text-destructive" : "text-warning"} variant="body-strong">
        {health === "degraded" ? "Attendance reporting interrupted" : "Reconnecting attendance reporting"}
      </Type>
      <Type className={health === "degraded" ? "text-destructive" : "text-warning"} variant="caption">
        {health === "degraded"
          ? "Stay in the session while we retry. Your video call can continue."
          : "Your presence is being retried automatically."}
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
}: BookingSessionControlsProps) {
  return (
    <section className={cn("flex flex-col gap-4", className)}>
      <AttendanceNotice health={attendanceHealth} />

      {state === "in-session" ? (
        <div className="flex items-center justify-between gap-4 rounded-[var(--radius-lg)] border border-border-soft bg-card p-4">
          <div className="flex min-w-0 flex-col gap-1">
            <Type variant="body-strong">Session with {counterpartyName}</Type>
            <Type variant="caption">Payment actions unlock after the scheduled session ends.</Type>
          </div>
          <IconButton aria-label="Leave session" onClick={onLeave} title="Leave session" variant="destructive">
            <PhoneDisconnect aria-hidden="true" className="size-5" weight="fill" />
          </IconButton>
        </div>
      ) : null}

      {state === "ready-to-settle" ? (
        <div className="flex flex-col gap-4 rounded-[var(--radius-lg)] border border-border-soft bg-card p-4">
          <div className="flex flex-col gap-1">
            <Type variant="body-strong">Scheduled session ended</Type>
            <Type variant="caption">Attendance records determine the payout or refund.</Type>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row">
            {viewerRole === "host" ? (
              <Button className="sm:flex-1" onClick={onComplete}>Finish session</Button>
            ) : null}
            <Button className="sm:flex-1" onClick={onReviewAttendance} variant="outline">
              Report attendance issue
            </Button>
          </div>
        </div>
      ) : null}

      {state === "settling" ? (
        <div className="flex items-center gap-3 rounded-[var(--radius-lg)] border border-border-soft bg-card p-4">
          <Spinner className="size-5" />
          <div className="flex flex-col gap-1">
            <Type variant="body-strong">Checking attendance</Type>
            <Type variant="caption">Keep this page open while the outcome is confirmed.</Type>
          </div>
        </div>
      ) : null}

      {state === "settled" ? (
        <div className="flex flex-col gap-1 rounded-[var(--radius-lg)] border border-success/40 bg-success/10 p-4">
          <Type className="text-success" variant="body-strong">Session outcome confirmed</Type>
          <Type className="text-success" variant="caption">The final payment status is available in your bookings.</Type>
        </div>
      ) : null}
    </section>
  );
}
