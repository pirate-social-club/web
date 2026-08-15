"use client";

import { Plus, Trash } from "@phosphor-icons/react";

import { Button } from "@/components/primitives/button";
import { Input } from "@/components/primitives/input";
import { Textarea } from "@/components/primitives/textarea";
import { Type } from "@/components/primitives/type";
import type { DownloadFileComposerState, LearningDeckComposerState } from "./post-composer.types";

const DOWNLOAD_ACCEPT = ".csv,.tsv,.txt,.json,text/csv,text/tab-separated-values,text/plain,application/json";

export function PostComposerGenericAssetFields({
  deck,
  file,
  mode,
  onDeckChange,
  onFileChange,
}: {
  deck: LearningDeckComposerState;
  file: DownloadFileComposerState;
  mode: "file" | "deck";
  onDeckChange: (next: LearningDeckComposerState) => void;
  onFileChange: (next: DownloadFileComposerState) => void;
}) {
  if (mode === "file") {
    return (
      <section className="space-y-3 rounded-[var(--radius-lg)] border border-border-soft bg-muted/30 p-4">
        <div>
          <Type as="p" variant="body-strong">Downloadable file</Type>
          <Type as="p" variant="body" className="text-muted-foreground">
            CSV, TSV, TXT, and JSON files are scanned before publication. Locked delivery keeps plaintext available to the platform for rescanning.
          </Type>
        </div>
        <Input
          accept={DOWNLOAD_ACCEPT}
          onChange={(event) => {
            const next = event.target.files?.[0] ?? null;
            onFileChange({ upload: next, label: next?.name });
          }}
          type="file"
        />
        {file.upload ? <Type as="p" variant="caption" className="text-muted-foreground">{file.upload.name} · {file.upload.size.toLocaleString()} bytes</Type> : null}
        <Type as="p" variant="caption" className="text-muted-foreground">
          Public/free delivery is not enabled yet. This creator flow publishes locked goods on the simulated Base Sepolia USDC rail.
        </Type>
      </section>
    );
  }

  function addCard() {
    onDeckChange({
      ...deck,
      cards: [...deck.cards, { id: crypto.randomUUID(), cardType: "basic", prompt: "", answer: "", tags: [] }],
    });
  }

  return (
    <section className="space-y-4 rounded-[var(--radius-lg)] border border-border-soft bg-muted/30 p-4">
      <div>
        <Type as="p" variant="body-strong">Learning deck</Type>
        <Type as="p" variant="body" className="text-muted-foreground">
          Add deterministic basic or cloze cards. Answers stay hidden until the learner explicitly reveals them.
        </Type>
      </div>
      <Textarea
        aria-label="Deck description"
        onChange={(event) => onDeckChange({ ...deck, description: event.target.value })}
        placeholder="What will learners practice?"
        value={deck.description}
      />
      <div className="space-y-3">
        {deck.cards.map((card, index) => (
          <div className="space-y-2 rounded-lg border border-border-soft bg-background p-3" key={card.id}>
            <div className="flex items-center justify-between gap-2">
              <Type as="p" variant="caption">Card {index + 1}</Type>
              <Button
                aria-label={`Remove card ${index + 1}`}
                leadingIcon={<Trash />}
                onClick={() => onDeckChange({ ...deck, cards: deck.cards.filter((item) => item.id !== card.id) })}
                size="sm"
                variant="ghost"
              />
            </div>
            <select
              aria-label={`Card ${index + 1} type`}
              className="h-10 w-full rounded-md border border-border-soft bg-background px-3 text-sm"
              onChange={(event) => onDeckChange({
                ...deck,
                cards: deck.cards.map((item) => item.id === card.id ? { ...item, cardType: event.target.value as "basic" | "cloze" } : item),
              })}
              value={card.cardType}
            >
              <option value="basic">Basic</option>
              <option value="cloze">Cloze</option>
            </select>
            <Input
              aria-label={`Card ${index + 1} prompt`}
              onChange={(event) => onDeckChange({ ...deck, cards: deck.cards.map((item) => item.id === card.id ? { ...item, prompt: event.target.value } : item) })}
              placeholder="Prompt"
              value={card.prompt}
            />
            <Textarea
              aria-label={`Card ${index + 1} answer`}
              onChange={(event) => onDeckChange({ ...deck, cards: deck.cards.map((item) => item.id === card.id ? { ...item, answer: event.target.value } : item) })}
              placeholder="Answer"
              value={card.answer}
            />
          </div>
        ))}
      </div>
      <Button leadingIcon={<Plus />} onClick={addCard} size="sm" variant="outline">Add card</Button>
      <Type as="p" variant="caption" className="text-muted-foreground">
        Decks publish as locked goods. Simulated payments only; no real-money availability is implied.
      </Type>
    </section>
  );
}
