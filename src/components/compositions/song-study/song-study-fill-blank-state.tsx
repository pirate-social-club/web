import { Button } from "@/components/primitives/button";
import { Type } from "@/components/primitives/type";
import { cn } from "@/lib/utils";

import type { SongStudySurfaceState } from "./song-study-surface-types";

export function SongStudyFillBlankState({
  onClear,
  onTokenSelect,
  onUndo,
  state,
}: {
  onClear?: () => void;
  onTokenSelect?: (tokenId: string) => void;
  onUndo?: () => void;
  state: Extract<SongStudySurfaceState, { kind: "fill_blank" }>;
}) {
  const tokenById = new Map(state.exercise.tokens.map((token) => [token.id, token]));
  let blankIndex = 0;
  const correctByBlank = new Map(state.correctPlacements?.map((placement) => [placement.blank_id, placement.token_id]) ?? []);
  return (
    <div className="mx-auto flex w-full max-w-3xl flex-1 flex-col justify-center gap-8 px-4 py-10 sm:px-6">
      <Type as="p" className="text-muted-foreground" variant="label">{state.exercise.prompt}</Type>
      <div className="flex flex-wrap items-end gap-x-2 gap-y-4" dir="auto">
        {state.exercise.segments.map((segment, index) => {
          if (segment.kind === "text") {
            return <Type as="span" key={`text-${index}`} variant="h3">{segment.text}</Type>;
          }
          const selectedId = state.selectedTokenIds[blankIndex++];
          const shownId = state.result === "wrong" ? correctByBlank.get(segment.id) ?? selectedId : selectedId;
          const shown = shownId ? tokenById.get(shownId)?.text : undefined;
          return (
            <span
              className={cn(
                "inline-flex min-h-12 min-w-24 items-center justify-center border-b-2 border-border px-3",
                state.result === "correct" && "border-success text-success",
                state.result === "wrong" && "border-destructive text-destructive",
              )}
              key={segment.id}
            >
              <Type as="span" variant="h3">{shown ?? "…"}</Type>
            </span>
          );
        })}
      </div>
      <div className="flex flex-wrap gap-3">
        {state.exercise.tokens.map((token) => {
          const selected = state.selectedTokenIds.includes(token.id);
          return (
            <Button
              disabled={selected || Boolean(state.result) || Boolean(state.submitting)}
              key={token.id}
              onClick={() => onTokenSelect?.(token.id)}
              type="button"
              variant="secondary"
            >
              {token.text}
            </Button>
          );
        })}
      </div>
      {!state.result && state.selectedTokenIds.length > 0 ? (
        <div className="flex gap-3">
          <Button onClick={onUndo} type="button" variant="secondary">Undo</Button>
          <Button onClick={onClear} type="button" variant="secondary">Clear</Button>
        </div>
      ) : null}
      {state.submitError ? <Type as="p" className="text-destructive" role="alert" variant="caption">{state.submitError}</Type> : null}
    </div>
  );
}
