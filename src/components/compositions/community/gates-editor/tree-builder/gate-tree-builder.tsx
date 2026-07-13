"use client";

import * as React from "react";
import type { GateAtom, GateExpression } from "@pirate/api-contracts";
import { Plus, Trash, X } from "@phosphor-icons/react";

import { NationalityMultiPicker } from "@/components/compositions/community/create-composer/nationality-picker";
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
import {
  captchaAloneAdmits,
  gateAssetMinimum,
  GATE_POLICY_MAX_ATOMS,
  GATE_POLICY_MAX_DEPTH,
  getGateBuilderBudget,
  isGateBuilderDraftWithinLimits,
  normalizePassportMinimumScore,
  PASSPORT_SCORE_FLOOR,
  serializeGateBuilderTreeDraft,
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
import { Chip } from "@/components/primitives/chip";
import { validateGateAtom } from "@/lib/gate-atom-validation";
import { interpolateMessage } from "@/lib/route-messages";
import { useUiLocale } from "@/lib/ui-locale";
import { cn } from "@/lib/utils";
import { getLocaleMessages } from "@/locales";
import type {
  AssetSourceDescriptor,
  CollectionCapabilitySource,
  FacetValueSuggestion,
} from "./collection-capability-source";
import { replaceEditableFacet } from "./collection-capability-source";

export type GateTreeBuilderProps = {
  capabilitySource?: CollectionCapabilitySource;
  className?: string;
  onChange: (value: GateBuilderGroupDraft) => void;
  showHeader?: boolean;
  value: GateBuilderGroupDraft;
};

type TreeBuilderCopy = ReturnType<typeof getLocaleMessages<"gates">>["treeBuilder"];

type RuleKind =
  | "altcha_pow"
  | "erc721_holding"
  | "gender"
  | "minimum_age"
  | "nationality"
  | "unique_human"
  | "wallet_score"
  | "unknown";

const DEFAULT_CONTRACT = "0x0000000000000000000000000000000000000000";

/**
 * Shared sizing so every control on a rule line lands on the same 44px (h-11) baseline
 * and the requirement-type select forms one column across rules of different kinds.
 */
const RULE_KIND_COL = "w-full md:w-56 md:shrink-0";
const FACET_KEY_COL = "w-full md:w-44 md:shrink-0";
const RULE_LINE = "flex flex-col gap-2 md:flex-row md:items-center";
const RULE_CARD = "rounded-[var(--radius-md)] border border-border-soft bg-background p-2";
/** Chip box matches Input/Select: 44px tall, pill radius. py-1 + 34px chip = 44. */
const CHIPS_BOX = "min-h-11 rounded-full py-1";
const CHIPS_CHIP = "py-1";
/**
 * Base ComboboxChipsInput is `min-w-32 flex-1`. Overriding with `flex-none` made the input
 * keep its intrinsic ~230px width, so a chip + input overflowed and wrapped to a second line.
 * Keeping flex-1 (basis 0) and only shrinking the min-width lets it collapse instead of wrap.
 */
const CHIPS_INPUT_WITH_VALUE = "min-w-10";

function RuleToken({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-flex h-11 shrink-0 items-center whitespace-nowrap rounded-full border border-border-soft px-4 text-base text-muted-foreground">
      {children}
    </span>
  );
}

export function GateTreeBuilder({ capabilitySource, className, onChange, showHeader = true, value }: GateTreeBuilderProps) {
  const { locale } = useUiLocale();
  const copy = getLocaleMessages(locale, "gates").treeBuilder;
  const policy = serializeGateBuilderTreeDraft(value);
  const budget = getGateBuilderBudget(value);
  const captchaOnly = captchaAloneAdmits(policy);
  const shouldShowComplexityWarning = budget.atoms >= Math.ceil(GATE_POLICY_MAX_ATOMS * 0.8)
    || budget.depth >= Math.ceil(GATE_POLICY_MAX_DEPTH * 0.8);
  const addRuleDisabled = budget.atoms >= GATE_POLICY_MAX_ATOMS;
  const addGroupDisabled = addRuleDisabled || budget.depth >= GATE_POLICY_MAX_DEPTH;
  const applyValidChange = (nextValue: GateBuilderGroupDraft) => {
    if (isGateBuilderDraftWithinLimits(nextValue)) {
      onChange(nextValue);
    }
  };

  return (
    <section className={cn("mx-auto flex w-full max-w-6xl flex-col gap-4 p-4 text-foreground md:p-6", className)}>
      {showHeader ? (
        <h1 className="text-3xl font-semibold tracking-normal">{copy.title}</h1>
      ) : null}

      <div className="rounded-[var(--radius-lg)] border border-border bg-card p-4">
        <div className="mb-2 text-base font-semibold uppercase tracking-wide text-muted-foreground">{copy.liveSummaryTitle}</div>
        {policy ? (
          <GateSummaryTree copy={copy} expression={policy.expression as GateExpression} isRoot />
        ) : (
          <p className="text-base leading-7 text-muted-foreground">{copy.emptySummary}</p>
        )}
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

      <GateGroupEditor addGroupDisabled={addGroupDisabled} addRuleDisabled={addRuleDisabled} capabilitySource={capabilitySource} copy={copy} group={value} isRoot onChange={applyValidChange} />

    </section>
  );
}

/**
 * Renders the expression as an indented ALL-of / ANY-of checklist.
 *
 * A flat sentence ("a and (b or c or d)") collapses the tree into parentheses and stops being
 * readable past one level of nesting.
 */
function GateSummaryTree({ copy, expression, isRoot = false }: {
  copy: TreeBuilderCopy;
  expression: GateExpression;
  isRoot?: boolean;
}) {
  const node = expression as { children?: GateExpression[]; gate?: GateAtom; op: string };

  if (node.op === "gate" && node.gate) {
    return <span className="text-base leading-7">{describeGate(node.gate)}</span>;
  }

  const children = node.children ?? [];
  const groupLabel = node.op === "or" ? copy.summaryAnyOf : copy.summaryAllOf;

  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-baseline gap-2 text-base">
        {isRoot ? <span className="text-muted-foreground">{copy.summaryIntro}</span> : null}
        <span className="font-semibold uppercase tracking-wide text-foreground">{groupLabel}</span>
      </div>
      <ul className="flex list-none flex-col gap-1 border-s border-border-soft ps-4">
        {children.map((child, index) => (
          <li className="text-base leading-7" key={index}>
            <GateSummaryTree copy={copy} expression={child} />
          </li>
        ))}
      </ul>
    </div>
  );
}

