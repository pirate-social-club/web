import type { Meta, StoryObj } from "@storybook/react-vite";
import * as React from "react";

import type { GateBuilderGroupDraft } from "@/app/authenticated-helpers/community-gate-tree-draft";
import {
  Combobox,
  ComboboxChip,
  ComboboxChips,
  ComboboxChipsInput,
  ComboboxContent,
  ComboboxEmpty,
  ComboboxItem,
  ComboboxList,
  ComboboxValue,
} from "@/components/primitives/combobox";
import { GateTreeBuilder } from "./gate-tree-builder";

const meta = {
  title: "Compositions/Community/Moderation/Gates/Tree Builder",
  component: GateTreeBuilder,
  parameters: {
    layout: "fullscreen",
  },
} satisfies Meta<typeof GateTreeBuilder>;

export default meta;

type Story = StoryObj<typeof meta>;

function InteractiveStory({ initialValue }: { initialValue: GateBuilderGroupDraft }) {
  const [value, setValue] = React.useState(initialValue);
  return <GateTreeBuilder devPreview value={value} onChange={setValue} />;
}

const humanSelf = { kind: "rule", gate: { type: "unique_human", provider: "self" } } as const;
const humanVery = { kind: "rule", gate: { type: "unique_human", provider: "very" } } as const;
const antiBot = { kind: "rule", gate: { type: "altcha_pow" } } as const;
const score20 = { kind: "rule", gate: { type: "wallet_score", provider: "passport", minimum_score: 20 } } as const;
const nationality = {
  kind: "rule",
  gate: { type: "nationality", provider: "self", accepted_providers: ["self", "zkpassport"], allowed: ["US", "CA"] },
} as const;
const bayc = {
  kind: "rule",
  gate: {
    type: "erc721_holding",
    chain_namespace: "eip155:1",
    contract_address: "0xBC4CA0EDA7647A8AB7C2061C2E118A18A936F13D",
  },
} as const;
const charizard = {
  kind: "rule",
  gate: {
    type: "erc721_inventory_match",
    provider: "courtyard",
    chain_namespace: "eip155:137",
    contract_address: "0x251BE3A17Af4892035C37ebf5890F4a4D889dcAD",
    min_quantity: 1,
    match: {
      category: "trading_card",
      franchise: "Pokemon",
      subject: "Charizard",
      grade: "PSA 9",
    },
  },
} as const;

export const HumansOnly: Story = {
  render: () => <InteractiveStory initialValue={{ kind: "group", op: "or", children: [humanSelf, humanVery] }} />,
};

export const StopSpam: Story = {
  render: () => <InteractiveStory initialValue={{ kind: "group", op: "or", children: [antiBot, humanSelf, humanVery] }} />,
};

export const HumanWithFallbacks: Story = {
  render: () => <InteractiveStory initialValue={{ kind: "group", op: "or", children: [humanSelf, humanVery, score20, bayc] }} />,
};

export const NftClub: Story = {
  render: () => <InteractiveStory initialValue={{ kind: "group", op: "and", children: [bayc] }} />,
};

export const LoadedCharizardGate: Story = {
  render: () => <InteractiveStory initialValue={{ kind: "group", op: "and", children: [charizard] }} />,
};

export const RequireCharizardCard: Story = {
  render: () => <RequireCharizardCardStory />,
};

export const NationalityRule: Story = {
  render: () => <InteractiveStory initialValue={{ kind: "group", op: "and", children: [nationality] }} />,
};

export const HumanAndAntiBotOrScore: Story = {
  render: () => (
    <InteractiveStory
      initialValue={{
        kind: "group",
        op: "and",
        children: [
          humanVery,
          { kind: "group", op: "or", children: [antiBot, score20] },
        ],
      }}
    />
  ),
};

export const HumanOrAntiBotOrScore: Story = {
  render: () => <InteractiveStory initialValue={{ kind: "group", op: "or", children: [humanVery, antiBot, score20] }} />,
};

