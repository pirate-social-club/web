import type { Meta, StoryObj } from "@storybook/react-vite";
import * as React from "react";

import { Checkbox } from "@/components/primitives/checkbox";
import { Input } from "@/components/primitives/input";
import { cn } from "@/lib/utils";

import { NumericStepper, SegmentedControl } from "../create-community-composer.sections";

type CatalogCategory = "trading_card" | "watch";

type CardVariant = {
  id: string;
  title: string;
  set: string;
  year: string;
  grader: string;
  population: string;
};

type WatchModel = {
  id: string;
  brand: string;
  title: string;
  reference: string;
  material: string;
  count: string;
};

const cardVariants: CardVariant[] = [
  { id: "charizard-v", title: "Charizard V", set: "Champion's Path", year: "2020", grader: "PSA", population: "46" },
  { id: "charizard-ex", title: "Charizard ex", set: "Obsidian Flames", year: "2023", grader: "PSA", population: "31" },
  { id: "charizard-gx", title: "Charizard-GX", set: "Hidden Fates", year: "2019", grader: "BGS", population: "18" },
  { id: "charizard-base", title: "Charizard Holo", set: "Base Set", year: "1999", grader: "PSA", population: "7" },
];

const watchModels: WatchModel[] = [
  { id: "rolex-submariner", brand: "Rolex", title: "Submariner", reference: "124060", material: "Oystersteel", count: "22" },
  { id: "omega-speedmaster", brand: "Omega", title: "Speedmaster Professional", reference: "310.30.42", material: "Steel", count: "14" },
  { id: "patek-nautilus", brand: "Patek Philippe", title: "Nautilus", reference: "5711/1A", material: "Steel", count: "3" },
  { id: "ap-royal-oak", brand: "Audemars Piguet", title: "Royal Oak", reference: "15500ST", material: "Steel", count: "6" },
  { id: "cartier-santos", brand: "Cartier", title: "Santos de Cartier", reference: "WSSA0029", material: "Steel", count: "11" },
  { id: "tudor-bb58", brand: "Tudor", title: "Black Bay Fifty-Eight", reference: "M79030N", material: "Steel", count: "19" },
];

const cardSubjects = ["Charizard", "Pikachu", "Mewtwo", "Blastoise", "Venusaur"];
const watchBrands = ["Rolex", "Omega", "Patek Philippe", "Audemars Piguet", "Cartier", "Tudor"];

function CatalogButton({
  active,
  children,
  onClick,
}: {
  active: boolean;
  children: React.ReactNode;
  onClick: () => void;
}) {
  return (
    <button
      className={cn(
        "w-full rounded-[var(--radius-lg)] border px-4 py-3 text-left text-base transition-[background-color,border-color]",
        active ? "border-primary bg-primary/10 text-foreground" : "border-border-soft bg-background text-muted-foreground hover:border-primary/50 hover:text-foreground",
      )}
      type="button"
      onClick={onClick}
    >
      {children}
    </button>
  );
}

function ResultRow({
  checked,
  children,
  onClick,
}: {
  checked: boolean;
  children: React.ReactNode;
  onClick: () => void;
}) {
  return (
    <button
      className={cn(
        "flex w-full items-start gap-3 rounded-[var(--radius-lg)] border px-4 py-3 text-left transition-[background-color,border-color]",
        checked ? "border-primary bg-primary/10" : "border-border-soft bg-background hover:border-primary/40",
      )}
      type="button"
      onClick={onClick}
    >
      <Checkbox aria-hidden="true" checked={checked} className="mt-0.5" tabIndex={-1} />
      <div className="min-w-0 flex-1">{children}</div>
    </button>
  );
}

