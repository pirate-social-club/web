"use client";

import * as React from "react";
import { navigate } from "@/app/router";
import { Button } from "@/components/primitives/button";
import { Spinner } from "@/components/primitives/spinner";
import { Type } from "@/components/primitives/type";
import { useApi } from "@/lib/api";
import type { ApiLearningStudySession } from "@/lib/api/client-api-types";
import { getErrorMessage } from "@/lib/error-utils";

export type LearningDeckStudyAdapter = {
  createSession: () => Promise<ApiLearningStudySession>;
  reveal: (sessionId: string, expectedSessionRevision: number) => Promise<ApiLearningStudySession>;
  rate: (input: {
    sessionId: string;
    itemId: string;
    rating: "again" | "hard" | "good" | "easy";
    idempotencyKey: string;
    expectedSessionRevision: number;
  }) => Promise<ApiLearningStudySession>;
};

export function LearningDeckStudySurface({
  communityId,
  deckId,
  returnPath,
  title,
}: {
  communityId: string;
  deckId: string;
  returnPath: string;
  title: string;
}) {
  const api = useApi();
  const adapter = React.useMemo<LearningDeckStudyAdapter>(() => ({
    createSession: () => api.communities.createLearningStudySession(communityId, deckId, { now_ms: Date.now() }),
    reveal: (sessionId, expectedSessionRevision) => api.communities.revealLearningStudyItem(communityId, sessionId, expectedSessionRevision),
    rate: ({ sessionId, itemId, rating, idempotencyKey, expectedSessionRevision }) => api.communities.rateLearningStudyItem(communityId, sessionId, {
      item_id: itemId,
      rating,
      idempotency_key: idempotencyKey,
      expected_session_revision: expectedSessionRevision,
      reviewed_at_ms: Date.now(),
    }),
  }), [api.communities, communityId, deckId]);
  return (
    <LearningDeckStudyView
      adapter={adapter}
      returnPath={returnPath}
      title={title}
    />
  );
}

export function LearningDeckStudyView({
  adapter,
  returnPath,
  title,
}: {
  adapter: LearningDeckStudyAdapter;
  returnPath: string;
  title: string;
}) {
  const [state, setState] = React.useState<{ phase: "loading" | "ready" | "error"; session?: ApiLearningStudySession; message?: string }>({ phase: "loading" });
  const [busy, setBusy] = React.useState(false);

  const load = React.useCallback(async () => {
    setState({ phase: "loading" });
    try {
      const session = await adapter.createSession();
      setState({ phase: "ready", session });
    } catch (error) {
      setState({ phase: "error", message: getErrorMessage(error, "Could not open this deck.") });
    }
  }, [adapter]);

  React.useEffect(() => { void load(); }, [load]);

  async function reveal() {
    const session = state.session;
    if (!session || !session.current_item) return;
    setBusy(true);
    try {
      const next = await adapter.reveal(session.session_id, session.session_revision);
      setState({ phase: "ready", session: next });
    } catch (error) {
      setState({ phase: "error", message: getErrorMessage(error, "Could not reveal this answer.") });
    } finally {
      setBusy(false);
    }
  }

  async function rate(rating: "again" | "hard" | "good" | "easy") {
    const session = state.session;
    if (!session?.current_item || session.current_item.status !== "revealed") return;
    setBusy(true);
    try {
      const next = await adapter.rate({
        sessionId: session.session_id,
        itemId: session.current_item.item_id,
        rating,
        idempotencyKey: `web:${session.session_id}:${session.current_item.item_id}:${session.session_revision}`,
        expectedSessionRevision: session.session_revision,
      });
      setState({ phase: "ready", session: next });
    } catch (error) {
      setState({ phase: "error", message: getErrorMessage(error, "Could not save this review.") });
    } finally {
      setBusy(false);
    }
  }

  if (state.phase === "loading") return <div className="grid min-h-dvh place-items-center"><Spinner /></div>;
  if (state.phase === "error") {
    return <div className="mx-auto flex min-h-dvh max-w-lg flex-col items-center justify-center gap-4 p-6 text-center"><Type as="h1" variant="h3">{title}</Type><Type as="p" className="text-muted-foreground" variant="body">{state.message}</Type><div className="flex gap-2"><Button onClick={() => void load()}>Try again</Button><Button onClick={() => navigate(returnPath)} variant="secondary">Open post</Button></div></div>;
  }
  const session = state.session;
  if (!session || session.status !== "active" || !session.current_item) {
    return <div className="mx-auto flex min-h-dvh max-w-lg flex-col items-center justify-center gap-4 p-6 text-center"><Type as="h1" variant="h3">Deck complete</Type><Type as="p" className="text-muted-foreground" variant="body">There are no more due cards right now.</Type><Button onClick={() => navigate(returnPath)} variant="secondary">Open post</Button></div>;
  }
  const item = session.current_item;
  const revealed = item.status === "revealed";
  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-2xl flex-col gap-6 p-6">
      <div><Type as="p" variant="caption" className="text-muted-foreground">Learning deck · {session.reviewed_count}/{session.item_count}</Type><Type as="h1" variant="h2">{title}</Type></div>
      <section className="space-y-5 rounded-xl border border-border-soft bg-card p-6 shadow-sm">
        <Type as="p" variant="body-strong">{item.prompt}</Type>
        {revealed ? <div className="rounded-lg bg-muted p-4"><Type as="p" variant="body">{item.answer ?? ""}</Type></div> : <Type as="p" variant="caption" className="text-muted-foreground">Answer hidden until you reveal it.</Type>}
        {!revealed ? <Button disabled={busy} onClick={() => void reveal()}>Reveal answer</Button> : <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">{(["again", "hard", "good", "easy"] as const).map((rating) => <Button disabled={busy} key={rating} onClick={() => void rate(rating)} variant={rating === "good" ? "default" : "outline"}>{rating[0]?.toUpperCase()}{rating.slice(1)}</Button>)}</div>}
      </section>
      <Button className="self-start" onClick={() => navigate(returnPath)} variant="ghost">Back to post</Button>
    </main>
  );
}
