"use client";

import * as React from "react";
import { usePrivy } from "@privy-io/react-auth";

import { navigate } from "@/app/router";
import { Button } from "@/components/primitives/button";
import { FormNote } from "@/components/primitives/form-layout";
import { useApi } from "@/lib/api";
import type { ApiError } from "@/lib/api/client";
import { setSession, useSession } from "@/lib/api/session-store";

export function PrivyLoginCard() {
  const api = useApi();
  const session = useSession();
  const { ready, authenticated, login, getAccessToken } = usePrivy();
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [exchanged, setExchanged] = React.useState(false);

  const exchangePrivySession = React.useCallback(() => {
    setLoading(true);
    setError(null);

    return getAccessToken()
      .then(async (accessToken) => {
        if (!accessToken) {
          throw new Error("Privy did not return an access token.");
        }
        return api.auth.sessionExchange({
          type: "privy_access_token",
          privy_access_token: accessToken,
        });
      })
      .then((response) => {
        setSession(response);
        setExchanged(true);
        navigate("/onboarding");
      });
  }, [api, getAccessToken]);

  React.useEffect(() => {
    if (!ready || !authenticated || session || exchanged) return;

    let cancelled = false;
    void exchangePrivySession()
      .then((response) => {
        if (cancelled) return;
      })
      .catch((e: unknown) => {
        if (cancelled) return;
        const apiError = e as ApiError;
        setError(apiError?.message ?? "Privy authentication failed");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [authenticated, exchangePrivySession, exchanged, ready, session]);

  const handleContinue = React.useCallback(() => {
    if (!ready || loading) return;

    if (authenticated && !session && !exchanged) {
      void exchangePrivySession().catch((e: unknown) => {
        const apiError = e as ApiError;
        setError(apiError?.message ?? "Privy authentication failed");
      }).finally(() => {
        setLoading(false);
      });
      return;
    }

    login();
  }, [authenticated, exchangePrivySession, exchanged, loading, login, ready, session]);

  return (
    <div className="rounded-[var(--radius-3xl)] border border-border-soft bg-card px-5 py-5 space-y-4">
      <div className="space-y-2">
        <p className="text-lg font-semibold text-foreground">Sign in with Privy</p>
        <p className="text-base leading-7 text-muted-foreground">
          This path exchanges the Privy access token with the Pirate API and continues into onboarding.
        </p>
      </div>

      {error ? <FormNote tone="warning">{error}</FormNote> : null}

      <div className="flex justify-end">
        <Button disabled={!ready || loading} loading={loading} onClick={handleContinue}>
          Continue with Privy
        </Button>
      </div>
    </div>
  );
}
