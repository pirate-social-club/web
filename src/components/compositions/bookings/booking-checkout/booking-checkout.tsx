import * as React from "react";

import { Button } from "@/components/primitives/button";
import { Card, CardContent } from "@/components/primitives/card";
import { Type } from "@/components/primitives/type";
import { formatCentsAsUsdc } from "@/lib/formatting/currency";
import { cn } from "@/lib/utils";
import type { BookingQuotePreview, IanaTz } from "../view-models";

type CheckoutPhase = "holding" | "pending" | "conflict";

export interface BookingCheckoutProps {
  quote: BookingQuotePreview;
  viewerTimezone: IanaTz;
  phase: CheckoutPhase;
  holdExpiresAtUtc: string;
  nowUtc: string;
  onPay?: () => void;
  onReleaseHold?: () => void;
  className?: string;
}

function formatCountdown(secondsRemaining: number): string {
  if (secondsRemaining <= 0) return "0:00";
  const m = Math.floor(secondsRemaining / 60);
  const s = secondsRemaining % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}

export function BookingCheckout({
  quote,
  phase,
  holdExpiresAtUtc,
  nowUtc,
  onPay,
  onReleaseHold,
  className,
}: BookingCheckoutProps) {
  const secondsRemaining = React.useMemo(() => {
    const diff = Math.floor((Date.parse(holdExpiresAtUtc) - Date.parse(nowUtc)) / 1000);
    return Math.max(0, diff);
  }, [holdExpiresAtUtc, nowUtc]);

  if (phase === "conflict") {
    return (
      <Card className={className}>
        <CardContent className="flex flex-col gap-4 p-6">
          <div className="flex flex-col gap-1">
            <Type variant="label">That slot was released</Type>
            <Type variant="caption">
              Someone else booked it while you were viewing. Pick another slot to continue.
            </Type>
          </div>
          {onReleaseHold ? (
            <Button onClick={onReleaseHold} variant="secondary">
              Back to slots
            </Button>
          ) : null}
        </CardContent>
      </Card>
    );
  }

  if (phase === "pending") {
    return (
      <Card className={className}>
        <CardContent className="flex flex-col gap-4 p-6">
          <div className="flex flex-col gap-1">
            <Type variant="label">Payment verifying</Type>
            <Type variant="caption">
              Waiting for your payment to be confirmed on-chain. This usually takes a few seconds.
            </Type>
          </div>
          <div className="flex items-center justify-between">
            <Type variant="body">Total</Type>
            <Type variant="body-strong">{formatCentsAsUsdc(quote.grossCents)}</Type>
          </div>
        </CardContent>
      </Card>
    );
  }

  // holding
  return (
    <Card className={className}>
      <CardContent className="flex flex-col gap-4 p-6">
        <div className="flex flex-col gap-1">
          <Type variant="label">Complete your payment</Type>
          <Type variant="caption">
            Pay {formatCentsAsUsdc(quote.grossCents)} to confirm your session.
          </Type>
        </div>

        <div className="flex flex-col gap-1">
          <Type variant="caption">Slot held for</Type>
          <Type
            as="span"
            variant="h3"
            className={cn(secondsRemaining <= 60 && "text-warning")}
          >
            {formatCountdown(secondsRemaining)}
          </Type>
        </div>

        <Button className="w-full" onClick={onPay} size="lg">
          Pay {formatCentsAsUsdc(quote.grossCents)}
        </Button>

        {onReleaseHold ? (
          <Button onClick={onReleaseHold} variant="ghost">
            Cancel
          </Button>
        ) : null}
      </CardContent>
    </Card>
  );
}
