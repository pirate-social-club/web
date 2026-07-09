"use client";

import * as React from "react";
import type { GateAtom, GateExpression, GatePolicy } from "@pirate/api-contracts";
import { Plus, Trash, X } from "@phosphor-icons/react";

import {
  captchaAloneAdmits,
  GATE_POLICY_MAX_ATOMS,
  GATE_POLICY_MAX_DEPTH,
  getGateBuilderBudget,
  serializeGateBuilderTreeDraft,
  simulateGateBuilderPersonas,
  type GateBuilderDraftNode,
  type GateBuilderGroupDraft,
  type GateBuilderGroupOp,
  type GateBuilderRuleDraft,
} from "@/app/authenticated-helpers/community-gate-tree-draft";
import { Button } from "@/components/primitives/button";
import { Input } from "@/components/primitives/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/primitives/select";
import { cn } from "@/lib/utils";

export type GateTreeBuilderProps = {
  className?: string;
  devPreview?: boolean;
  onChange: (value: GateBuilderGroupDraft) => void;
  value: GateBuilderGroupDraft;
};

type RuleKind =
  | "altcha_pow"
  | "erc721_holding"
  | "minimum_age"
  | "nationality"
  | "unique_human"
  | "wallet_score"
  | "unknown";

const DEFAULT_CONTRACT = "0x0000000000000000000000000000000000000000";

export function GateTreeBuilder({ className, devPreview = false, onChange, value }: GateTreeBuilderProps) {
  const policy = serializeGateBuilderTreeDraft(value);
  const budget = getGateBuilderBudget(value);
  const personaResults = simulateGateBuilderPersonas(policy);
  const captchaOnly = captchaAloneAdmits(policy);

  return (
    <section className={cn("mx-auto flex w-full max-w-6xl flex-col gap-4 p-4 text-foreground md:p-6", className)}>
      <div className="flex flex-col gap-1">
        <h1 className="text-3xl font-semibold tracking-normal">Join access</h1>
        <p className="max-w-3xl text-base text-muted-foreground">
          Compose eligibility with nested AND/OR groups. Rules serialize to the same expression model the backend evaluates.
        </p>
      </div>

      <div className="rounded-[var(--radius-lg)] border border-border bg-card p-4">
        <div className="mb-2 flex items-center justify-between gap-3">
          <div className="text-base font-semibold uppercase tracking-wide text-muted-foreground">Live summary</div>
          <div className="text-base text-muted-foreground">
            Atoms {budget.atoms}/{GATE_POLICY_MAX_ATOMS} · Depth {budget.depth}/{GATE_POLICY_MAX_DEPTH}
          </div>
        </div>
        <p className="text-base leading-7">{policy ? describePolicy(policy) : "No join requirements yet."}</p>
      </div>

      {captchaOnly ? (
        <div className="rounded-[var(--radius-lg)] border border-warning/40 bg-warning/10 p-3 text-base text-warning">
          Anyone who completes only the browser anti-bot check can join. Use this only when the goal is spam friction, not human verification.
        </div>
      ) : null}

      <GateGroupEditor group={value} isRoot onChange={onChange} policy={policy} />

      <div className="rounded-[var(--radius-lg)] border border-border bg-card p-4">
        <div className="mb-3 text-base font-semibold uppercase tracking-wide text-muted-foreground">Who gets in</div>
        <div className="grid gap-2 md:grid-cols-2">
          {personaResults.map((persona) => (
            <div
              className="flex items-center justify-between gap-3 rounded-[var(--radius-md)] border border-border-soft bg-background px-3 py-2"
              key={persona.id}
            >
              <span className="text-base">{persona.label}</span>
              <span className={cn("text-base font-semibold", persona.joins ? "text-success" : "text-muted-foreground")}>
                {persona.joins ? "joins" : "blocked"}
              </span>
            </div>
          ))}
        </div>
      </div>

      {devPreview ? (
        <details className="rounded-[var(--radius-lg)] border border-border bg-card p-4">
          <summary className="cursor-pointer text-base font-semibold uppercase tracking-wide text-muted-foreground">
            expression_json preview
          </summary>
          <pre className="mt-3 max-h-96 overflow-auto rounded-[var(--radius-md)] bg-background p-3 text-base leading-6 text-muted-foreground">
            {JSON.stringify(policy, null, 2)}
          </pre>
        </details>
      ) : null}
    </section>
  );
}

