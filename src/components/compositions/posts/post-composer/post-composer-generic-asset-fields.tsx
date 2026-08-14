"use client";

import { Plus, Trash } from "@phosphor-icons/react";

import { Button } from "@/components/primitives/button";
import { Input } from "@/components/primitives/input";
import { Textarea } from "@/components/primitives/textarea";
import { Type } from "@/components/primitives/type";
import type {
  DownloadFileComposerState,
  LearningDeckComposerState,
  LearningDeckCsvPreview,
} from "./post-composer.types";

const DOWNLOAD_ACCEPT = ".csv,.tsv,.txt,.json,text/csv,text/tab-separated-values,text/plain,application/json";

export function PostComposerGenericAssetFields({
  deck,
  file,
  mode,
  onCsvPreview,
  onDeckChange,
  onFileChange,
}: {
  deck: LearningDeckComposerState;
  file: DownloadFileComposerState;
  mode: "file" | "deck";
  onCsvPreview?: (file: File) => Promise<LearningDeckCsvPreview & { contentBlobId: string; importJobId: string }>;
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

  async function importCsv(file: File | null) {
    if (!file) return;
    try {
      if (!onCsvPreview) throw new Error("CSV preview is not available");
      const preview = await onCsvPreview(file);
      const promptColumn = preview.headers.length > 0 ? 0 : -1;
      const answerColumn = preview.headers.length > 1 ? 1 : -1;
      onDeckChange({
        ...deck,
        cards: [],
        csvImport: {
          ...preview,
          answerColumn,
          filename: file.name,
          promptColumn,
          tagsColumn: null,
        },
      });
    } catch (error) {
      onDeckChange({
        ...deck,
        cards: [],
        csvImport: {
          answerColumn: -1,
          contentBlobId: "",
          importJobId: "",
          error_count: 1,
          errors: [{ row: 0, code: "preview_failed", message: error instanceof Error ? error.message : "CSV preview failed" }],
          filename: file.name,
          headers: [],
          promptColumn: -1,
          rows: [],
          row_count: 0,
          tagsColumn: null,
        },
      });
    }
  }

  function updateCsvImport(patch: Partial<NonNullable<LearningDeckComposerState["csvImport"]>>) {
    if (!deck.csvImport) return;
    onDeckChange({ ...deck, csvImport: { ...deck.csvImport, ...patch } });
  }

  return (
    <section className="space-y-4 rounded-[var(--radius-lg)] border border-border-soft bg-muted/30 p-4">
      <div>
        <Type as="p" variant="body-strong">Learning deck</Type>
        <Type as="p" variant="body" className="text-muted-foreground">
          Add deterministic basic or cloze cards. Answers stay hidden until the learner explicitly reveals them.
        </Type>
      </div>
      <div className="space-y-2 rounded-md border border-border-soft bg-background p-3">
        <Type as="p" variant="body-strong">Import CSV</Type>
        <Type as="p" variant="caption" className="text-muted-foreground">
          Upload a UTF-8 CSV, preview bounded rows, then map prompt, answer, and optional tags before committing cards.
        </Type>
        <Input
          accept=".csv,text/csv"
          aria-label="Import deck CSV"
          onChange={(event) => void importCsv(event.target.files?.[0] ?? null)}
          type="file"
        />
        {deck.csvImport ? (
          <div className="space-y-2 rounded-md bg-muted/40 p-2">
            <div className="flex items-center justify-between gap-2">
              <Type as="p" variant="caption">{deck.csvImport.filename} · {deck.csvImport.rows.length.toLocaleString()} rows</Type>
              <Button
                aria-label="Clear CSV import"
                onClick={() => onDeckChange({ ...deck, cards: [], csvImport: undefined })}
                size="sm"
                variant="ghost"
              >
                Clear
              </Button>
            </div>
            {deck.csvImport.errors.length > 0 ? (
              <div className="space-y-1 text-sm text-destructive" role="alert">
                {deck.csvImport.errors.slice(0, 3).map((error) => <p key={`${error.row}:${error.code}`}>Row {error.row}: {error.message}</p>)}
              </div>
            ) : deck.csvImport.headers.length > 0 ? (
              <div className="grid gap-2 sm:grid-cols-3">
                <label className="space-y-1 text-sm">
                  <span>Prompt column</span>
                  <select
                    aria-label="CSV prompt column"
                    className="h-10 w-full rounded-md border border-border-soft bg-background px-2"
                    onChange={(event) => updateCsvImport({ promptColumn: Number(event.target.value) })}
                    value={deck.csvImport.promptColumn}
                  >
                    {deck.csvImport.headers.map((header, index) => <option key={`prompt-${index}`} value={index}>{header}</option>)}
                  </select>
                </label>
                <label className="space-y-1 text-sm">
                  <span>Answer column</span>
                  <select
                    aria-label="CSV answer column"
                    className="h-10 w-full rounded-md border border-border-soft bg-background px-2"
                    onChange={(event) => updateCsvImport({ answerColumn: Number(event.target.value) })}
                    value={deck.csvImport.answerColumn}
                  >
                    {deck.csvImport.headers.map((header, index) => <option key={`answer-${index}`} value={index}>{header}</option>)}
                  </select>
                </label>
                <label className="space-y-1 text-sm">
                  <span>Tags column</span>
                  <select
                    aria-label="CSV tags column"
                    className="h-10 w-full rounded-md border border-border-soft bg-background px-2"
                    onChange={(event) => updateCsvImport({ tagsColumn: event.target.value === "" ? null : Number(event.target.value) })}
                    value={deck.csvImport.tagsColumn ?? ""}
                  >
                    <option value="">None</option>
                    {deck.csvImport.headers.map((header, index) => <option key={`tags-${index}`} value={index}>{header}</option>)}
                  </select>
                </label>
              </div>
            ) : null}
            {deck.csvImport.rows.length > 0 && deck.csvImport.errors.length === 0 ? (
              <Type as="p" variant="caption" className="text-muted-foreground">
                Preview: {deck.csvImport.rows.slice(0, 3).map((row) => row.join(" · ")).join(" / ")}
              </Type>
            ) : null}
          </div>
        ) : null}
      </div>
      <Textarea
        aria-label="Deck description"
        onChange={(event) => onDeckChange({ ...deck, description: event.target.value })}
        placeholder="What will learners practice?"
        value={deck.description}
      />
      {!deck.csvImport ? (
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
      ) : null}
      {!deck.csvImport ? <Button leadingIcon={<Plus />} onClick={addCard} size="sm" variant="outline">Add card</Button> : null}
      <Type as="p" variant="caption" className="text-muted-foreground">
        Decks publish as locked goods. Simulated payments only; no real-money availability is implied.
      </Type>
    </section>
  );
}
