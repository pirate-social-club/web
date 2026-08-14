import type { Meta, StoryObj } from "@storybook/react-vite";
import * as React from "react";

type Card = { prompt: string; answer: string };

function DeckComposerFlow() {
  const [cards, setCards] = React.useState<Card[]>([{ prompt: "What does CAS protect?", answer: "A single state transition." }]);
  const [prompt, setPrompt] = React.useState("");
  const [answer, setAnswer] = React.useState("");
  const [validated, setValidated] = React.useState(false);
  const addCard = () => { if (!prompt.trim() || !answer.trim()) return; setCards((current) => [...current, { prompt: prompt.trim(), answer: answer.trim() }]); setPrompt(""); setAnswer(""); setValidated(false); };
  return <main className="mx-auto flex min-h-screen w-full max-w-3xl flex-col gap-6 p-6">
    <header><p className="text-sm text-muted-foreground">Create post · Learning deck</p><h1 className="text-3xl font-semibold">Author a deterministic study deck</h1></header>
    <section className="space-y-4 rounded-lg border p-5"><label className="block space-y-1"><span className="text-sm font-medium">Deck title</span><input className="w-full rounded-md border p-2" defaultValue="Spaced repetition foundations" /></label><p className="text-sm text-muted-foreground">Cards are versioned. The canonical package is normalized and hashed before the deck can publish.</p>
      <div className="grid gap-2 sm:grid-cols-2"><input aria-label="Prompt" className="rounded-md border p-2" onChange={(event) => setPrompt(event.target.value)} placeholder="Prompt" value={prompt} /><input aria-label="Answer" className="rounded-md border p-2" onChange={(event) => setAnswer(event.target.value)} placeholder="Answer" value={answer} /></div><button className="rounded-md border px-4 py-2" onClick={addCard} type="button">Add card</button>
    </section>
    <section className="space-y-3 rounded-lg border p-5"><div className="flex items-center justify-between"><h2 className="font-medium">Cards ({cards.length})</h2><span className="text-sm text-muted-foreground">CSV import supports bounded RFC-4180 text</span></div>{cards.map((card, index) => <div className="rounded-md bg-muted p-3 text-sm" key={`${card.prompt}-${index}`}><span className="font-medium">{index + 1}. {card.prompt}</span><p className="mt-1 text-muted-foreground">Answer hidden in study mode · {card.answer}</p></div>)}<div className="flex gap-2"><button className="rounded-md bg-primary px-4 py-2 text-primary-foreground" onClick={() => setValidated(true)} type="button">Validate canonical package</button>{validated ? <span className="self-center text-sm text-emerald-700">Valid · fsrs_6_v1 · package hash pinned</span> : null}</div></section>
    <section className="rounded-lg border border-dashed p-5"><h2 className="font-medium">Publish settings</h2><p className="mt-1 text-sm text-muted-foreground">Locked decks retain plaintext for rescanning. Buyers study only after entitlement and active enforcement checks.</p><button className="mt-3 rounded-md bg-primary px-4 py-2 text-primary-foreground disabled:opacity-50" disabled={!validated} type="button">Publish learning deck</button></section>
  </main>;
}

const meta = { title: "Compositions/Posts/PostComposer/Composer/Deck", component: DeckComposerFlow, parameters: { layout: "fullscreen" } } satisfies Meta<typeof DeckComposerFlow>;
export default meta;
type Story = StoryObj<typeof meta>;
export const Flow: Story = { name: "Deck authoring flow" };