function GateGroupEditor({
  group,
  isRoot = false,
  onChange,
  onRemove,
  policy,
}: {
  group: GateBuilderGroupDraft;
  isRoot?: boolean;
  onChange: (value: GateBuilderGroupDraft) => void;
  onRemove?: () => void;
  policy: GatePolicy | null;
}) {
  const containsLocalAntiBotFallback = group.op === "or"
    && group.children.some((child) => child.kind === "rule" && child.gate.type === "altcha_pow")
    && !captchaAloneAdmits(policy);

  const updateChild = (index: number, child: GateBuilderDraftNode) => {
    onChange({ ...group, children: group.children.map((existing, childIndex) => childIndex === index ? child : existing) });
  };
  const removeChild = (index: number) => {
    onChange({ ...group, children: group.children.filter((_, childIndex) => childIndex !== index) });
  };

  return (
    <div className={cn(
      "rounded-[var(--radius-lg)] border border-border bg-card p-3",
      !isRoot && "bg-muted/20",
    )}>
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <OpSelect value={group.op} onChange={(op) => onChange({ ...group, op })} />
        <Button size="sm" variant="secondary" leadingIcon={<Plus size={16} />} onClick={() => onChange({ ...group, children: [...group.children, defaultRule()] })}>
          Rule
        </Button>
        <Button size="sm" variant="outline" leadingIcon={<Plus size={16} />} onClick={() => onChange({ ...group, children: [...group.children, { kind: "group", op: "and", children: [defaultRule()] }] })}>
          Group
        </Button>
        {!isRoot && onRemove ? (
          <Button aria-label="Remove group" className="ms-auto" size="icon" variant="ghost" onClick={onRemove}>
            <Trash size={18} />
          </Button>
        ) : null}
      </div>

      <div className="flex flex-col gap-2">
        {group.children.length === 0 ? (
          <div className="rounded-[var(--radius-md)] border border-dashed border-border-soft p-6 text-center text-base text-muted-foreground">
            Add a rule or nested group.
          </div>
        ) : null}
        {group.children.map((child, index) => child.kind === "group" ? (
          <GateGroupEditor
            group={child}
            key={index}
            onChange={(updated) => updateChild(index, updated)}
            onRemove={() => removeChild(index)}
            policy={policy}
          />
        ) : (
          <GateRuleRow
            key={index}
            onChange={(updated) => updateChild(index, updated)}
            onRemove={() => removeChild(index)}
            rule={child}
          />
        ))}
      </div>

      {containsLocalAntiBotFallback ? (
        <div className="mt-3 text-base text-warning">
          Browser anti-bot is the easiest path through this OR group, but requirements outside this group still apply.
        </div>
      ) : null}
    </div>
  );
}

function GateRuleRow({ onChange, onRemove, rule }: {
  onChange: (value: GateBuilderRuleDraft) => void;
  onRemove: () => void;
  rule: GateBuilderRuleDraft;
}) {
  const kind = getRuleKind(rule.gate);

  if (kind === "unknown") {
    return (
      <div className="flex items-center gap-3 rounded-[var(--radius-md)] border border-border-soft bg-background p-2">
        <div className="min-w-0 flex-1">
          <div className="text-base font-medium">Unrecognized requirement</div>
          <div className="truncate text-base text-muted-foreground">Preserved as {JSON.stringify(rule.gate)}</div>
        </div>
        <Button aria-label="Remove requirement" size="icon" variant="ghost" onClick={onRemove}>
          <X size={18} />
        </Button>
      </div>
    );
  }

  return (
    <div className="grid gap-2 rounded-[var(--radius-md)] border border-border-soft bg-background p-2 md:grid-cols-[minmax(220px,1.2fr)_auto_minmax(180px,1fr)_auto] md:items-center">
      <RuleKindSelect value={kind} onChange={(nextKind) => onChange({ ...rule, gate: defaultGateForKind(nextKind) })} />
      <span className="rounded-full border border-border-soft px-3 py-2 text-base text-muted-foreground">{operatorLabel(rule.gate)}</span>
      <RuleValueEditor gate={rule.gate} onChange={(gate) => onChange({ ...rule, gate })} />
      <Button aria-label="Remove requirement" size="icon" variant="ghost" onClick={onRemove}>
        <X size={18} />
      </Button>
    </div>
  );
}

function RuleValueEditor({ gate, onChange }: { gate: GateAtom; onChange: (gate: GateAtom) => void }) {
  switch (gate.type) {
    case "unique_human":
      return (
        <Select value={gate.provider === "very" ? "very" : "self"} onValueChange={(provider) => onChange({ type: "unique_human", provider: provider as "self" | "very" })}>
          <SelectTrigger aria-label="Human verification provider"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="self">Self.xyz</SelectItem>
            <SelectItem value="very">Very palm scan</SelectItem>
          </SelectContent>
        </Select>
      );
    case "wallet_score":
      return (
        <Input
          aria-label="Minimum Passport score"
          min={0}
          max={100}
          onChange={(event) => onChange({ type: "wallet_score", provider: "passport", minimum_score: Number.parseInt(event.currentTarget.value || "0", 10) })}
          type="number"
          value={gate.minimum_score ?? 20}
        />
      );
    case "erc721_holding":
      return (
        <Input
          aria-label="NFT contract address"
          onChange={(event) => onChange({ type: "erc721_holding", chain_namespace: "eip155:1", contract_address: event.currentTarget.value })}
          value={gate.contract_address ?? ""}
        />
      );
    case "minimum_age":
      return (
        <Input
          aria-label="Minimum age"
          min={18}
          max={125}
          onChange={(event) => onChange({ type: "minimum_age", provider: "self", minimum_age: Number.parseInt(event.currentTarget.value || "18", 10), accepted_providers: gate.accepted_providers })}
          type="number"
          value={gate.minimum_age ?? 18}
        />
      );
    case "nationality":
      return (
        <Input
          aria-label="Allowed nationalities"
          onChange={(event) => onChange({ type: "nationality", provider: "self", allowed: event.currentTarget.value.split(",").map((value) => value.trim()).filter(Boolean), accepted_providers: gate.accepted_providers })}
          placeholder="US, CA"
          value={(gate.allowed ?? []).join(", ")}
        />
      );
    case "altcha_pow":
      return <span className="px-3 text-base text-muted-foreground">No configuration</span>;
    default:
      return <span className="px-3 text-base text-muted-foreground">Unsupported atom</span>;
  }
}

