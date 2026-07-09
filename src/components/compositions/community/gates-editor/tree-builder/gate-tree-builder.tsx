"use client";

import * as React from "react";
import type { GateAtom, GateExpression, GatePolicy } from "@pirate/api-contracts";
import { Plus, Trash, X } from "@phosphor-icons/react";

import { NationalityMultiPicker } from "@/components/compositions/community/create-composer/nationality-picker";
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
import { interpolateMessage } from "@/lib/route-messages";
import { useUiLocale } from "@/lib/ui-locale";
import { cn } from "@/lib/utils";
import { getLocaleMessages } from "@/locales";

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
  const { locale } = useUiLocale();
  const copy = getLocaleMessages(locale, "gates").treeBuilder;
  const policy = serializeGateBuilderTreeDraft(value);
  const budget = getGateBuilderBudget(value);
  const personaResults = simulateGateBuilderPersonas(policy);
  const captchaOnly = captchaAloneAdmits(policy);
  const shouldShowComplexityWarning = budget.atoms >= Math.ceil(GATE_POLICY_MAX_ATOMS * 0.8)
    || budget.depth >= Math.ceil(GATE_POLICY_MAX_DEPTH * 0.8);
  const addRuleDisabled = budget.atoms >= GATE_POLICY_MAX_ATOMS;
  const addGroupDisabled = budget.depth >= GATE_POLICY_MAX_DEPTH;

  return (
    <section className={cn("mx-auto flex w-full max-w-6xl flex-col gap-4 p-4 text-foreground md:p-6", className)}>
      <div className="flex flex-col gap-1">
        <h1 className="text-3xl font-semibold tracking-normal">{copy.title}</h1>
        <p className="max-w-3xl text-base text-muted-foreground">
          {copy.description}
        </p>
      </div>

      <div className="rounded-[var(--radius-lg)] border border-border bg-card p-4">
        <div className="mb-2 text-base font-semibold uppercase tracking-wide text-muted-foreground">{copy.liveSummaryTitle}</div>
        <p className="text-base leading-7">{policy ? describePolicy(policy) : copy.emptySummary}</p>
      </div>

      {shouldShowComplexityWarning ? (
        <div className="rounded-[var(--radius-lg)] border border-warning/40 bg-warning/10 p-3 text-base text-warning">
          {addRuleDisabled || addGroupDisabled
            ? copy.limitReached
            : interpolateMessage(copy.complexityWarning, {
              limit: String(GATE_POLICY_MAX_ATOMS),
              used: String(budget.atoms),
            })}
        </div>
      ) : null}

      {captchaOnly ? (
        <div className="rounded-[var(--radius-lg)] border border-warning/40 bg-warning/10 p-3 text-base text-warning">
          {copy.strongBrowserChallengeWarning}
        </div>
      ) : null}

      <GateGroupEditor addGroupDisabled={addGroupDisabled} addRuleDisabled={addRuleDisabled} copy={copy} group={value} isRoot onChange={onChange} />

      <div className="rounded-[var(--radius-lg)] border border-border bg-card p-4">
        <div className="mb-2 text-base font-semibold uppercase tracking-wide text-muted-foreground">{copy.whoCanJoinTitle}</div>
        <p className="mb-3 text-base text-muted-foreground">{copy.whoCanJoinCaption}</p>
        <div className="grid gap-2 md:grid-cols-2">
          {personaResults.map((persona) => (
            <div
              className="flex items-center justify-between gap-3 rounded-[var(--radius-md)] border border-border-soft bg-background px-3 py-2"
              key={persona.id}
            >
              <span className="text-base">{personaLabel(copy, persona.id)}</span>
              <span className={cn("text-base font-semibold", persona.joins ? "text-success" : "text-muted-foreground")}>
                {persona.joins ? copy.canJoin : copy.cantJoin}
              </span>
            </div>
          ))}
        </div>
      </div>

      {devPreview ? (
        <details className="rounded-[var(--radius-lg)] border border-border bg-card p-4">
          <summary className="cursor-pointer text-base font-semibold uppercase tracking-wide text-muted-foreground">
            {copy.expressionPreviewTitle}
          </summary>
          <div className="mt-3 text-base text-muted-foreground">
            {interpolateMessage(copy.expressionPreviewBudget, {
              atoms: String(budget.atoms),
              depth: String(budget.depth),
              maxAtoms: String(GATE_POLICY_MAX_ATOMS),
              maxDepth: String(GATE_POLICY_MAX_DEPTH),
            })}
          </div>
          <pre className="mt-3 max-h-96 overflow-auto rounded-[var(--radius-md)] bg-background p-3 text-base leading-6 text-muted-foreground">
            {JSON.stringify(policy, null, 2)}
          </pre>
        </details>
      ) : null}
    </section>
  );
}

