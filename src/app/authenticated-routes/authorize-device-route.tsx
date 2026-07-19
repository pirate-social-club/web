"use client";

import * as React from "react";

import { AuthRequiredRouteState } from "@/app/authenticated-helpers/route-shell";
import { Button } from "@/components/primitives/button";
import { CardShell, PageContainer } from "@/components/primitives/layout-shell";
import { Type } from "@/components/primitives/type";
import { useApi } from "@/lib/api";
import { useSession } from "@/lib/api/session-store";
import { getErrorMessage } from "@/lib/error-utils";

function normalizeDeviceUserCode(value: string | null): string {
  return (value ?? "").trim().toUpperCase();
}

function readDeviceUserCode(): string {
  if (typeof window === "undefined") return "";
  return normalizeDeviceUserCode(new URLSearchParams(window.location.search).get("user_code"));
}

export function AuthorizeDevicePage() {
  const api = useApi();
  const session = useSession();
  const [userCode] = React.useState(readDeviceUserCode);
  const [status, setStatus] = React.useState<"idle" | "authorizing" | "authorized" | "failed">("idle");
  const [error, setError] = React.useState<string | null>(null);

  const authorize = React.useCallback(async () => {
    const code = normalizeDeviceUserCode(userCode);
    if (!code) {
      setError("Missing device code.");
      setStatus("failed");
      return;
    }
    setStatus("authorizing");
    setError(null);
    try {
      await api.auth.verifyDevice(code);
      setStatus("authorized");
    } catch (err) {
      setError(getErrorMessage(err, "Could not authorize this device."));
      setStatus("failed");
    }
  }, [api, userCode]);

  if (!session) {
    return (
      <AuthRequiredRouteState
        description="Sign in to approve Freedom Browser on this Pirate account."
        title="Authorize Freedom"
      />
    );
  }

  const authorized = status === "authorized";
  const loading = status === "authorizing";

  return (
    <section className="flex min-w-0 flex-1 flex-col justify-center">
      <PageContainer className="py-8" size="narrow">
        <CardShell className="mx-auto flex max-w-xl flex-col gap-5 px-5 py-6 md:p-7">
          <div className="flex flex-col gap-2">
            <h1 className="text-2xl font-semibold tracking-normal text-foreground">
              Authorize Freedom
            </h1>
            <p className="text-base leading-7 text-muted-foreground">
              Freedom Browser is requesting access to live rooms, song artifacts, and your profile.
            </p>
          </div>

          <div className="rounded-2xl border border-border-soft bg-muted/35 px-4 py-3">
            <Type as="div" variant="overline">
              Device code
            </Type>
            <div className="mt-1 font-mono text-xl font-semibold tracking-normal text-foreground">
              {userCode || "Missing"}
            </div>
          </div>

          {authorized ? (
            <div className="rounded-2xl border border-success/30 bg-success/10 px-4 py-3 text-base font-medium text-success">
              Freedom Browser is authorized. You can return to the app.
            </div>
          ) : null}

          {error ? (
            <div className="rounded-2xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-base font-medium text-destructive">
              {error}
            </div>
          ) : null}

          <div className="flex flex-col gap-3 sm:flex-row">
            <Button
              className="sm:min-w-36"
              disabled={!userCode || authorized}
              loading={loading}
              onClick={authorize}
            >
              Authorize
            </Button>
            <Button
              disabled={loading}
              onClick={() => window.close()}
              variant="secondary"
            >
              Close
            </Button>
          </div>
        </CardShell>
      </PageContainer>
    </section>
  );
}