function OpSelect({ onChange, value }: { onChange: (value: GateBuilderGroupOp) => void; value: GateBuilderGroupOp }) {
  return (
    <Select value={value} onValueChange={(nextValue) => onChange(nextValue as GateBuilderGroupOp)}>
      <SelectTrigger aria-label="Group match mode" className="w-28"><SelectValue /></SelectTrigger>
      <SelectContent>
        <SelectItem value="and">AND</SelectItem>
        <SelectItem value="or">OR</SelectItem>
      </SelectContent>
    </Select>
  );
}

function RuleKindSelect({ onChange, value }: { onChange: (value: RuleKind) => void; value: RuleKind }) {
  return (
    <Select value={value} onValueChange={(nextValue) => onChange(nextValue as RuleKind)}>
      <SelectTrigger aria-label="Requirement type"><SelectValue /></SelectTrigger>
      <SelectContent>
        <SelectItem value="unique_human">Human verification</SelectItem>
        <SelectItem value="altcha_pow">Browser anti-bot</SelectItem>
        <SelectItem value="wallet_score">Passport score</SelectItem>
        <SelectItem value="erc721_holding">NFT holding</SelectItem>
        <SelectItem value="nationality">Nationality</SelectItem>
        <SelectItem value="minimum_age">Minimum age</SelectItem>
      </SelectContent>
    </Select>
  );
}

function defaultRule(): GateBuilderRuleDraft {
  return { kind: "rule", gate: { type: "unique_human", provider: "self" } };
}

function defaultGateForKind(kind: RuleKind): GateAtom {
  switch (kind) {
    case "altcha_pow":
      return { type: "altcha_pow" };
    case "erc721_holding":
      return { type: "erc721_holding", chain_namespace: "eip155:1", contract_address: DEFAULT_CONTRACT };
    case "minimum_age":
      return { type: "minimum_age", provider: "self", minimum_age: 18 };
    case "nationality":
      return { type: "nationality", provider: "self", accepted_providers: ["self", "zkpassport"], allowed: [] };
    case "wallet_score":
      return { type: "wallet_score", provider: "passport", minimum_score: 20 };
    case "unique_human":
    case "unknown":
    default:
      return { type: "unique_human", provider: "self" };
  }
}

function getRuleKind(gate: GateAtom): RuleKind {
  switch (gate.type) {
    case "altcha_pow":
    case "erc721_holding":
    case "minimum_age":
    case "nationality":
    case "unique_human":
    case "wallet_score":
      return gate.type;
    default:
      return "unknown";
  }
}

function operatorLabel(gate: GateAtom): string {
  switch (gate.type) {
    case "unique_human":
      return "proven by";
    case "altcha_pow":
      return "solved at join";
    case "wallet_score":
      return "at least";
    case "erc721_holding":
      return "holds >= 1 from";
    case "nationality":
      return "is one of";
    case "minimum_age":
      return "at least";
    default:
      return "matches";
  }
}

function describePolicy(policy: GatePolicy): string {
  return describeExpression(policy.expression as GateExpression);
}

function describeExpression(expression: GateExpression): string {
  if (expression.op === "gate" && expression.gate) {
    return describeGate(expression.gate);
  }
  const joiner = expression.op === "or" ? " or " : " and ";
  const children = (expression.children ?? []) as GateExpression[];
  return children.map((child) => {
    const text = describeExpression(child);
    return child.op === "gate" ? text : `(${text})`;
  }).join(joiner);
}

function describeGate(gate: GateAtom): string {
  switch (gate.type) {
    case "unique_human":
      return gate.provider === "very" ? "prove human with Very palm scan" : "prove human with Self.xyz";
    case "altcha_pow":
      return "complete browser anti-bot";
    case "wallet_score":
      return `have Passport score at least ${gate.minimum_score ?? 0}`;
    case "erc721_holding":
      return `hold an NFT from ${shortAddress(gate.contract_address ?? "")}`;
    case "nationality":
      return `prove nationality ${gate.allowed?.length ? gate.allowed.join("/") : "(choose countries)"}`;
    case "minimum_age":
      return `prove age at least ${gate.minimum_age ?? 18}`;
    default:
      return "satisfy an unrecognized requirement";
  }
}

function shortAddress(value: string): string {
  return value.length > 12 ? `${value.slice(0, 6)}...${value.slice(-4)}` : value || "(contract)";
}