function GateGroupEditor({
  addGroupDisabled,
  addRuleDisabled,
  copy,
  group,
  isRoot = false,
  onChange,
  onRemove,
}: {
  addGroupDisabled: boolean;
  addRuleDisabled: boolean;
  copy: ReturnType<typeof getLocaleMessages<"gates">>["treeBuilder"];
  group: GateBuilderGroupDraft;
  isRoot?: boolean;
  onChange: (value: GateBuilderGroupDraft) => void;
  onRemove?: () => void;
}) {
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
        <OpSelect copy={copy} value={group.op} onChange={(op) => onChange({ ...group, op })} />
        <Button disabled={addRuleDisabled} size="sm" title={addRuleDisabled ? copy.limitReached : undefined} variant="secondary" leadingIcon={<Plus size={16} />} onClick={() => onChange({ ...group, children: [...group.children, defaultRule()] })}>
          {copy.actions.rule}
        </Button>
        <Button disabled={addGroupDisabled} size="sm" title={addGroupDisabled ? copy.limitReached : undefined} variant="outline" leadingIcon={<Plus size={16} />} onClick={() => onChange({ ...group, children: [...group.children, { kind: "group", op: "and", children: [defaultRule()] }] })}>
          {copy.actions.group}
        </Button>
        {!isRoot && onRemove ? (
          <Button aria-label={copy.actions.removeGroup} className="ms-auto" size="icon" variant="ghost" onClick={onRemove}>
            <Trash size={18} />
          </Button>
        ) : null}
      </div>

      <div className="flex flex-col gap-2">
        {group.children.length === 0 ? (
          <div className="rounded-[var(--radius-md)] border border-dashed border-border-soft p-6 text-center text-base text-muted-foreground">
            {copy.emptyGroup}
          </div>
        ) : null}
        {group.children.map((child, index) => child.kind === "group" ? (
          <GateGroupEditor
            addGroupDisabled={addGroupDisabled}
            addRuleDisabled={addRuleDisabled}
            copy={copy}
            group={child}
            key={index}
            onChange={(updated) => updateChild(index, updated)}
            onRemove={() => removeChild(index)}
          />
        ) : (
          <GateRuleRow
            copy={copy}
            key={index}
            onChange={(updated) => updateChild(index, updated)}
            onRemove={() => removeChild(index)}
            rule={child}
          />
        ))}
      </div>
    </div>
  );
}

function GateRuleRow({ copy, onChange, onRemove, rule }: {
  copy: ReturnType<typeof getLocaleMessages<"gates">>["treeBuilder"];
  onChange: (value: GateBuilderRuleDraft) => void;
  onRemove: () => void;
  rule: GateBuilderRuleDraft;
}) {
  const kind = getRuleKind(rule.gate);
  const operator = operatorLabel(copy, rule.gate);
  const hasOperator = operator != null;

  if (kind === "unknown") {
    return (
      <div className="flex items-center gap-3 rounded-[var(--radius-md)] border border-border-soft bg-background p-2">
        <div className="min-w-0 flex-1">
          <div className="text-base font-medium">{copy.unknownRequirementTitle}</div>
          <div className="truncate text-base text-muted-foreground">
            {interpolateMessage(copy.unknownRequirementDescription, { gate: JSON.stringify(rule.gate) })}
          </div>
        </div>
        <Button aria-label={copy.actions.removeRequirement} size="icon" variant="ghost" onClick={onRemove}>
          <X size={18} />
        </Button>
      </div>
    );
  }

  return (
    <div className={cn(
      "grid gap-2 rounded-[var(--radius-md)] border border-border-soft bg-background p-2 md:items-center",
      hasOperator
        ? "md:grid-cols-[minmax(220px,1.2fr)_auto_minmax(180px,1fr)_auto]"
        : "md:grid-cols-[minmax(220px,1.2fr)_minmax(180px,1fr)_auto]",
    )}>
      <RuleKindSelect copy={copy} value={kind} onChange={(nextKind) => onChange({ ...rule, gate: defaultGateForKind(nextKind) })} />
      {operator ? <span className="rounded-full border border-border-soft px-3 py-2 text-base text-muted-foreground">{operator}</span> : null}
      <RuleValueEditor copy={copy} gate={rule.gate} onChange={(gate) => onChange({ ...rule, gate })} />
      <Button aria-label={copy.actions.removeRequirement} size="icon" variant="ghost" onClick={onRemove}>
        <X size={18} />
      </Button>
    </div>
  );
}

