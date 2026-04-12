"use client";

import * as React from "react";

import { Button } from "@/components/primitives/button";
import { Spinner } from "@/components/primitives/spinner";

import type { SelfVerificationProps } from "./self-verification.types";

export function SelfVerificationView({
  phase,
  title,
  description,
  statusNote,
  errorTitle,
  errorBody,
  entry,
  actions,
}: SelfVerificationProps) {
  return (
    <div className="space-y-5">
      {phase === "sign_in" && actions.primary ? (
        <Button
          className="w-full text-base font-semibold"
          onClick={actions.primary.onClick}
          size="lg"
        >
          {actions.primary.label}
        </Button>
      ) : null}

      {phase === "sign_in" && description ? (
        <p className="text-base leading-7 text-muted-foreground">
          {description}
        </p>
      ) : null}

      {phase === "ready" && entry?.kind === "qr" ? (
        <div className="grid place-items-center overflow-hidden rounded-xl border border-border-soft bg-white p-4 shadow-sm">
          <div className="grid h-[300px] w-[300px] place-items-center">
            {entry.content}
          </div>
        </div>
      ) : null}

      {phase === "ready" && entry?.kind === "link" ? (
        <Button
          className="w-full text-base font-semibold"
          onClick={entry.onClick}
          size="lg"
        >
          {entry.label}
        </Button>
      ) : null}

      {phase === "ready" && description ? (
        <p className="text-base leading-7 text-muted-foreground">
          {description}
        </p>
      ) : null}

      {phase === "waiting" ? (
        <div className="flex flex-col items-center gap-3 py-4 text-center text-muted-foreground">
          <Spinner className="size-8" />
          {statusNote ? (
            <p className="m-0 max-w-sm text-base leading-7 text-muted-foreground">
              {statusNote}
            </p>
          ) : null}
        </div>
      ) : null}

      {phase === "verified" ? (
        <div className="space-y-5">
          {description ? (
            <p className="text-base leading-7 text-muted-foreground">
              {description}
            </p>
          ) : null}
          {actions.primary ? (
            <Button
              className="w-full text-base font-semibold"
              onClick={actions.primary.onClick}
              size="lg"
            >
              {actions.primary.label}
            </Button>
          ) : null}
        </div>
      ) : null}

      {phase === "error" ? (
        <div className="space-y-4">
          {errorTitle ? (
            <p className="text-base font-medium text-foreground">{errorTitle}</p>
          ) : null}
          {errorBody ? (
            <p className="text-base leading-7 text-muted-foreground">{errorBody}</p>
          ) : null}
          {actions.footer ? (
            <Button
              className="w-full"
              onClick={actions.footer.onClick}
              size="lg"
              variant="outline"
            >
              {actions.footer.label}
            </Button>
          ) : null}
        </div>
      ) : null}

      {phase === "ready" && entry?.kind === "qr" && actions.footer ? (
        <Button
          className="w-full"
          onClick={actions.footer.onClick}
          size="lg"
          variant="outline"
        >
          {actions.footer.label}
        </Button>
      ) : null}
    </div>
  );
}
