"use client";

import * as React from "react";
import type { GateAtom } from "@pirate/api-contracts";
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
  withGateAssetMinimum,
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
import type { GateAtomValidationError } from "@/lib/gate-atom-validation";
import { normalizeInventoryText } from "@/lib/gate-inventory-validation";
import { interpolateMessage } from "@/lib/route-messages";
import { useUiLocale } from "@/lib/ui-locale";
import { cn } from "@/lib/utils";
import { formatAssetAmount, parseAssetAmount } from "@/lib/asset-amount";
import { getLocaleMessages } from "@/locales";
import type {
  AssetSourceDescriptor,
  CollectionCapabilitySource,
  FacetValueSuggestion,
  InventoryFacetMatch,
  InventoryFacetValue,
} from "./collection-capability-source";
import { replaceEditableFacet } from "./collection-capability-source";
import type { GateCapabilitySources } from "./gate-capability-sources";
import type { AssetCapabilityDescriptor, AssetCapabilitySource } from "./asset-capability-source";

export type GateTreeBuilderProps = {
  capabilities?: GateCapabilitySources;
  className?: string;
  /**
   * When true (per-name claim rules), facet value pickers offer a "claimed name"
   * binding that serializes as the literal {label} placeholder, resolved by the
   * API against the name being claimed.
   */
  labelBindingEnabled?: boolean;
  onChange: (value: GateBuilderGroupDraft) => void;
  showHeader?: boolean;
  value: GateBuilderGroupDraft;
};

const GATE_LABEL_BINDING_PLACEHOLDER = "{label}";

const LabelBindingContext = React.createContext(false);

type TreeBuilderCopy = ReturnType<typeof getLocaleMessages<"gates">>["treeBuilder"];

function validationMessage(copy: TreeBuilderCopy, error: GateAtomValidationError): string {
  return interpolateMessage(copy.validation[error.code], error.params ?? {});
}

type RuleKind =
  | "altcha_pow"
  | "asset_balance"
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

export function GateTreeBuilder({ capabilities, className, labelBindingEnabled = false, onChange, showHeader = true, value }: GateTreeBuilderProps) {
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

      <LabelBindingContext.Provider value={labelBindingEnabled}>
        <GateGroupEditor addGroupDisabled={addGroupDisabled} addRuleDisabled={addRuleDisabled} capabilities={capabilities} copy={copy} group={value} isRoot onChange={applyValidChange} />
      </LabelBindingContext.Provider>

    </section>
  );
}

