"use client";

import * as React from "react";

import { Button } from "@/components/primitives/button";
import { cn } from "@/lib/utils";

export type VerificationCenterChoice = {
  actionLabel: string;
  active?: boolean;
  body: string;
  disabled?: boolean;
  loading?: boolean;
  note?: string;
  onAction?: () => void;
  title: string;
};

export type VerificationCenterDetail = {
  label: string;
  value: string;
};

export function VerificationCenterShell({
  choices,
  details,
  detailsTitle,
  guidanceBody,
  guidanceTitle,
  sessionBody,
  sessionContent,
  sessionTitle,
}: {
  choices: VerificationCenterChoice[];
  details: VerificationCenterDetail[];
  detailsTitle: string;
  guidanceBody: string;
  guidanceTitle: string;
  sessionBody?: string;
  sessionContent?: React.ReactNode;
  sessionTitle: string;
}) {
  return (
    <div className="flex min-w-0 flex-1 flex-col gap-6">
      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.15fr)_22rem]">
        <section className="grid gap-4 md:grid-cols-2">
          {choices.map((choice) => (
            <div
              className={cn(
                "flex min-h-[16rem] flex-col justify-between rounded-[var(--radius-3xl)] border px-5 py-5 md:px-6 md:py-6",
                choice.active
                  ? "border-primary/40 bg-primary/8"
                  : "border-border-soft bg-card",
              )}
              key={choice.title}
            >
              <div className="space-y-3">
                <h2 className="text-2xl font-semibold tracking-tight text-foreground">
                  {choice.title}
                </h2>
                <p className="text-base leading-7 text-muted-foreground">
                  {choice.body}
                </p>
                {choice.note ? (
                  <p className="text-base leading-7 text-foreground">
                    {choice.note}
                  </p>
                ) : null}
              </div>
              <Button
                className="mt-5 w-full"
                disabled={choice.disabled}
                loading={choice.loading}
                onClick={choice.onAction}
                size="lg"
                variant={choice.active ? "secondary" : "default"}
              >
                {choice.actionLabel}
              </Button>
            </div>
          ))}
        </section>

        <aside className="space-y-4">
          <div className="rounded-[var(--radius-3xl)] border border-border-soft bg-card px-5 py-5">
            <div className="mb-4 text-lg font-semibold text-foreground">{detailsTitle}</div>
            <div className="space-y-4">
              {details.map((detail) => (
                <div className="space-y-1" key={detail.label}>
                  <div className="text-base text-muted-foreground">{detail.label}</div>
                  <div className="break-words text-lg font-medium text-foreground">
                    {detail.value}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-[var(--radius-3xl)] border border-primary/20 bg-primary/8 px-5 py-5">
            <div className="mb-3 text-lg font-semibold text-foreground">{guidanceTitle}</div>
            <p className="text-base leading-7 text-muted-foreground">{guidanceBody}</p>
          </div>
        </aside>
      </div>

      {sessionContent ? (
        <section className="rounded-[var(--radius-3xl)] border border-border-soft bg-card px-5 py-5 md:px-6 md:py-6">
          <div className="mb-4 space-y-2">
            <h2 className="text-2xl font-semibold tracking-tight text-foreground">
              {sessionTitle}
            </h2>
            {sessionBody ? (
              <p className="text-base leading-7 text-muted-foreground">
                {sessionBody}
              </p>
            ) : null}
          </div>
          {sessionContent}
        </section>
      ) : null}
    </div>
  );
}