function RuleValueEditor({ copy, gate, onChange }: {
  copy: ReturnType<typeof getLocaleMessages<"gates">>["treeBuilder"];
  gate: GateAtom;
  onChange: (gate: GateAtom) => void;
}) {
  switch (gate.type) {
    case "unique_human":
      return (
        <Select value={gate.provider === "very" ? "very" : "self"} onValueChange={(provider) => onChange({ type: "unique_human", provider: provider as "self" | "very" })}>
          <SelectTrigger aria-label={copy.inputs.humanVerificationProvider}><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="self">{copy.providers.self}</SelectItem>
            <SelectItem value="very">{copy.providers.very}</SelectItem>
          </SelectContent>
        </Select>
      );
    case "wallet_score":
      return (
        <Input
          aria-label={copy.inputs.minimumPassportScore}
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
          aria-label={copy.inputs.nftContractAddress}
          onChange={(event) => onChange({ type: "erc721_holding", chain_namespace: "eip155:1", contract_address: event.currentTarget.value })}
          value={gate.contract_address ?? ""}
        />
      );
    case "minimum_age":
      return (
        <Input
          aria-label={copy.inputs.minimumAge}
          min={18}
          max={125}
          onChange={(event) => onChange({ type: "minimum_age", provider: "self", minimum_age: Number.parseInt(event.currentTarget.value || "18", 10), accepted_providers: gate.accepted_providers })}
          type="number"
          value={gate.minimum_age ?? 18}
        />
      );
    case "nationality":
      return (
        <NationalityMultiPicker
          onChange={(allowed) => onChange({ type: "nationality", provider: "self", allowed, accepted_providers: gate.accepted_providers })}
          values={gate.allowed ?? []}
        />
      );
    case "altcha_pow":
      return <span aria-hidden="true" className="hidden md:block" />;
    default:
      return <span className="px-3 text-base text-muted-foreground">{copy.unsupportedAtom}</span>;
  }
}

function OpSelect({ copy, onChange, value }: {
  copy: ReturnType<typeof getLocaleMessages<"gates">>["treeBuilder"];
  onChange: (value: GateBuilderGroupOp) => void;
  value: GateBuilderGroupOp;
}) {
  return (
    <Select value={value} onValueChange={(nextValue) => onChange(nextValue as GateBuilderGroupOp)}>
      <SelectTrigger aria-label={copy.inputs.groupMatchMode} className="w-28"><SelectValue /></SelectTrigger>
      <SelectContent>
        <SelectItem value="and">AND</SelectItem>
        <SelectItem value="or">OR</SelectItem>
      </SelectContent>
    </Select>
  );
}

function RuleKindSelect({ copy, onChange, value }: {
  copy: ReturnType<typeof getLocaleMessages<"gates">>["treeBuilder"];
  onChange: (value: RuleKind) => void;
  value: RuleKind;
}) {
  return (
    <Select value={value} onValueChange={(nextValue) => onChange(nextValue as RuleKind)}>
      <SelectTrigger aria-label={copy.inputs.requirementType}><SelectValue /></SelectTrigger>
      <SelectContent>
        <SelectItem value="unique_human">{copy.requirementTypes.humanVerification}</SelectItem>
        <SelectItem value="altcha_pow">{copy.requirementTypes.browserChallenge}</SelectItem>
        <SelectItem value="wallet_score">{copy.requirementTypes.passportScore}</SelectItem>
        <SelectItem value="erc721_holding">{copy.requirementTypes.nftHolding}</SelectItem>
        <SelectItem value="nationality">{copy.requirementTypes.nationality}</SelectItem>
        <SelectItem value="minimum_age">{copy.requirementTypes.minimumAge}</SelectItem>
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

function operatorLabel(copy: ReturnType<typeof getLocaleMessages<"gates">>["treeBuilder"], gate: GateAtom): string | null {
  switch (gate.type) {
    case "unique_human":
      return copy.operators.provenBy;
    case "altcha_pow":
      return null;
    case "wallet_score":
      return copy.operators.atLeast;
    case "erc721_holding":
      return copy.operators.holdsOneFrom;
    case "nationality":
      return copy.operators.isOneOf;
    case "minimum_age":
      return copy.operators.atLeast;
    default:
      return copy.operators.matches;
  }
}

function personaLabel(copy: ReturnType<typeof getLocaleMessages<"gates">>["treeBuilder"], id: string): string {
  switch (id) {
    case "bot_captcha":
      return copy.personas.botCaptcha;
    case "self_human":
      return copy.personas.selfHuman;
    case "very_human":
      return copy.personas.veryHuman;
    case "passport_score_20":
      return copy.personas.passportScore20;
    case "nft_holder":
      return copy.personas.nftHolder;
    default:
      return id;
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
      return "complete browser challenge";
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