function GateGroupEditor({
  addGroupDisabled,
  addRuleDisabled,
  capabilities,
  copy,
  group,
  isRoot = false,
  onChange,
  onRemove,
}: {
  addGroupDisabled: boolean;
  addRuleDisabled: boolean;
  capabilities?: GateCapabilitySources;
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
            capabilities={capabilities}
            copy={copy}
            group={child}
            key={index}
            onChange={(updated) => updateChild(index, updated)}
            onRemove={() => removeChild(index)}
          />
        ) : (
          <GateRuleRow
            capabilities={capabilities}
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

function GateRuleRow({ capabilities, copy, onChange, onRemove, rule }: {
  capabilities?: GateCapabilitySources;
  copy: ReturnType<typeof getLocaleMessages<"gates">>["treeBuilder"];
  onChange: (value: GateBuilderRuleDraft) => void;
  onRemove: () => void;
  rule: GateBuilderRuleDraft;
}) {
  const capabilitySource = capabilities?.collections;
  const kind = getRuleKind(rule.gate);
  const operator = operatorLabel(copy, rule.gate);
  const hasOperator = operator != null;
  // Computed before the read-only branches: any rule that blocks saving must say why, including
  // a Courtyard rule rendered read-only because no capability source is wired.
  const ruleError = validateGateAtom(rule.gate);
  const errorLine = ruleError ? (
    <p className="text-base text-destructive" role="alert">{validationMessage(copy, ruleError)}</p>
  ) : null;
  const invalidCard = ruleError ? "border-destructive/50" : undefined;

  if (isCourtyardInventoryMatchGate(rule.gate) && !capabilitySource) {
    return (
      <div className={cn(RULE_CARD, "flex flex-col gap-1", invalidCard)}>
        <div className="flex flex-wrap items-center gap-2">
          <div className={cn(RULE_KIND_COL, "min-w-0")}>
            <div className="text-base font-medium">{copy.sources.courtyardCollectible}</div>
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

  if (kind === "asset_balance") {
    return (
      <AssetBalanceRuleEditor
        actions={removeButton}
        capabilitySource={capabilities?.assets}
        copy={copy}
        gate={rule.gate}
        onChange={(gate) => onChange({ ...rule, gate: preserveGateIdentity(rule.gate, gate) })}
      />
    );
  }

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
          onChange={(gate) => onChange({ ...rule, gate: preserveGateIdentity(rule.gate, gate) })}
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
          <RuleValueEditor capabilitySource={capabilitySource} copy={copy} gate={rule.gate} onChange={(gate) => onChange({ ...rule, gate: preserveGateIdentity(rule.gate, gate) })} />
        </div>
        {removeButton}
      </div>
      {errorLine}
    </div>
  );
}

function AssetBalanceRuleEditor({ actions, capabilitySource, copy, gate, onChange }: {
  actions: React.ReactNode;
  capabilitySource?: AssetCapabilitySource;
  copy: TreeBuilderCopy;
  gate: GateAtom;
  onChange: (gate: GateAtom) => void;
}) {
  const [assets, setAssets] = React.useState<AssetCapabilityDescriptor[] | null>(null);
  const [loadFailed, setLoadFailed] = React.useState(false);
  const selected = assets?.find((asset) => asset.assetId === gate.asset_id) ?? null;
  const formatted = selected && typeof gate.min_amount_atomic === "string"
    ? formatAssetAmount(gate.min_amount_atomic, selected.decimals)
    : null;
  const [amount, setAmount] = React.useState(formatted ?? "");

  React.useEffect(() => {
    let active = true;
    setAssets(null);
    setLoadFailed(false);
    if (!capabilitySource) {
      setLoadFailed(true);
      return () => { active = false; };
    }
    void capabilitySource.listAssets()
      .then((nextAssets) => {
        if (!active) return;
        setAssets(nextAssets);
      })
      .catch(() => {
        if (!active) return;
        setLoadFailed(true);
      });
    return () => { active = false; };
  }, [capabilitySource]);

  React.useEffect(() => {
    if (formatted != null) setAmount(formatted);
  }, [formatted]);

  React.useEffect(() => {
    if (!assets?.length || gate.asset_id) return;
    const first = assets[0];
    const parsed = parseAssetAmount("1", first.decimals);
    if (parsed.ok) {
      onChange({ type: "asset_balance", asset_id: first.assetId, min_amount_atomic: parsed.atomic });
    }
  }, [assets, gate.asset_id, onChange]);

  const updateAmount = (nextAmount: string, asset: AssetCapabilityDescriptor) => {
    setAmount(nextAmount);
    const parsed = parseAssetAmount(nextAmount, asset.decimals);
    onChange({
      type: "asset_balance",
      asset_id: asset.assetId,
      min_amount_atomic: parsed.ok ? parsed.atomic : "",
    });
  };

  if (loadFailed || (assets && !selected)) {
    return (
      <div className={cn(RULE_CARD, "flex items-center gap-2 px-3")}>
        <div className="min-w-0 flex-1">
          <div className="text-base font-medium">{copy.requirementTypes.assetBalance}</div>
          <div className="truncate text-base text-muted-foreground">
            {interpolateMessage(copy.assets.unavailableReadOnly, { asset: gate.asset_id ?? copy.assets.unknownAsset })}
          </div>
        </div>
        {actions}
      </div>
    );
  }

  if (!assets || !selected) {
    return (
      <div className={cn(RULE_CARD, "flex items-center gap-2 px-3 text-base text-muted-foreground")}>
        <span className="flex-1">{copy.assets.loading}</span>
        {actions}
      </div>
    );
  }

  const parsedAmount = parseAssetAmount(amount, selected.decimals);
  const amountError = parsedAmount.ok
    ? null
    : parsedAmount.error === "precision"
      ? interpolateMessage(copy.assets.precisionError, { decimals: String(selected.decimals) })
      : copy.assets.amountError;

  return (
    <div className={cn(RULE_CARD, "flex flex-col gap-1", amountError && "border-destructive/50")}>
      <div className={RULE_LINE}>
        <div className={RULE_KIND_COL}>
          <RuleKindSelect copy={copy} value="asset_balance" onChange={(nextKind) => onChange(defaultGateForKind(nextKind))} />
        </div>
        <RuleToken>{copy.operators.holdsAtLeast}</RuleToken>
        <Input
          aria-label={copy.inputs.minimumAssetBalance}
          className="max-w-48"
          inputMode="decimal"
          onInput={(event) => updateAmount(event.currentTarget.value, selected)}
          value={amount}
        />
        <Select
          value={selected.assetId}
          onValueChange={(assetId: string) => {
            const nextAsset = assets.find((asset) => asset.assetId === assetId);
            if (nextAsset) updateAmount(amount, nextAsset);
          }}
        >
          <SelectTrigger aria-label={copy.inputs.asset}><SelectValue /></SelectTrigger>
          <SelectContent>
            {assets.map((asset) => <SelectItem key={asset.assetId} value={asset.assetId}>{asset.label}</SelectItem>)}
          </SelectContent>
        </Select>
        {actions}
      </div>
      {amountError ? <p className="text-base text-destructive" role="alert">{amountError}</p> : null}
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
            aria-pressed={gate.provider === "zkpassport"}
            className="h-11 px-4"
            variant={gate.provider === "zkpassport" ? "active" : "outline"}
            onClick={() => onChange({ type: "unique_human", provider: "zkpassport" })}
          >
            {copy.providers.zkpassport}
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
    case "asset_balance":
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
  const [sourceLoadFailed, setSourceLoadFailed] = React.useState(false);
  const [pendingFacetKeys, setPendingFacetKeys] = React.useState<string[]>([]);

  React.useEffect(() => {
    if (!capabilitySource) {
      setSources([]);
      setSourceLoadFailed(false);
      return;
    }
    let cancelled = false;
    setSourceLoadFailed(false);
    void capabilitySource.listTrustedSources()
      .then((trustedSources) => {
        if (!cancelled) {
          setSources(trustedSources);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setSources([]);
          setSourceLoadFailed(true);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [capabilitySource]);

  const match = isInventoryMatchGate(gate) ? inventoryFacetMatch(gate.match) : {};
  const selectedSource = sources.find((source) => sourceMatchesGate(source, gate, match));
  const traitKeys = selectedSource?.traitFiltersSupported
    ? Array.from(new Set([
      ...Object.keys(match).filter((key) => !(key in (selectedSource.fixedMatch ?? {}))),
      ...pendingFacetKeys,
    ]))
    : [];

  // A persisted inventory atom is meaningful only through the source descriptor that owns its
  // fixed match and provider semantics. If that source is missing (including while loading or on
  // provider failure), converting edits into a plain holding atom would silently discard traits.
  if (isInventoryMatchGate(gate) && !selectedSource) {
    return (
      <div className="flex flex-col gap-2">
        <div className={cn(RULE_LINE, "gap-2")}>
          <RuleToken>{copy.requirementTypes.nftHolding}</RuleToken>
          <RuleToken>{copy.operators.holds}</RuleToken>
          <Input
            aria-label={copy.inputs.minimumNftQuantity}
            className="w-20 shrink-0"
            disabled
            value={gateAssetMinimum(gate)}
          />
          <RuleToken>{copy.operators.from}</RuleToken>
          <Input
            aria-label={copy.inputs.nftContractAddress}
            className="min-w-0 flex-1"
            disabled
            value={getGateContractAddress(gate)}
          />
          {actions}
        </div>
        <p className="text-base text-muted-foreground">{copy.unsupportedAtom}</p>
      </div>
    );
  }

  if (!capabilitySource) {
    const quantity = gateAssetMinimum(gate);
    return (
      <div className={cn(RULE_LINE, "gap-2")}>
        <div className={RULE_KIND_COL}>{kindSelect}</div>
        <RuleToken>{operator}</RuleToken>
        <Input
          aria-label={copy.inputs.minimumNftQuantity}
          className="w-20 shrink-0"
          max={100}
          min={1}
          onChange={(event) => onChange(withGateAssetMinimum({
            type: "erc721_holding",
            chain_namespace: "eip155:1",
            contract_address: getGateContractAddress(gate),
          }, Number.parseInt(event.currentTarget.value || "1", 10)))}
          type="number"
          value={quantity}
        />
        <RuleToken>{copy.operators.from}</RuleToken>
        <div className="min-w-0 flex-1">
          <Input
            aria-label={copy.inputs.nftContractAddress}
            onChange={(event) => onChange(withGateAssetMinimum({ type: "erc721_holding", chain_namespace: "eip155:1", contract_address: event.currentTarget.value }, quantity))}
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
    onChange(withGateAssetMinimum({
      type: "erc721_holding",
      chain_namespace: source.chainNamespace,
      contract_address: source.contractAddress,
    }, isInventoryMatchGate(gate) ? gate.min_quantity ?? 1 : gateAssetMinimum(gate)));
  };

  const pasteAddress = (contractAddress: string) => {
    onChange(withGateAssetMinimum({
      type: "erc721_holding",
      chain_namespace: "eip155:1",
      contract_address: contractAddress,
    }, gateAssetMinimum(gate)));
  };

  const updateFacet = (facetKey: string, values: string[]) => {
    if (!selectedSource?.inventoryProvider) return;
    setPendingFacetKeys((current) => current.filter((key) => key !== facetKey));
    const nextMatch = { ...selectedSource.fixedMatch, ...match };
    const value = serializeFacetSelection(values, selectedSource.maxValuesPerFacet);
    if (value == null) {
      delete nextMatch[facetKey];
    } else {
      nextMatch[facetKey] = value;
    }
    onChange({
      type: "erc721_inventory_match",
      provider: selectedSource.inventoryProvider,
      chain_namespace: selectedSource.chainNamespace,
      contract_address: selectedSource.contractAddress,
      min_quantity: isInventoryMatchGate(gate) ? gate.min_quantity ?? 1 : 1,
      match: nextMatch,
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
      onChange(withGateAssetMinimum({
        type: "erc721_holding",
        chain_namespace: selectedSource.chainNamespace,
        contract_address: selectedSource.contractAddress,
      }, gateAssetMinimum(gate)));
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
  const currentQuantity = gateAssetMinimum(gate);
  const quantitySupported = gate.type === "erc721_holding"
    || (selectedSource?.minQuantitySupported === true && isInventoryMatchGate(gate));
  const updateQuantity = (quantity: number) => {
    const nextQuantity = Math.min(100, Math.max(1, quantity));
    if (gate.type === "erc721_holding") {
      onChange(withGateAssetMinimum(gate, nextQuantity));
    } else if (selectedSource?.inventoryProvider && isInventoryMatchGate(gate)) {
      onChange({ ...gate, min_quantity: nextQuantity } as GateAtom);
    }
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
                      aria-label={copy.sources.searchCollections}
                      className={selectedSources.length > 0 ? CHIPS_INPUT_WITH_VALUE : undefined}
                      placeholder={selectedSources.length > 0 ? "" : copy.sources.searchCollections}
                    />
                  </>
                )}
              </ComboboxValue>
            </ComboboxChips>
            <ComboboxContent>
              <ComboboxEmpty>{sourceLoadFailed ? copy.sources.loadError : copy.sources.empty}</ComboboxEmpty>
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

      {sourceLoadFailed ? (
        <p className="text-base text-destructive" role="alert">{copy.sources.loadError}</p>
      ) : null}

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
                  <SelectTrigger aria-label={copy.sources.attribute} className="w-full"><SelectValue /></SelectTrigger>
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
                  copy={copy}
                  maxValues={selectedSource.maxValuesPerFacet}
                  onChange={(values) => updateFacet(facetKey, values)}
                  source={selectedSource}
                  value={facetValueSuggestions(match[facetKey])}
                />
              </div>
              <Button aria-label={copy.sources.removeAttribute} className="ms-auto shrink-0 md:ms-0" size="icon" variant="ghost" onClick={() => removeFacet(facetKey)}>
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
              {copy.sources.addAttribute}
            </Button>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

function FacetValuePicker({
  capabilitySource,
  copy,
  facetKey,
  facetLabel,
  maxValues,
  onChange,
  source,
  value,
}: {
  capabilitySource: CollectionCapabilitySource;
  copy: TreeBuilderCopy;
  facetKey: string;
  facetLabel: string;
  maxValues: number;
  onChange: (values: string[]) => void;
  source: AssetSourceDescriptor;
  value: FacetValueSuggestion[];
}) {
  const labelBindingEnabled = React.useContext(LabelBindingContext);
  const [options, setOptions] = React.useState<FacetValueSuggestion[]>([]);
  const [optionsLoadFailed, setOptionsLoadFailed] = React.useState(false);
  const [optionsLoading, setOptionsLoading] = React.useState(false);
  const [query, setQuery] = React.useState("");
  const [retryAttempt, setRetryAttempt] = React.useState(0);
  const requestGenerationRef = React.useRef(0);
  const bindingLabel = copy.sources.claimedNameOption;
  const bindingSelected = value.some((option) => option.value === GATE_LABEL_BINDING_PLACEHOLDER);
  const bindingVisible = labelBindingEnabled
    && !bindingSelected
    && (query.trim().length === 0 || bindingLabel.toLowerCase().includes(query.trim().toLowerCase()));
  const visibleOptions = bindingVisible
    ? [{ value: GATE_LABEL_BINDING_PLACEHOLDER }, ...options.filter((option) => option.value !== GATE_LABEL_BINDING_PLACEHOLDER)]
    : options;
  React.useEffect(() => {
    const generation = ++requestGenerationRef.current;
    let cancelled = false;
    const timeoutId = globalThis.setTimeout(() => {
      setOptionsLoadFailed(false);
      setOptionsLoading(true);
      void capabilitySource.searchFacetValues(source.id, facetKey, query)
        .then((suggestions) => {
          if (!cancelled && requestGenerationRef.current === generation) {
            setOptions(suggestions);
          }
        })
        .catch(() => {
          if (!cancelled && requestGenerationRef.current === generation) {
            setOptions([]);
            setOptionsLoadFailed(true);
          }
        })
        .finally(() => {
          if (!cancelled && requestGenerationRef.current === generation) {
            setOptionsLoading(false);
          }
        });
    }, query ? 250 : 0);
    return () => {
      cancelled = true;
      globalThis.clearTimeout(timeoutId);
    };
  }, [capabilitySource, facetKey, query, retryAttempt, source.id]);

  return (
    <Combobox<FacetValueSuggestion, true>
      multiple
      autoHighlight
      items={visibleOptions}
      itemToStringLabel={(option) => option.value === GATE_LABEL_BINDING_PLACEHOLDER ? bindingLabel : option.value}
      itemToStringValue={(option) => option.value}
      onInputValueChange={setQuery}
      onValueChange={(nextValue) => {
        onChange(nextValue.slice(0, facetSelectionLimit(maxValues)).map((option) => option.value));
      }}
      value={value.filter((option) => option.value.length > 0)}
    >
      <ComboboxChips className={CHIPS_BOX}>
        <ComboboxValue>
          {(selectedOptions) => (
            <>
              {selectedOptions.map((option: FacetValueSuggestion) => (
                <ComboboxChip className={CHIPS_CHIP} key={option.value}>
                  {option.value === GATE_LABEL_BINDING_PLACEHOLDER ? bindingLabel : option.value}
                </ComboboxChip>
              ))}
              <ComboboxChipsInput
                aria-label={interpolateMessage(copy.sources.searchFacet, { facet: facetLabel })}
                className={selectedOptions.length > 0 ? CHIPS_INPUT_WITH_VALUE : undefined}
                placeholder={selectedOptions.length > 0 ? "" : interpolateMessage(copy.sources.searchFacet, { facet: facetLabel })}
              />
            </>
          )}
        </ComboboxValue>
      </ComboboxChips>
      <ComboboxContent>
        <ComboboxEmpty>
          {optionsLoadFailed ? (
            <span className="flex items-center justify-between gap-3">
              <span>{copy.sources.facetLoadError}</span>
              <Button size="sm" variant="ghost" onClick={() => setRetryAttempt((attempt) => attempt + 1)}>
                {copy.sources.retry}
              </Button>
            </span>
          ) : optionsLoading ? copy.sources.facetLoading : copy.sources.noValues}
        </ComboboxEmpty>
        <ComboboxList className="py-0">
          {(option) => (
            <ComboboxItem key={option.value} value={option}>
              <div className="flex w-full items-center justify-between gap-4">
                <span className="text-base font-medium">
                  {option.value === GATE_LABEL_BINDING_PLACEHOLDER ? bindingLabel : option.value}
                </span>
                {option.value === GATE_LABEL_BINDING_PLACEHOLDER ? (
                  <span className="text-base text-muted-foreground">{copy.sources.claimedNameHint}</span>
                ) : option.approximateCount != null ? (
                  <span className="text-base text-muted-foreground">
                    {interpolateMessage(copy.sources.matches, { count: option.approximateCount.toLocaleString() })}
                  </span>
                ) : null}
              </div>
            </ComboboxItem>
          )}
        </ComboboxList>
      </ComboboxContent>
    </Combobox>
  );
}

function sourceMatchesGate(source: AssetSourceDescriptor, gate: GateAtom, match: InventoryFacetMatch) {
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
  return Object.entries(source.fixedMatch ?? {}).every(([key, value]) => facetValuesEqual(match[key], value));
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
        <SelectItem value="asset_balance">{copy.requirementTypes.assetBalance}</SelectItem>
        <SelectItem value="erc721_holding">{copy.requirementTypes.nftHolding}</SelectItem>
        <SelectItem value="gender">{copy.requirementTypes.documentSexMarker}</SelectItem>
        <SelectItem value="nationality">{copy.requirementTypes.nationality}</SelectItem>
        <SelectItem value="minimum_age">{copy.requirementTypes.minimumAge}</SelectItem>
      </SelectContent>
    </Select>
  );
}

function defaultRule(): GateBuilderRuleDraft {
  return { kind: "rule", gate: { gate_id: createGateId(), type: "unique_human", provider: "self" } };
}

function defaultGateForKind(kind: RuleKind): GateAtom {
  const identity = { gate_id: createGateId() };
  switch (kind) {
    case "altcha_pow":
      return { ...identity, type: "altcha_pow" };
    case "erc721_holding":
      return { ...identity, type: "erc721_holding", chain_namespace: "eip155:1", contract_address: DEFAULT_CONTRACT };
    case "asset_balance":
      return { ...identity, type: "asset_balance", asset_id: "", min_amount_atomic: "" };
    case "minimum_age":
      return { ...identity, type: "minimum_age", provider: "self", minimum_age: 18 };
    case "gender":
      return { ...identity, type: "gender", provider: "self", accepted_providers: ["self", "zkpassport"], allowed: ["F"] };
    case "nationality":
      return { ...identity, type: "nationality", provider: "self", accepted_providers: ["self", "zkpassport"], allowed: [] };
    case "wallet_score":
      return { ...identity, type: "wallet_score", provider: "passport", minimum_score: 20 };
    case "unique_human":
    case "unknown":
    default:
      return { ...identity, type: "unique_human", provider: "self" };
  }
}

function createGateId(): string {
  return `gate_${crypto.randomUUID().replaceAll("-", "")}`;
}

function preserveGateIdentity(current: GateAtom, next: GateAtom): GateAtom {
  return current.gate_id ? { ...next, gate_id: current.gate_id } : next;
}

function getRuleKind(gate: GateAtom): RuleKind {
  switch (gate.type) {
    case "erc721_inventory_match":
      return "erc721_holding";
    case "altcha_pow":
    case "asset_balance":
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
    case "asset_balance":
      return copy.operators.holdsAtLeast;
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

function inventoryFacetMatch(match: Record<string, unknown> | undefined): InventoryFacetMatch {
  const result: InventoryFacetMatch = {};
  for (const [key, value] of Object.entries(match ?? {})) {
    if (typeof value === "string" && value.length > 0) {
      result[key] = value;
    } else if (Array.isArray(value) && value.length > 0 && value.every((item) => typeof item === "string")) {
      result[key] = [...value];
    }
  }
  return result;
}

function facetSelectionLimit(maxValues: number): number {
  return Math.min(10, Math.max(1, Math.trunc(maxValues)));
}

/**
 * Values loaded from a policy retain their scalar/array boundaries and original spelling until
 * this facet is edited. Changed selections are trimmed, NFC-normalized, and deduplicated using
 * the API's comparison normalization. A single selection stays scalar for backwards compatibility.
 */
export function serializeFacetSelection(values: string[], maxValues: number): InventoryFacetValue | null {
  const selected: string[] = [];
  const identities = new Set<string>();
  for (const rawValue of values) {
    const value = rawValue.trim().normalize("NFC");
    const identity = normalizeInventoryText(value);
    if (!identity || identities.has(identity)) continue;
    identities.add(identity);
    selected.push(value);
    if (selected.length === facetSelectionLimit(maxValues)) break;
  }
  if (selected.length === 0) return null;
  return selected.length === 1 ? selected[0]! : selected;
}

function facetValueSuggestions(value: InventoryFacetValue | undefined): FacetValueSuggestion[] {
  if (value == null) return [];
  return (Array.isArray(value) ? value : [value]).map((item) => ({ value: item }));
}

function facetValuesEqual(left: InventoryFacetValue | undefined, right: InventoryFacetValue): boolean {
  if (Array.isArray(left) || Array.isArray(right)) {
    return Array.isArray(left) && Array.isArray(right)
      && left.length === right.length
      && left.every((value, index) => value === right[index]);
  }
  return left === right;
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
