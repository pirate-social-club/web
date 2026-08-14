import type { Meta, StoryObj } from "@storybook/react-vite";
import * as React from "react";

const cards = [{ prompt: "What does a review event store?", answer: "An append-only rating and resulting state." }, { prompt: "Why is the scheduler deterministic?", answer: "It receives an explicit timestamp and disables fuzzing." }];
function DeckStudyFlow() {
  const [index, setIndex] = React.useState(0);
  const [revealed, setRevealed] = React.useState(false);
  const [rating, setRating] = React.useState<string | null>(null);
  const card = cards[index];
  const rate = (value: string) => { setRating(value); setRevealed(false); setIndex((current) => (current + 1) % cards.length); };
  return <main className="mx-auto flex min-h-screen w-full max-w-xl flex-col gap-5 p-6"><header><p className="text-sm text-muted-foreground">Study session · fsrs_6_v1</p><h1 className="text-3xl font-semibold">Spaced repetition foundations</h1></header><section aria-live="polite" className="space-y-5 rounded-lg border p-6"><div className="flex justify-between text-sm text-muted-foreground"><span>Card {index + 1} of {cards.length}</span><span>{rating ? `Last rating: ${rating}` : "Due now"}</span></div><h2 className="text-xl font-medium">{card.prompt}</h2>{revealed ? <p className="rounded-md bg-muted p-4">{card.answer}</p> : <p className="rounded-md bg-muted p-4 text-sm text-muted-foreground">Answer is withheld until reveal.</p>}{!revealed ? <button className="rounded-md bg-primary px-4 py-2 text-primary-foreground" onClick={() => setRevealed(true)} type="button">Reveal answer</button> : <div className="grid grid-cols-4 gap-2">{["again", "hard", "good", "easy"].map((value) => <button className="rounded-md border px-2 py-2 text-sm" key={value} onClick={() => rate(value)} type="button">{value}</button>)}</div>}</section><p className="text-xs text-muted-foreground">Every rating uses a session revision and idempotency key; stale tabs cannot overwrite review state.</p></main>;
}
const meta = { title: "Compositions/Learning Decks/Study", component: DeckStudyFlow, parameters: { layout: "fullscreen" } } satisfies Meta<typeof DeckStudyFlow>;
export default meta;
type Story = StoryObj<typeof meta>;
export const Flow: Story = { name: "Deck study flow" };
