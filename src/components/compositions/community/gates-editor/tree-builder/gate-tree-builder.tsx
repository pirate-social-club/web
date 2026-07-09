"use client";

import * as React from "react";
import type { GateAtom, GateExpression, GatePolicy } from "@pirate/api-contracts";
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
import { Chip } from "@/components/primitives/chip";
import { interpolateMessage } from "@/lib/route-messages";
import { useUiLocale } from "@/lib/ui-locale";
import { cn } from "@/lib/utils";
import { getLocaleMessages } from "@/locales";
import type {
  AssetSourceDescriptor,
  CollectionCapabilitySource,
  FacetValueSuggestion,
} from "./collection-capability-source";

export type GateTreeBuilderProps = {
  capabilitySource?: CollectionCapabilitySource;
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

export function GateTreeBuilder({ capabilitySource, className, devPreview = false, onChange, value }: GateTreeBuilderProps) {
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

      <GateGroupEditor addGroupDisabled={addGroupDisabled} addRuleDisabled={addRuleDisabled} capabilitySource={capabilitySource} copy={copy} group={value} isRoot onChange={onChange} />

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

  if (isCourtyardInventoryMatchGate(rule.gate) && !capabilitySource) {
    return (
      <div className="flex flex-wrap items-center gap-3 rounded-[var(--radius-md)] border border-border-soft bg-background p-2">
        <div className="min-w-56 flex-1">
          <div className="text-base font-medium">Courtyard collectible</div>
          <div className="text-base text-muted-foreground">{courtyardInventorySummary(rule.gate)}</div>
        </div>
        <div className="flex min-w-0 flex-1 flex-wrap gap-2">
          {courtyardInventoryFacetChips(rule.gate).map((chip) => (
            <span
              className="rounded-full border border-border-soft bg-muted/40 px-3 py-1 text-base text-foreground"
              key={chip}
            >
              {chip}
            </span>
          ))}
        </div>
        <Button aria-label={copy.actions.removeRequirement} className="ms-auto" size="icon" variant="ghost" onClick={onRemove}>
          <X size={18} />
        </Button>
      </div>
    );
  }

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

  if (kind === "erc721_holding") {
    return (
      <div className="rounded-[var(--radius-md)] border border-border-soft bg-background p-2">
        <div className="grid gap-2 md:grid-cols-[minmax(220px,1.2fr)_auto_minmax(260px,2fr)_auto] md:items-center">
          <RuleKindSelect copy={copy} value={kind} onChange={(nextKind) => onChange({ ...rule, gate: defaultGateForKind(nextKind) })} />
          <span className="rounded-full border border-border-soft px-3 py-2 text-base text-muted-foreground">{operator}</span>
          <NftHoldingEditor
            capabilitySource={capabilitySource}
            copy={copy}
            gate={rule.gate}
            onChange={(gate) => onChange({ ...rule, gate })}
          />
          <Button aria-label={copy.actions.removeRequirement} size="icon" variant="ghost" onClick={onRemove}>
            <X size={18} />
          </Button>
        </div>
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
      <RuleValueEditor capabilitySource={capabilitySource} copy={copy} gate={rule.gate} onChange={(gate) => onChange({ ...rule, gate })} />
      <Button aria-label={copy.actions.removeRequirement} size="icon" variant="ghost" onClick={onRemove}>
        <X size={18} />
      </Button>
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
            variant={gate.provider === "self" ? "active" : "outline"}
            onClick={() => onChange({ type: "unique_human", provider: "self" })}
          >
            {copy.providers.self}
          </Chip>
          <Chip
            aria-pressed={gate.provider === "very"}
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
          min={0}
          max={100}
          onChange={(event) => onChange({ type: "wallet_score", provider: "passport", minimum_score: Number.parseInt(event.currentTarget.value || "0", 10) })}
          type="number"
          value={gate.minimum_score ?? 20}
        />
      );
    case "erc721_holding":
    case "erc721_inventory_match":
      return null;
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

function NftHoldingEditor({
  capabilitySource,
  copy,
  gate,
  onChange,
}: {
  capabilitySource?: CollectionCapabilitySource;
  copy: ReturnType<typeof getLocaleMessages<"gates">>["treeBuilder"];
  gate: GateAtom;
  onChange: (gate: GateAtom) => void;
}) {
  const [sources, setSources] = React.useState<AssetSourceDescriptor[]>([]);
  const [matchCount, setMatchCount] = React.useState<number | null>(null);
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

  const selectedSource = sources.find((source) =>
    source.chainNamespace === getGateChainNamespace(gate)
    && source.contractAddress.toLowerCase() === getGateContractAddress(gate).toLowerCase()
  );
  const match = isInventoryMatchGate(gate) ? normalizeStringMatch(gate.match) : {};
  const traitKeys = selectedSource?.traitFiltersSupported
    ? Array.from(new Set([
      ...Object.keys(match).filter((key) => !(key in (selectedSource.fixedMatch ?? {}))),
      ...pendingFacetKeys,
    ]))
    : [];

  React.useEffect(() => {
    if (!capabilitySource || !selectedSource || !selectedSource.traitFiltersSupported || traitKeys.length === 0) {
      setMatchCount(null);
      return;
    }
    let cancelled = false;
    void capabilitySource.estimateMatchCount(selectedSource.id, match).then((count) => {
      if (!cancelled) {
        setMatchCount(count);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [capabilitySource, match, selectedSource, traitKeys.length]);

  if (!capabilitySource) {
    return (
      <Input
        aria-label={copy.inputs.nftContractAddress}
        onChange={(event) => onChange({ type: "erc721_holding", chain_namespace: "eip155:1", contract_address: event.currentTarget.value })}
        value={getGateContractAddress(gate)}
      />
    );
  }

  const selectSource = (sourceId: string) => {
    const source = sources.find((candidate) => candidate.id === sourceId);
    if (!source) return;
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

  const addableFacetKeys = selectedSource?.traitFiltersSupported
    ? selectedSource.facetKeys.filter((key) => !(key in match) && !(key in (selectedSource.fixedMatch ?? {})) && !pendingFacetKeys.includes(key))
    : [];

  return (
    <div className="flex flex-col gap-2">
      <div>
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
          <ComboboxChips className="rounded-full">
            <ComboboxValue>
              {(selectedSources) => (
                <>
                  {selectedSources.map((source: AssetSourceDescriptor) => (
                    <ComboboxChip key={source.id}>{source.label}</ComboboxChip>
                  ))}
                  <ComboboxChipsInput aria-label="Search collections or paste address" placeholder="Search collections or paste address" />
                </>
              )}
            </ComboboxValue>
          </ComboboxChips>
          <ComboboxContent>
            <ComboboxEmpty>No trusted source found. Paste a contract address below.</ComboboxEmpty>
            <ComboboxList>
              {(source) => (
                <ComboboxItem key={source.id} value={source}>
                  <div className="flex flex-col">
                    <span className="text-base font-medium">{source.label}</span>
                    <span className="text-base text-muted-foreground">
                      {source.traitFiltersSupported ? "Attribute filters available" : "Collection-level gate"}
                    </span>
                  </div>
                </ComboboxItem>
              )}
            </ComboboxList>
          </ComboboxContent>
        </Combobox>
        {!selectedSource ? (
          <Input
            className="mt-2"
            aria-label={copy.inputs.nftContractAddress}
            onChange={(event) => pasteAddress(event.currentTarget.value)}
            value={getGateContractAddress(gate)}
          />
        ) : null}
      </div>

      {selectedSource?.traitFiltersSupported ? (
        <div className="ms-0 flex flex-col gap-2 rounded-[var(--radius-md)] border border-border-soft bg-muted/20 p-2 md:ms-4">
          {traitKeys.map((facetKey) => (
            <div className="grid gap-2 md:grid-cols-[minmax(160px,0.8fr)_auto_minmax(220px,1.4fr)_auto] md:items-center" key={facetKey}>
              <Select value={facetKey} onValueChange={(nextKey) => {
                const existingValue = match[facetKey] ?? "";
                removeFacet(facetKey);
                updateFacet(nextKey, existingValue);
              }}>
                <SelectTrigger aria-label="Attribute"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {selectedSource.facetKeys.filter((key) => key === facetKey || (!(key in match) && !(key in (selectedSource.fixedMatch ?? {})))).map((key) => (
                    <SelectItem key={key} value={key}>{formatFacetKey(key)}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <span className="rounded-full border border-border-soft px-3 py-2 text-base text-muted-foreground">is one of</span>
              <FacetValuePicker
                capabilitySource={capabilitySource}
                facetKey={facetKey}
                maxValues={selectedSource.maxValuesPerFacet}
                onChange={(value) => updateFacet(facetKey, value)}
                source={selectedSource}
                value={match[facetKey] ? [{ value: match[facetKey]! }] : []}
              />
              <Button aria-label="Remove attribute filter" size="icon" variant="ghost" onClick={() => removeFacet(facetKey)}>
                <X size={18} />
              </Button>
            </div>
          ))}
          {addableFacetKeys.length > 0 ? (
            <div className="flex flex-wrap items-center justify-between gap-2">
              <Button
                className="self-start"
                size="sm"
                variant="outline"
                leadingIcon={<Plus size={16} />}
                onClick={() => setPendingFacetKeys((current) => [...current, addableFacetKeys[0]!])}
              >
                Add attribute filter
              </Button>
              {selectedSource.provenanceLabel ? (
                <div className="text-base text-muted-foreground">{selectedSource.provenanceLabel}</div>
              ) : null}
            </div>
          ) : null}
          {matchCount != null ? (
            <div className="text-base text-muted-foreground">Approximately {matchCount.toLocaleString("en-US")} match.</div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

function FacetValuePicker({
  capabilitySource,
  facetKey,
  maxValues,
  onChange,
  source,
  value,
}: {
  capabilitySource: CollectionCapabilitySource;
  facetKey: string;
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
      <ComboboxChips className="rounded-[var(--radius-lg)]">
        <ComboboxValue>
          {(selectedOptions) => (
            <>
              {selectedOptions.map((option: FacetValueSuggestion) => (
                <ComboboxChip key={option.value}>{option.value}</ComboboxChip>
              ))}
              <ComboboxChipsInput
                aria-label={`Search ${formatFacetKey(facetKey)}`}
                placeholder={`Search ${formatFacetKey(facetKey).toLowerCase()}`}
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
    case "erc721_inventory_match":
      return "erc721_holding";
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
    case "erc721_inventory_match":
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