export const RepeatedNftRules: Story = {
  render: () => (
    <InteractiveStory
      initialValue={{
        kind: "group",
        op: "or",
        children: [
          bayc,
          {
            kind: "rule",
            gate: {
              type: "erc721_holding",
              chain_namespace: "eip155:1",
              contract_address: "0xb47e3cd837dDF8e4c57F05d70Ab865de6e193BBB",
            },
          },
        ],
      }}
    />
  ),
};

export const UnknownRequirement: Story = {
  render: () => (
    <InteractiveStory
      initialValue={{
        kind: "group",
        op: "and",
        children: [
          humanSelf,
          {
            kind: "rule",
            gate: {
              type: "nft_trait_snapshot_match",
              chain_namespace: "eip155:1",
              contract_address: "0x0000000000000000000000000000000000000000",
              match: { Fur: ["Gold"] },
            } as never,
          },
        ],
      }}
    />
  ),
};

type FacetOption = {
  count: number;
  value: string;
};

const subjectOptions: FacetOption[] = [
  { value: "Blastoise", count: 283 },
  { value: "Bulbasaur", count: 351 },
  { value: "Charizard", count: 412 },
  { value: "Charmander", count: 296 },
  { value: "Charmeleon", count: 117 },
  { value: "Dragonite", count: 148 },
  { value: "Gengar", count: 389 },
  { value: "Mewtwo", count: 227 },
  { value: "Pikachu", count: 620 },
  { value: "Squirtle", count: 244 },
  { value: "Venusaur", count: 179 },
];

const gradeOptions: FacetOption[] = [
  { value: "PSA 10", count: 96 },
  { value: "PSA 9", count: 412 },
  { value: "PSA 8", count: 538 },
  { value: "BGS 9.5", count: 74 },
  { value: "CGC 9", count: 121 },
];