function GateGroupEditor({
  addGroupDisabled,
  addRuleDisabled,
  capabilitySource,
  copy,
  group,
  isRoot = false,
  onChange,
  onRemove,
}: {
  addGroupDisabled: boolean;
  addRuleDisabled: boolean;
  capabilitySource?: CollectionCapabilitySource;
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
        <Button disabled={addRuleDisabled} title={addRuleDisabled ? copy.limitReached : undefined} variant="secondary" leadingIcon={<Plus size={16} />} onClick={() => onChange({ ...group, children: [...group.children, defaultRule()] })}>
          {copy.actions.rule}
        </Button>
        <Button disabled={addGroupDisabled} title={addGroupDisabled ? copy.limitReached : undefined} variant="outline" leadingIcon={<Plus size={16} />} onClick={() => onChange({ ...group, children: [...group.children, { kind: "group", op: "and", children: [defaultRule()] }] })}>
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
            capabilitySource={capabilitySource}
            copy={copy}
            group={child}
            key={index}
            onChange={(updated) => updateChild(index, updated)}
            onRemove={() => removeChild(index)}
          />
        ) : (
          <GateRuleRow
            capabilitySource={capabilitySource}
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

function GateRuleRow({ capabilitySource, copy, onChange, onRemove, rule }: {
  capabilitySource?: CollectionCapabilitySource;
  copy: ReturnType<typeof getLocaleMessages<"gates">>["treeBuilder"];
  onChange: (value: GateBuilderRuleDraft) => void;
  onRemove: () => void;
  rule: GateBuilderRuleDraft;
}) {
  const kind = getRuleKind(rule.gate);
  const operator = operatorLabel(copy, rule.gate);
  const hasOperator = operator != null;
  // Computed before the read-only branches: any rule that blocks saving must say why, including
  // a Courtyard rule rendered read-only because no capability source is wired.
  const ruleError = validateGateAtom(rule.gate);
  const errorLine = ruleError ? (
    <p className="text-base text-destructive" role="alert">{ruleError}</p>
  ) : null;
  const invalidCard = ruleError ? "border-destructive/50" : undefined;

  if (isCourtyardInventoryMatchGate(rule.gate) && !capabilitySource) {
    return (
      <div className={cn(RULE_CARD, "flex flex-col gap-1", invalidCard)}>
        <div className="flex flex-wrap items-center gap-2">
          <div className={cn(RULE_KIND_COL, "min-w-0")}>
            <div className="text-base font-medium">Courtyard collectible</div>
            <div className="truncate text-base text-muted-foreground">{courtyardInventorySummary(rule.gate)}</div>
          </div>
          <div className="flex min-w-0 flex-1 flex-wrap gap-2">
            {courtyardInventoryFacetChips(rule.gate).map((chip) => (
              <span
                className="inline-flex h-8 items-center rounded-full border border-border-soft bg-muted/40 px-3 text-base text-foreground"
                key={chip}
              >
                {chip}
              </span>
            ))}
          </div>
          <Button aria-label={copy.actions.removeRequirement} className="ms-auto shrink-0" size="icon" variant="ghost" onClick={onRemove}>
            <X size={18} />
          </Button>
        </div>
        {errorLine}
      </div>
    );
  }

  if (kind === "unknown") {
    /**
     * "Unknown" means unknown to this build, not invalid: the API may be ahead of the client.
     * These are preserved and passed back untouched, so they stay read-only but savable.
     */
    return (
      <div className={cn(RULE_CARD, "flex items-center gap-2 px-3")}>
        <div className="min-w-0 flex-1">
          <div className="text-base font-medium">{copy.unknownRequirementTitle}</div>
          <div className="truncate text-base text-muted-foreground">
            {interpolateMessage(copy.unknownRequirementDescription, { gate: JSON.stringify(rule.gate) })}
          </div>
        </div>
        <Button aria-label={copy.actions.removeRequirement} className="shrink-0" size="icon" variant="ghost" onClick={onRemove}>
          <X size={18} />
        </Button>
      </div>
    );
  }

  const removeButton = (
    <Button aria-label={copy.actions.removeRequirement} className="ms-auto shrink-0 md:ms-0" size="icon" variant="ghost" onClick={onRemove}>
      <X size={18} />
    </Button>
  );

  if (kind === "erc721_holding") {
    return (
      <div className={cn(RULE_CARD, "flex flex-col gap-1", invalidCard)}>
        <NftHoldingEditor
          actions={removeButton}
          capabilitySource={capabilitySource}
          copy={copy}
          gate={rule.gate}
          kindSelect={<RuleKindSelect copy={copy} value={kind} onChange={(nextKind) => onChange({ ...rule, gate: defaultGateForKind(nextKind) })} />}
          operator={operator ?? copy.operators.holdsOneFrom}
          onChange={(gate) => onChange({ ...rule, gate })}
        />
        {errorLine}
      </div>
    );
  }

  return (
    <div className={cn(RULE_CARD, "flex flex-col gap-1", invalidCard)}>
      <div className={cn(RULE_LINE, "gap-2")}>
        <div className={RULE_KIND_COL}>
          <RuleKindSelect copy={copy} value={kind} onChange={(nextKind) => onChange({ ...rule, gate: defaultGateForKind(nextKind) })} />
        </div>
        {hasOperator ? <RuleToken>{operator}</RuleToken> : null}
        <div className="min-w-0 flex-1">
          <RuleValueEditor capabilitySource={capabilitySource} copy={copy} gate={rule.gate} onChange={(gate) => onChange({ ...rule, gate })} />
        </div>
        {removeButton}
      </div>
      {errorLine}
    </div>
  );
}

function RuleValueEditor({ capabilitySource, copy, gate, onChange }: {
  capabilitySource?: CollectionCapabilitySource;
  copy: ReturnType<typeof getLocaleMessages<"gates">>["treeBuilder"];
  gate: GateAtom;
  onChange: (gate: GateAtom) => void;
}) {
  switch (gate.type) {
    case "unique_human":
      return (
        <div className="flex flex-wrap gap-2" aria-label={copy.inputs.humanVerificationProvider}>
          <Chip
            aria-pressed={gate.provider === "self"}
            className="h-11 px-4"
            variant={gate.provider === "self" ? "active" : "outline"}
            onClick={() => onChange({ type: "unique_human", provider: "self" })}
          >
            {copy.providers.self}
          </Chip>
          <Chip
            aria-pressed={gate.provider === "very"}
            className="h-11 px-4"
            variant={gate.provider === "very" ? "active" : "outline"}
            onClick={() => onChange({ type: "unique_human", provider: "very" })}
          >
            {copy.providers.very}
          </Chip>
        </div>
      );
    case "wallet_score":
      return (
        <Input
          aria-label={copy.inputs.minimumPassportScore}
          className="max-w-40"
          min={PASSPORT_SCORE_FLOOR}
          max={100}
          onChange={(event) => onChange({
            type: "wallet_score",
            provider: "passport",
            minimum_score: normalizePassportMinimumScore(Number.parseInt(event.currentTarget.value || String(PASSPORT_SCORE_FLOOR), 10)),
          })}
          type="number"
          value={normalizePassportMinimumScore(gate.minimum_score ?? PASSPORT_SCORE_FLOOR)}
        />
      );
    case "gender":
      return (
        <Select
          value={gate.allowed?.[0] ?? "F"}
          onValueChange={(value) => onChange({
            type: "gender",
            provider: "self",
            accepted_providers: ["self", "zkpassport"],
            allowed: [value],
          })}
        >
          <SelectTrigger aria-label={copy.inputs.documentSexMarker} className="max-w-40"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="F">F</SelectItem>
            <SelectItem value="M">M</SelectItem>
          </SelectContent>
        </Select>
      );
    case "erc721_holding":
    case "erc721_inventory_match":
      return null;
    case "minimum_age":
      return (
        <Input
          aria-label={copy.inputs.minimumAge}
          className="max-w-40"
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

function NftHoldingEditor({
  actions,
  capabilitySource,
  copy,
  gate,
  kindSelect,
  operator,
  onChange,
}: {
  actions: React.ReactNode;
  capabilitySource?: CollectionCapabilitySource;
  copy: ReturnType<typeof getLocaleMessages<"gates">>["treeBuilder"];
  gate: GateAtom;
  kindSelect: React.ReactNode;
  operator: string;
  onChange: (gate: GateAtom) => void;
}) {
  const [sources, setSources] = React.useState<AssetSourceDescriptor[]>([]);
  const [pendingFacetKeys, setPendingFacetKeys] = React.useState<string[]>([]);

  React.useEffect(() => {
    if (!capabilitySource) {
      setSources([]);
      return;
    }
    let cancelled = false;
    void capabilitySource.listTrustedSources().then((trustedSources) => {
      if (!cancelled) {
        setSources(trustedSources);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [capabilitySource]);

  const match = isInventoryMatchGate(gate) ? normalizeStringMatch(gate.match) : {};
  const selectedSource = sources.find((source) => sourceMatchesGate(source, gate, match));
  const traitKeys = selectedSource?.traitFiltersSupported
    ? Array.from(new Set([
      ...Object.keys(match).filter((key) => !(key in (selectedSource.fixedMatch ?? {}))),
      ...pendingFacetKeys,
    ]))
    : [];

  if (!capabilitySource) {
    return (
      <div className={cn(RULE_LINE, "gap-2")}>
        <div className={RULE_KIND_COL}>{kindSelect}</div>
        <RuleToken>{operator}</RuleToken>
        <div className="min-w-0 flex-1">
          <Input
            aria-label={copy.inputs.nftContractAddress}
            onChange={(event) => onChange({ type: "erc721_holding", chain_namespace: "eip155:1", contract_address: event.currentTarget.value })}
            value={getGateContractAddress(gate)}
          />
        </div>
        {actions}
      </div>
    );
  }

  const selectSource = (sourceId: string) => {
    const source = sources.find((candidate) => candidate.id === sourceId);
    if (!source) return;
    if (source.inventoryProvider) {
      onChange({
        type: "erc721_inventory_match",
        provider: source.inventoryProvider,
        chain_namespace: source.chainNamespace,
        contract_address: source.contractAddress,
        min_quantity: 1,
        match: { ...source.fixedMatch },
      } as GateAtom);
      return;
    }
    onChange({
      type: "erc721_holding",
      chain_namespace: source.chainNamespace,
      contract_address: source.contractAddress,
    });
  };

  const pasteAddress = (contractAddress: string) => {
    onChange({ type: "erc721_holding", chain_namespace: "eip155:1", contract_address: contractAddress });
  };

  const updateFacet = (facetKey: string, value: string) => {
    if (!selectedSource?.inventoryProvider) return;
    setPendingFacetKeys((current) => current.filter((key) => key !== facetKey));
    onChange({
      type: "erc721_inventory_match",
      provider: selectedSource.inventoryProvider,
      chain_namespace: selectedSource.chainNamespace,
      contract_address: selectedSource.contractAddress,
      min_quantity: isInventoryMatchGate(gate) ? gate.min_quantity ?? 1 : 1,
      match: { ...selectedSource.fixedMatch, ...match, [facetKey]: value },
    } as GateAtom);
  };

  const removeFacet = (facetKey: string) => {
    if (!selectedSource) return;
    setPendingFacetKeys((current) => current.filter((key) => key !== facetKey));
    const nextMatch = { ...match };
    delete nextMatch[facetKey];
    for (const fixedKey of Object.keys(selectedSource.fixedMatch ?? {})) {
      nextMatch[fixedKey] = selectedSource.fixedMatch![fixedKey]!;
    }
    const editableKeys = Object.keys(nextMatch).filter((key) => !(key in (selectedSource.fixedMatch ?? {})));
    if (editableKeys.length === 0) {
      if (selectedSource.inventoryProvider) {
        onChange({
          type: "erc721_inventory_match",
          provider: selectedSource.inventoryProvider,
          chain_namespace: selectedSource.chainNamespace,
          contract_address: selectedSource.contractAddress,
          min_quantity: isInventoryMatchGate(gate) ? gate.min_quantity ?? 1 : 1,
          match: { ...selectedSource.fixedMatch },
        } as GateAtom);
        return;
      }
      onChange({
        type: "erc721_holding",
        chain_namespace: selectedSource.chainNamespace,
        contract_address: selectedSource.contractAddress,
      });
      return;
    }
    onChange({
      type: "erc721_inventory_match",
      provider: selectedSource.inventoryProvider ?? "courtyard",
      chain_namespace: selectedSource.chainNamespace,
      contract_address: selectedSource.contractAddress,
      min_quantity: isInventoryMatchGate(gate) ? gate.min_quantity ?? 1 : 1,
      match: nextMatch,
    } as GateAtom);
  };

  const replaceFacet = (facetKey: string, nextKey: string) => {
    if (!selectedSource?.inventoryProvider || facetKey === nextKey) return;
    const nextMatch = replaceEditableFacet(match, selectedSource.fixedMatch, facetKey, nextKey);
    setPendingFacetKeys((current) => current.filter((key) => key !== facetKey && key !== nextKey));
    onChange({
      type: "erc721_inventory_match",
      provider: selectedSource.inventoryProvider,
      chain_namespace: selectedSource.chainNamespace,
      contract_address: selectedSource.contractAddress,
      min_quantity: isInventoryMatchGate(gate) ? gate.min_quantity ?? 1 : 1,
      match: nextMatch,
    } as GateAtom);
  };

  const addableFacetKeys = selectedSource?.traitFiltersSupported
    ? selectedSource.facetKeys.filter((key) => !(key in match) && !(key in (selectedSource.fixedMatch ?? {})) && !pendingFacetKeys.includes(key))
    : [];
  const currentQuantity = isInventoryMatchGate(gate) ? gate.min_quantity ?? 1 : 1;
  const quantitySupported = selectedSource?.minQuantitySupported === true && isInventoryMatchGate(gate);
  const updateQuantity = (quantity: number) => {
    if (!selectedSource?.inventoryProvider || !isInventoryMatchGate(gate)) return;
    onChange({
      ...gate,
      min_quantity: Math.min(100, Math.max(1, quantity)),
    } as GateAtom);
  };

  return (
    <div className="flex flex-col gap-2">
      <div className={cn(RULE_LINE, "gap-2")}>
        <div className={RULE_KIND_COL}>{kindSelect}</div>
        <RuleToken>{copy.operators.holds}</RuleToken>
        <Input
          aria-label={copy.inputs.minimumNftQuantity}
          className="w-20 shrink-0"
          disabled={!quantitySupported}
          max={100}
          min={1}
          onChange={(event) => updateQuantity(Number.parseInt(event.currentTarget.value || "1", 10))}
          title={quantitySupported ? undefined : copy.nftQuantityLocked}
          type="number"
          value={currentQuantity}
        />
        <RuleToken>{copy.operators.from}</RuleToken>
        <div className="min-w-0 flex-1">
          <Combobox<AssetSourceDescriptor, true>
            multiple
            autoHighlight
            items={sources}
            itemToStringLabel={(source) => source.label}
            itemToStringValue={(source) => source.label}
            onValueChange={(nextSources) => {
              const source = nextSources.slice(-1)[0];
              if (source) {
                selectSource(source.id);
              } else {
                pasteAddress(DEFAULT_CONTRACT);
              }
            }}
            value={selectedSource ? [selectedSource] : []}
          >
            <ComboboxChips className={CHIPS_BOX}>
              <ComboboxValue>
                {(selectedSources) => (
                  <>
                    {selectedSources.map((source: AssetSourceDescriptor) => (
                      <ComboboxChip className={CHIPS_CHIP} key={source.id}>{source.label}</ComboboxChip>
                    ))}
                    <ComboboxChipsInput
                      aria-label="Search collections or paste address"
                      className={selectedSources.length > 0 ? CHIPS_INPUT_WITH_VALUE : undefined}
                      placeholder={selectedSources.length > 0 ? "" : "Search collections or paste address"}
                    />
                  </>
                )}
              </ComboboxValue>
            </ComboboxChips>
            <ComboboxContent>
              <ComboboxEmpty>No trusted source found. Paste a contract address below.</ComboboxEmpty>
              <ComboboxList>
                {(source) => (
                  <ComboboxItem key={source.id} value={source}>
                    <span className="text-base font-medium">{source.label}</span>
                  </ComboboxItem>
                )}
              </ComboboxList>
            </ComboboxContent>
          </Combobox>
        </div>
        {actions}
      </div>

      {!selectedSource ? (
        <Input
          aria-label={copy.inputs.nftContractAddress}
          onChange={(event) => pasteAddress(event.currentTarget.value)}
          value={getGateContractAddress(gate)}
        />
      ) : null}

      {selectedSource?.traitFiltersSupported ? (
        <div className="flex flex-col gap-2 rounded-[var(--radius-md)] border border-border-soft bg-muted/20 p-2">
          {traitKeys.map((facetKey) => (
            <div className={cn(RULE_LINE, "gap-2")} key={facetKey}>
              <div className={FACET_KEY_COL}>
                <Select value={facetKey} onValueChange={(nextKey) => replaceFacet(facetKey, nextKey)}>
                  <SelectTrigger aria-label="Attribute" className="w-full"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {selectedSource.facetKeys.filter((key) => key === facetKey || (!(key in match) && !(key in (selectedSource.fixedMatch ?? {})))).map((key) => (
                      <SelectItem key={key} value={key}>{formatSourceFacetKey(selectedSource, key)}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <RuleToken>
                {selectedSource.maxValuesPerFacet > 1 ? copy.operators.isOneOf : copy.operators.is}
              </RuleToken>
              <div className="min-w-0 flex-1">
                <FacetValuePicker
                  capabilitySource={capabilitySource}
                  facetKey={facetKey}
                  facetLabel={formatSourceFacetKey(selectedSource, facetKey)}
                  maxValues={selectedSource.maxValuesPerFacet}
                  onChange={(value) => updateFacet(facetKey, value)}
                  source={selectedSource}
                  value={match[facetKey] ? [{ value: match[facetKey]! }] : []}
                />
              </div>
              <Button aria-label="Remove attribute filter" className="ms-auto shrink-0 md:ms-0" size="icon" variant="ghost" onClick={() => removeFacet(facetKey)}>
                <X size={18} />
              </Button>
            </div>
          ))}
          {addableFacetKeys.length > 0 ? (
            <Button
              className="self-start"
              size="sm"
              variant="outline"
              leadingIcon={<Plus size={16} />}
              onClick={() => setPendingFacetKeys((current) => [...current, addableFacetKeys[0]!])}
            >
              Add attribute filter
            </Button>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

function FacetValuePicker({
  capabilitySource,
  facetKey,
  facetLabel,
  maxValues,
  onChange,
  source,
  value,
}: {
  capabilitySource: CollectionCapabilitySource;
  facetKey: string;
  facetLabel: string;
  maxValues: number;
  onChange: (value: string) => void;
  source: AssetSourceDescriptor;
  value: FacetValueSuggestion[];
}) {
  const [options, setOptions] = React.useState<FacetValueSuggestion[]>([]);
  React.useEffect(() => {
    let cancelled = false;
    void capabilitySource.searchFacetValues(source.id, facetKey, "").then((suggestions) => {
      if (!cancelled) {
        setOptions(suggestions);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [capabilitySource, facetKey, source.id]);

  return (
    <Combobox<FacetValueSuggestion, true>
      multiple
      autoHighlight
      items={options}
      itemToStringLabel={(option) => option.value}
      itemToStringValue={(option) => option.value}
      onValueChange={(nextValue) => {
        const selected = nextValue.slice(-Math.max(1, maxValues))[0];
        onChange(selected?.value ?? "");
      }}
      value={value.filter((option) => option.value.length > 0)}
    >
      <ComboboxChips className={CHIPS_BOX}>
        <ComboboxValue>
          {(selectedOptions) => (
            <>
              {selectedOptions.map((option: FacetValueSuggestion) => (
                <ComboboxChip className={CHIPS_CHIP} key={option.value}>{option.value}</ComboboxChip>
              ))}
              <ComboboxChipsInput
                aria-label={`Search ${facetLabel}`}
                className={selectedOptions.length > 0 ? CHIPS_INPUT_WITH_VALUE : undefined}
                placeholder={selectedOptions.length > 0 ? "" : `Search ${facetLabel.toLowerCase()}`}
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
                {option.approximateCount != null ? (
                  <span className="text-base text-muted-foreground">{option.approximateCount.toLocaleString("en-US")} matches</span>
                ) : null}
              </div>
            </ComboboxItem>
          )}
        </ComboboxList>
      </ComboboxContent>
    </Combobox>
  );
}

function sourceMatchesGate(source: AssetSourceDescriptor, gate: GateAtom, match: Record<string, string>) {
  if (
    source.chainNamespace !== getGateChainNamespace(gate)
    || source.contractAddress.toLowerCase() !== getGateContractAddress(gate).toLowerCase()
  ) {
    return false;
  }
  if (!source.inventoryProvider) {
    return !isInventoryMatchGate(gate);
  }
  if (!isInventoryMatchGate(gate)) {
    return false;
  }
  return Object.entries(source.fixedMatch ?? {}).every(([key, value]) => match[key] === value);
}

function formatSourceFacetKey(source: AssetSourceDescriptor, key: string) {
  return source.facetLabels?.[key] ?? formatFacetKey(key);
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
        <SelectItem value="gender">{copy.requirementTypes.documentSexMarker}</SelectItem>
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
    case "gender":
      return { type: "gender", provider: "self", accepted_providers: ["self", "zkpassport"], allowed: ["F"] };
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
    case "erc721_inventory_match":
      return "erc721_holding";
    case "altcha_pow":
    case "erc721_holding":
    case "gender":
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
    case "erc721_inventory_match":
      return copy.operators.holdsOneFrom;
    case "nationality":
      return copy.operators.isOneOf;
    case "gender":
      return copy.operators.is;
    case "minimum_age":
      return copy.operators.atLeast;
    default:
      return copy.operators.matches;
  }
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
      return `hold at least ${gateAssetMinimum(gate)} NFT${gateAssetMinimum(gate) === 1 ? "" : "s"} from ${shortAddress(gate.contract_address ?? "")}`;
    case "nationality":
      return gate.allowed?.length
        ? `prove nationality ${gate.allowed.join("/")}`
        : "prove any verified nationality";
    case "gender":
      return `match document sex marker ${gate.allowed?.[0] ?? "(choose marker)"}`;
    case "minimum_age":
      return `prove age at least ${gate.minimum_age ?? 18}`;
    case "erc721_inventory_match":
      return `hold ${courtyardInventorySummary(gate)}`;
    default:
      return "satisfy an unrecognized requirement";
  }
}

function shortAddress(value: string): string {
  return value.length > 12 ? `${value.slice(0, 6)}...${value.slice(-4)}` : value || "(contract)";
}

function isCourtyardInventoryMatchGate(gate: GateAtom): gate is GateAtom & {
  match?: Record<string, unknown>;
  min_quantity?: number;
  provider?: string;
} {
  return gate.type === "erc721_inventory_match";
}

function isInventoryMatchGate(gate: GateAtom): gate is GateAtom & {
  chain_namespace?: string;
  contract_address?: string;
  match?: Record<string, unknown>;
  min_quantity?: number;
  provider?: string;
} {
  return gate.type === "erc721_inventory_match";
}

function getGateChainNamespace(gate: GateAtom): string {
  if ("chain_namespace" in gate && typeof gate.chain_namespace === "string") {
    return gate.chain_namespace;
  }
  return "eip155:1";
}

function getGateContractAddress(gate: GateAtom): string {
  if ("contract_address" in gate && typeof gate.contract_address === "string") {
    return gate.contract_address;
  }
  return "";
}

function normalizeStringMatch(match: Record<string, unknown> | undefined): Record<string, string> {
  return Object.fromEntries(
    Object.entries(match ?? {})
      .flatMap(([key, value]) => {
        const stringValue = stringifyFacetValue(value);
        return stringValue == null || stringValue.trim().length === 0 ? [] : [[key, stringValue]];
      }),
  );
}

function courtyardInventorySummary(gate: GateAtom & { match?: Record<string, unknown>; min_quantity?: number }): string {
  const match = gate.match ?? {};
  const subject = stringifyFacetValue(match.subject);
  const model = stringifyFacetValue(match.model);
  const brand = stringifyFacetValue(match.brand);
  const fallback = stringifyFacetValue(match.category) ?? "collectible";
  const brandModel = [brand, model].filter(Boolean).join(" ");
  const assetName = subject ?? (brandModel || fallback);
  const quantity = gate.min_quantity && gate.min_quantity > 1 ? `${gate.min_quantity}x ` : "";
  return `${quantity}${assetName}`;
}

function courtyardInventoryFacetChips(gate: GateAtom & { match?: Record<string, unknown> }): string[] {
  return Object.entries(gate.match ?? {})
    .filter(([, value]) => value != null && String(value).trim().length > 0)
    .map(([key, value]) => `${formatFacetKey(key)}: ${stringifyFacetValue(value) ?? String(value)}`);
}

function formatFacetKey(key: string): string {
  return key
    .split(/[_-]/u)
    .filter(Boolean)
    .map((part) => `${part.slice(0, 1).toUpperCase()}${part.slice(1)}`)
    .join(" ");
}

function stringifyFacetValue(value: unknown): string | null {
  if (Array.isArray(value)) {
    return value.map(stringifyFacetValue).filter((part): part is string => part != null).join(", ") || null;
  }
  if (typeof value === "string") {
    return value;
  }
  if (typeof value === "number" || typeof value === "boolean") {
    return String(value);
  }
  return null;
}
