"use client";

import * as React from "react";

import { usePiratePrivyRuntime } from "@/components/auth/privy-provider";
import { Button } from "@/components/primitives/button";
import { PageContainer } from "@/components/primitives/layout-shell";
import { Spinner } from "@/components/primitives/spinner";
import { Type } from "@/components/primitives/type";
import { useApi } from "@/lib/api";
import { useSession } from "@/lib/api/session-store";
import { getErrorMessage } from "@/lib/error-utils";

type LinkState =
  | { kind: "waiting_for_auth" }
  | { kind: "linking" }
  | { kind: "linked" }
  | { kind: "error"; message: string };

export function TelegramAccountLinkRoutePage() {
  const api = useApi();
  const session = useSession();
  const { connect, loadError } = usePiratePrivyRuntime();
  const token = React.useMemo(() => {
    if (typeof window === "undefined") return "";
    return new URL(window.location.href).searchParams.get("token")?.trim() ?? "";
  }, []);
  const [state, setState] = React.useState<LinkState>(
    token ? { kind: "waiting_for_auth" } : {
      kind: "error",
      message: "This Telegram account link is missing its one-time token.",
    },
  );

  React.useEffect(() => {
    if (!token || !session?.accessToken || state.kind !== "waiting_for_auth") return;
    setState({ kind: "linking" });
    void api.users.consumeTelegramAccountLinkIntent(token)
      .then(() => setState({ kind: "linked" }))
      .catch((error: unknown) => {
        setState({
          kind: "error",
          message: getErrorMessage(error, "Could not link these accounts."),
        });
      });
  }, [api.users, session?.accessToken, state.kind, token]);

  return (
    <main className="min-h-[70svh] px-4 py-10">
      <PageContainer size="narrow">
        <section className="mx-auto flex max-w-lg flex-col items-center gap-5 rounded-2xl border border-border bg-card p-6 text-center">
          {state.kind === "linking" ? <Spinner className="size-8 text-muted-foreground" /> : null}
          <div className="space-y-2">
            <Type as="h1" variant="h2">
              {state.kind === "linked"
                ? "Pirate account linked"
                : state.kind === "linking"
                  ? "Linking your account…"
                  : "Link Telegram to Pirate"}
            </Type>
            <Type as="p" className="text-muted-foreground" variant="body">
              {state.kind === "linked"
                ? "Return to Telegram and reopen study. Your next session will use this Pirate account."
                : state.kind === "error"
                  ? state.message
                  : session
                    ? "Keep this page open while Pirate verifies both accounts."
                    : "Sign in with the Pirate account whose study history and streak you want to keep."}
            </Type>
          </div>
          {state.kind === "waiting_for_auth" && !session ? (
            <Button
              disabled={!connect}
              onClick={() => connect?.()}
            >
              Sign in to existing Pirate account
            </Button>
          ) : null}
          {state.kind === "waiting_for_auth" && !session && loadError ? (
            <Type as="p" className="text-destructive" variant="caption">{loadError}</Type>
          ) : null}
        </section>
      </PageContainer>
    </main>
  );
}