function RequireCharizardCardStory() {
  const [subjects, setSubjects] = React.useState<FacetOption[]>([subjectOptions[2]!]);
  const [grades, setGrades] = React.useState<FacetOption[]>([gradeOptions[1]!]);
  const selectedSubjectLabels = subjects.map((subject) => subject.value);
  const selectedGradeLabels = grades.map((grade) => grade.value);
  const matchCount = subjects.length === 0
    ? 0
    : Math.max(24, subjects.reduce((total, subject) => total + subject.count, 0) - Math.max(0, grades.length - 1) * 80);
  const expression = {
    version: 1,
    expression: {
      op: "gate",
      gate: {
        type: "erc721_inventory_match",
        provider: "courtyard",
        chain_namespace: "eip155:137",
        contract_address: "0x251BE3A17Af4892035C37ebf5890F4a4D889dcAD",
        min_quantity: 1,
        match: {
          category: "trading_card",
          franchise: "Pokemon",
          subject: selectedSubjectLabels,
          grade: selectedGradeLabels,
        },
      },
    },
  };

  return (
    <section className="mx-auto flex w-full max-w-6xl flex-col gap-4 p-4 text-foreground md:p-6">
      <div className="flex flex-col gap-1">
        <h1 className="text-3xl font-semibold tracking-normal">Require Charizard Card</h1>
        <p className="max-w-3xl text-base text-muted-foreground">
          Members can join if they hold a supported Courtyard Pokemon card matching these values.
        </p>
      </div>

      <div className="rounded-[var(--radius-lg)] border border-border bg-card p-4">
        <div className="mb-2 text-base font-semibold uppercase tracking-wide text-muted-foreground">Live summary</div>
        <p className="text-base leading-7">
          Members can join if they hold a Courtyard graded card where Subject is {formatList(selectedSubjectLabels)} and Grade is {formatList(selectedGradeLabels)}.
        </p>
        <p className="mt-2 text-base text-muted-foreground">Approximately {matchCount.toLocaleString("en-US")} cards match.</p>
      </div>

      <div className="rounded-[var(--radius-lg)] border border-border bg-card p-3">
        <div className="grid gap-2 rounded-[var(--radius-md)] border border-border-soft bg-background p-2 md:grid-cols-[minmax(220px,1fr)_minmax(260px,2fr)] md:items-center">
          <div className="text-base font-medium">Card source</div>
          <div className="rounded-[var(--radius-md)] border border-border-soft bg-muted/30 px-4 py-3 text-base">
            Courtyard graded cards
          </div>
        </div>

        <div className="mt-2 grid gap-2 rounded-[var(--radius-md)] border border-border-soft bg-background p-2 md:grid-cols-[minmax(220px,1fr)_auto_minmax(260px,2fr)] md:items-center">
          <div className="text-base font-medium">Subject</div>
          <span className="rounded-full border border-border-soft px-3 py-2 text-base text-muted-foreground">is one of</span>
          <FacetPicker
            ariaLabel="Search card subject"
            options={subjectOptions}
            placeholder="Search card subject"
            value={subjects}
            onChange={setSubjects}
          />
        </div>

        <div className="mt-2 grid gap-2 rounded-[var(--radius-md)] border border-border-soft bg-background p-2 md:grid-cols-[minmax(220px,1fr)_auto_minmax(260px,2fr)] md:items-center">
          <div className="text-base font-medium">Grade</div>
          <span className="rounded-full border border-border-soft px-3 py-2 text-base text-muted-foreground">is one of</span>
          <FacetPicker
            ariaLabel="Search card grade"
            options={gradeOptions}
            placeholder="Search card grade"
            value={grades}
            onChange={setGrades}
          />
        </div>
      </div>

      <details className="rounded-[var(--radius-lg)] border border-border bg-card p-4">
        <summary className="cursor-pointer text-base font-semibold uppercase tracking-wide text-muted-foreground">
          expression_json preview
        </summary>
        <pre className="mt-3 max-h-96 overflow-auto rounded-[var(--radius-md)] bg-background p-3 text-base leading-6 text-muted-foreground">
          {JSON.stringify(expression, null, 2)}
        </pre>
      </details>
    </section>
  );
}

function FacetPicker({
  ariaLabel,
  onChange,
  options,
  placeholder,
  value,
}: {
  ariaLabel: string;
  onChange: (value: FacetOption[]) => void;
  options: FacetOption[];
  placeholder: string;
  value: FacetOption[];
}) {
  return (
    <Combobox<FacetOption, true>
      multiple
      autoHighlight
      items={options}
      itemToStringLabel={(option) => option.value}
      itemToStringValue={(option) => option.value}
      onValueChange={onChange}
      value={value}
    >
      <ComboboxChips className="rounded-[var(--radius-lg)]">
        <ComboboxValue>
          {(selectedOptions) => (
            <>
              {selectedOptions.map((option: FacetOption) => (
                <ComboboxChip key={option.value}>{option.value}</ComboboxChip>
              ))}
              <ComboboxChipsInput
                aria-label={ariaLabel}
                placeholder={value.length > 0 ? placeholder : "Choose values"}
              />
            </>
          )}
        </ComboboxValue>
      </ComboboxChips>
      <ComboboxContent>
        <ComboboxEmpty>No values found.</ComboboxEmpty>
        <ComboboxList className="py-0">
          {(option) => (
            <ComboboxItem key={option.value} value={option}>
              <div className="flex w-full items-center justify-between gap-4">
                <span className="text-base font-medium">{option.value}</span>
                <span className="text-base text-muted-foreground">{option.count.toLocaleString("en-US")} cards</span>
              </div>
            </ComboboxItem>
          )}
        </ComboboxList>
      </ComboboxContent>
    </Combobox>
  );
}

function formatList(values: string[]): string {
  if (values.length === 0) {
    return "not selected";
  }
  return values.join(" or ");
}