function CourtyardCatalogGatePrototype({
  initialCategory = "trading_card",
}: {
  initialCategory?: CatalogCategory;
}) {
  const [category, setCategory] = React.useState<CatalogCategory>(initialCategory);
  const [quantity, setQuantity] = React.useState(initialCategory === "trading_card" ? 3 : 5);
  const [subject, setSubject] = React.useState("Charizard");
  const [brand, setBrand] = React.useState("Rolex");
  const [search, setSearch] = React.useState("charizard");
  const [matchAllCards, setMatchAllCards] = React.useState(true);
  const [selectedCards, setSelectedCards] = React.useState<string[]>(["charizard-v", "charizard-ex"]);
  const [selectedWatchModels, setSelectedWatchModels] = React.useState<string[]>(["rolex-submariner"]);

  const visibleCards = cardVariants.filter((variant) =>
    `${variant.title} ${variant.set} ${variant.year}`.toLowerCase().includes(search.toLowerCase()),
  );
  const visibleWatches = watchModels.filter((model) =>
    model.brand === brand && `${model.brand} ${model.title} ${model.reference} ${model.material}`.toLowerCase().includes(search.toLowerCase()),
  );
  const selectedCardNames = cardVariants
    .filter((variant) => selectedCards.includes(variant.id))
    .map((variant) => variant.title);
  const selectedWatchNames = watchModels
    .filter((model) => selectedWatchModels.includes(model.id))
    .map((model) => `${model.brand} ${model.title}`);
  const ruleLabel = category === "trading_card"
    ? `${quantity} Courtyard Pokemon ${matchAllCards ? subject : selectedCardNames.join(", ")} cards`
    : `${quantity} Courtyard ${selectedWatchNames.length > 0 ? selectedWatchNames.join(", ") : brand} watches`;

  React.useEffect(() => {
    setSearch(category === "trading_card" ? subject.toLowerCase() : brand.toLowerCase());
    setQuantity(category === "trading_card" ? 3 : 5);
  }, [brand, category, subject]);

  return (
    <div className="mx-auto w-full max-w-5xl space-y-4">
      <h2 className="text-3xl font-semibold tracking-tight">Courtyard gate builder</h2>
      <div className="rounded-[var(--radius-lg)] border border-border bg-background">
        <div className="grid gap-6 p-6 md:grid-cols-[minmax(0,17rem)_minmax(0,1fr)] md:p-7">
          <aside className="space-y-5">
            <div className="space-y-2">
              <p className="text-base font-semibold text-foreground">Category</p>
              <SegmentedControl
                options={{
                  trading_card: { label: "Cards" },
                  watch: { label: "Watches" },
                }}
                value={category}
                onChange={setCategory}
              />
            </div>

            <div className="space-y-2">
              <p className="text-base font-semibold text-foreground">Quantity</p>
              <NumericStepper max={100} min={1} value={quantity} onChange={setQuantity} />
            </div>

            {category === "trading_card" ? (
              <div className="space-y-2">
                <p className="text-base font-semibold text-foreground">Pokemon subject</p>
                {cardSubjects.map((nextSubject) => (
                  <CatalogButton
                    key={nextSubject}
                    active={nextSubject === subject}
                    onClick={() => {
                      setSubject(nextSubject);
                      setMatchAllCards(true);
                    }}
                  >
                    {nextSubject}
                  </CatalogButton>
                ))}
              </div>
            ) : (
              <div className="space-y-2">
                <p className="text-base font-semibold text-foreground">Watch brand</p>
                {watchBrands.map((nextBrand) => (
                  <CatalogButton
                    key={nextBrand}
                    active={nextBrand === brand}
                    onClick={() => {
                      setBrand(nextBrand);
                      setSelectedWatchModels(watchModels.filter((model) => model.brand === nextBrand).slice(0, 1).map((model) => model.id));
                    }}
                  >
                    {nextBrand}
                  </CatalogButton>
                ))}
              </div>
            )}
          </aside>

          <main className="min-w-0 space-y-5">
            <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_14rem]">
              <Input
                className="h-12 rounded-[var(--radius-lg)]"
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search Courtyard catalog"
                value={search}
              />
              <div className="rounded-[var(--radius-lg)] border border-border-soft bg-muted/20 px-4 py-3">
                <p className="text-base text-muted-foreground">Selected rule</p>
                <p className="text-base font-semibold text-foreground">{ruleLabel}</p>
              </div>
            </div>

            {category === "trading_card" ? (
              <div className="space-y-3">
                <div className="grid gap-3 md:grid-cols-2">
                  <CatalogButton active={matchAllCards} onClick={() => setMatchAllCards(true)}>
                    <span className="font-semibold text-foreground">Any {subject} card</span>
                    <span className="mt-1 block text-base text-muted-foreground">All matching Courtyard variants count.</span>
                  </CatalogButton>
                  <CatalogButton active={!matchAllCards} onClick={() => setMatchAllCards(false)}>
                    <span className="font-semibold text-foreground">Selected variants</span>
                    <span className="mt-1 block text-base text-muted-foreground">{selectedCards.length} variants selected.</span>
                  </CatalogButton>
                </div>

                {!matchAllCards ? (
                  <div className="space-y-2">
                    {visibleCards.map((variant) => (
                      <ResultRow
                        key={variant.id}
                        checked={selectedCards.includes(variant.id)}
                        onClick={() => setSelectedCards((current) =>
                          current.includes(variant.id)
                            ? current.filter((id) => id !== variant.id)
                            : [...current, variant.id],
                        )}
                      >
                        <p className="text-base font-semibold text-foreground">{variant.title}</p>
                        <p className="text-base text-muted-foreground">{variant.set} · {variant.year} · {variant.grader}</p>
                        <p className="text-base text-muted-foreground">{variant.population} Courtyard assets</p>
                      </ResultRow>
                    ))}
                  </div>
                ) : (
                  <div className="rounded-[var(--radius-lg)] border border-border-soft bg-muted/20 px-4 py-4">
                    <p className="text-base font-semibold text-foreground">{visibleCards.length} visible {subject} variants</p>
                    <p className="text-base text-muted-foreground">Exact variants stay visible for audit, but the gate counts every catalog item normalized to this subject.</p>
                  </div>
                )}
              </div>
            ) : (
              <div className="space-y-2">
                {visibleWatches.map((model) => (
                  <ResultRow
                    key={model.id}
                    checked={selectedWatchModels.includes(model.id)}
                    onClick={() => setSelectedWatchModels((current) =>
                      current.includes(model.id)
                        ? current.filter((id) => id !== model.id)
                        : [...current, model.id],
                    )}
                  >
                    <p className="text-base font-semibold text-foreground">{model.brand} {model.title}</p>
                    <p className="text-base text-muted-foreground">Ref. {model.reference} · {model.material}</p>
                    <p className="text-base text-muted-foreground">{model.count} Courtyard assets</p>
                  </ResultRow>
                ))}
                {visibleWatches.length === 0 ? (
                  <div className="rounded-[var(--radius-lg)] border border-border-soft bg-muted/20 px-4 py-4">
                    <p className="text-base font-semibold text-foreground">No catalog results</p>
                    <p className="text-base text-muted-foreground">Change brand or search to pick a supported Courtyard watch model.</p>
                  </div>
                ) : null}
              </div>
            )}
          </main>
        </div>
      </div>
    </div>
  );
}

const meta = {
  title: "Compositions/CreateCommunityComposer/CourtyardCatalogGateBuilder",
  component: CourtyardCatalogGatePrototype,
  parameters: {
    layout: "fullscreen",
  },
  decorators: [
    (Story: () => React.ReactNode) => (
      <div className="min-h-screen bg-background p-6 text-foreground md:p-10">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof CourtyardCatalogGatePrototype>;

export default meta;

type Story = StoryObj<typeof meta>;

export const TradingCards: Story = {
  name: "Trading Cards / Charizard Catalog",
  render: () => <CourtyardCatalogGatePrototype />,
};

export const Watches: Story = {
  name: "Watches / Brand And Model Catalog",
  render: () => <CourtyardCatalogGatePrototype initialCategory="watch" />,
};
