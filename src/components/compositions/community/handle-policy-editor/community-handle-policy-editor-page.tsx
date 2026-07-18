"use client";

import * as React from "react";
import { ArrowDown, ArrowUp, Plus, Warning, X } from "@phosphor-icons/react";
import type { CommunityHandle } from "@pirate/api-contracts";

import { CommunityModerationSaveFooter } from "@/components/compositions/community/moderation-shell/community-moderation-save-footer";
import { Button } from "@/components/primitives/button";
import {
  FormFieldLabel,
  FormNote,
} from "@/components/primitives/form-layout";
import { Input } from "@/components/primitives/input";
import { Label } from "@/components/primitives/label";
import { OptionCard } from "@/components/primitives/option-card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/primitives/select";
import { Switch } from "@/components/primitives/switch";
import { Textarea } from "@/components/primitives/textarea";
import { Type } from "@/components/primitives/type";
import { getLocaleMessages } from "@/locales";
import { useUiLocale } from "@/lib/ui-locale";
import { cn } from "@/lib/utils";
import {
  MAX_LABEL_CLAIM_RULES,
  isLabelClaimRuleDraftSavable,
  parseSpecialPricesText,
  type HandleLabelClaimRuleDraft,
  type HandlePolicyDraft,
  type HandlePricingMode,
  type HandleStatusFilter,
} from "@/app/authenticated-state/use-community-handle-policy-state";
import { parseGatePolicyToTreeDraft } from "@/app/authenticated-helpers/community-gate-tree-draft";
import { GateTreeBuilder } from "@/components/compositions/community/gates-editor/tree-builder/gate-tree-builder";
import type { GateCapabilitySources } from "@/components/compositions/community/gates-editor/tree-builder/gate-capability-sources";

const EMPTY_HANDLES: CommunityHandle[] = [];
type RuleEditorCopy = ReturnType<typeof getLocaleMessages<"gates">>["handleClaims"]["ruleEditor"];

function LabelClaimRuleCard({
  capabilities,
  copy,
  disabled,
  index,
  onChange,
  onMove,
  onRemove,
  rule,
  ruleCount,
}: {
  capabilities?: GateCapabilitySources;
  copy: RuleEditorCopy;
  disabled: boolean;
  index: number;
  onChange: (rule: HandleLabelClaimRuleDraft) => void;
  onMove: (direction: -1 | 1) => void;
  onRemove: () => void;
  rule: HandleLabelClaimRuleDraft;
  ruleCount: number;
}) {
  const savable = isLabelClaimRuleDraftSavable(rule);
  return (
    <div className="space-y-3 rounded-[var(--radius-lg)] border border-border-soft bg-muted/10 p-4">
      <div className="flex items-center gap-2">
        <Type as="h3" variant="body-strong" className="min-w-0 flex-1">
          {copy.ruleTitle.replace("{number}", String(index + 1))}
        </Type>
        <Button
          aria-label={copy.moveUp}
          disabled={disabled || index === 0}
          onClick={() => onMove(-1)}
          size="icon"
          variant="ghost"
        >
          <ArrowUp size={16} />
        </Button>
        <Button
          aria-label={copy.moveDown}
          disabled={disabled || index === ruleCount - 1}
          onClick={() => onMove(1)}
          size="icon"
          variant="ghost"
        >
          <ArrowDown size={16} />
        </Button>
        <Button
          aria-label={copy.remove}
          disabled={disabled}
          onClick={onRemove}
          size="icon"
          variant="ghost"
        >
          <X size={16} />
        </Button>
      </div>

      <div className="flex flex-col gap-2 md:flex-row md:items-center">
        <div className="w-full md:w-56 md:shrink-0">
          <Select
            value={rule.selectorType}
            onValueChange={(selectorType) => {
              if (selectorType === "exact" || selectorType === "any") {
                onChange({ ...rule, selectorType });
              }
            }}
          >
            <SelectTrigger aria-label={copy.selectorLabel} className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="exact">{copy.specificNames}</SelectItem>
              <SelectItem value="any">{copy.allNames}</SelectItem>
            </SelectContent>
          </Select>
        </div>
        {rule.selectorType === "exact" ? (
          <div className="min-w-0 flex-1">
            <Input
              aria-label={copy.namesLabel}
              disabled={disabled}
              onChange={(event) => onChange({ ...rule, labelsText: event.currentTarget.value })}
              placeholder={copy.namesPlaceholder}
              value={rule.labelsText}
            />
          </div>
        ) : null}
      </div>

      <GateTreeBuilder
        capabilities={capabilities}
        className="max-w-none p-0"
        labelBindingEnabled
        onChange={(gateTreeDraft) => onChange({ ...rule, gateTreeDraft })}
        showHeader={false}
        value={rule.gateTreeDraft}
      />

      {!savable ? (
        <FormNote tone="warning">
          {rule.selectorType === "exact"
            ? copy.invalidExact
            : copy.invalidAny}
        </FormNote>
      ) : null}
    </div>
  );
}

export interface CommunityHandlePolicyEditorPageProps {
  className?: string;
  capabilities?: GateCapabilitySources;
  draft: HandlePolicyDraft;
  hasChanges: boolean;
  hasNamespace: boolean;
  namespaceLabel?: string | null;
  handles?: CommunityHandle[];
  handlesLoading?: boolean;
  handleStatusFilter?: HandleStatusFilter;
  handleOpsLoading?: boolean;
  onDraftChange: (draft: HandlePolicyDraft) => void;
  onNavigateToNamespace?: () => void;
  onReserveHandle?: (desiredLabel: string) => Promise<void> | void;
  onRevokeHandle?: (handleId: string) => Promise<void> | void;
  onStatusFilterChange?: (status: HandleStatusFilter) => void;
  onSave?: () => void;
  saveDisabled?: boolean;
  saveLoading?: boolean;
}

function Section({
  children,
  className,
  title,
}: {
  children: React.ReactNode;
  className?: string;
  title: string;
}) {
  return (
    <section className={cn("space-y-4", className)}>
      <Type as="h2" variant="h2">{title}</Type>
      {children}
    </section>
  );
}

function SwitchRow({
  checked,
  description,
  id,
  label,
  onCheckedChange,
}: {
  checked: boolean;
  description?: string;
  id: string;
  label: string;
  onCheckedChange: (checked: boolean) => void;
}) {
  return (
    <div className="flex items-start gap-3 rounded-[var(--radius-lg)] border border-border-soft bg-muted/20 p-4">
      <Switch
        checked={checked}
        id={id}
        onCheckedChange={onCheckedChange}
      />
      <div className="min-w-0 flex-1 space-y-1">
        <Label className="text-base font-medium leading-6" htmlFor={id}>
          {label}
        </Label>
        {description ? (
          <Type as="p" variant="caption">
            {description}
          </Type>
        ) : null}
      </div>
    </div>
  );
}

function NumberInputRow({
  label,
  min,
  max,
  onChange,
  value,
  prefix,
}: {
  label: string;
  min?: number;
  max?: number;
  onChange: (value: number | null) => void;
  value: number | null;
  prefix?: string;
}) {
  return (
    <div className="flex flex-col gap-3 rounded-[var(--radius-lg)] border border-border-soft bg-muted/20 p-4 md:flex-row md:items-center md:justify-between">
      <div className="text-base font-medium leading-6">{label}</div>
      <div className="relative w-full md:w-48">
        {prefix ? (
          <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
            {prefix}
          </span>
        ) : null}
        <Input
          className={cn("h-12 w-full rounded-[var(--radius-lg)]", prefix && "pl-7")}
          inputMode="numeric"
          min={min}
          max={max}
          onChange={(e) => {
            const parsed = e.target.value === "" ? null : Number(e.target.value);
            onChange(Number.isFinite(parsed) && parsed !== null ? parsed : null);
          }}
          type="number"
          value={value ?? ""}
        />
      </div>
    </div>
  );
}

function MoneyInputRow({
  label,
  min,
  onChange,
  value,
}: {
  label: string;
  min?: number;
  onChange: (value: number | null) => void;
  value: number | null;
}) {
  return (
    <NumberInputRow
      label={label}
      min={min}
      onChange={(nextValue) => onChange(nextValue == null ? null : Math.round(nextValue * 100))}
      prefix="$"
      value={value == null ? null : value / 100}
    />
  );
}

function formatCents(cents: number | null): string {
  if (cents == null) return "$0.00";
  return `$${(cents / 100).toFixed(2)}`;
}

function computePreviewPrice(label: string, draft: HandlePolicyDraft): { priceCents: number; tier: string } {
  const trimmed = label.trim().toLowerCase();
  if (!trimmed) return { priceCents: 0, tier: "" };

  const premiumMaxLength = draft.premiumMaxLength ?? 4;
  const specialPrices = parseSpecialPricesText(draft.specialPrices);
  const specialPrice = specialPrices[trimmed] ?? (() => {
    try {
      return specialPrices[new URL(`https://${trimmed}.invalid`).hostname.split(".")[0]?.toLowerCase() ?? ""];
    } catch {
      return undefined;
    }
  })();
  if (specialPrice != null) {
    return { priceCents: specialPrice, tier: "Special" };
  }
  const isPremium = trimmed.length <= premiumMaxLength;

  if (draft.pricingMode === "flat") {
    const price = draft.standardPriceCents ?? 0;
    return { priceCents: price, tier: price === 0 ? "Free" : "Standard" };
  }

  // premium_short
  const price = isPremium
    ? (draft.premiumPriceCents ?? draft.standardPriceCents ?? 0)
    : (draft.standardPriceCents ?? 0);
  return { priceCents: price, tier: isPremium ? "Premium" : "Standard" };
}

export function CommunityHandlePolicyEditorPage({
  className,
  capabilities,
  draft,
  hasChanges,
  hasNamespace,
  handles = EMPTY_HANDLES,
  handlesLoading = false,
  handleOpsLoading = false,
  handleStatusFilter = "all",
  namespaceLabel,
  onDraftChange,
  onNavigateToNamespace,
  onReserveHandle,
  onRevokeHandle,
  onStatusFilterChange,
  onSave,
  saveDisabled = false,
  saveLoading = false,
}: CommunityHandlePolicyEditorPageProps) {
  const { locale } = useUiLocale();
  const ruleCopy = getLocaleMessages(locale, "gates").handleClaims.ruleEditor;
  const [previewInput, setPreviewInput] = React.useState("alex");
  const [reserveInput, setReserveInput] = React.useState("");
  const preview = computePreviewPrice(previewInput, draft);

  function update(patch: Partial<HandlePolicyDraft>) {
    onDraftChange({ ...draft, ...patch });
  }

  const pricingOptions: Array<{ value: HandlePricingMode; title: string; description: string }> = [
    { value: "flat", title: "Flat price", description: "One price for all names." },
    { value: "premium_short", title: "Premium short names", description: "Shorter names cost more." },
  ];
  const statusOptions: Array<{ value: HandleStatusFilter; label: string }> = [
    { value: "all", label: "All statuses" },
    { value: "active", label: "Active" },
    { value: "reserved", label: "Reserved" },
    { value: "grace_period", label: "Grace period" },
    { value: "expired", label: "Expired" },
    { value: "revoked", label: "Revoked" },
  ];

  const editorDisabled = !hasNamespace;

  return (
    <section className={cn("mx-auto flex w-full max-w-5xl flex-col gap-6 md:gap-8", className)}>
      <div className="min-w-0 space-y-2">
        <Type as="h1" variant="h1" className="md:text-4xl">Names</Type>
        <Type as="p" variant="caption">
          Set pricing and rules for community handle claims.
        </Type>
      </div>

      {!hasNamespace ? (
        <div className="flex items-start gap-3 rounded-[var(--radius-lg)] border border-warning/30 bg-warning/5 p-4">
          <Warning className="mt-0.5 size-5 shrink-0 text-warning" weight="bold" />
          <div className="min-w-0 flex-1 space-y-2">
            <Type as="p" variant="body-strong">
              Namespace verification is required before members can claim community names.
            </Type>
            {onNavigateToNamespace ? (
              <Button
                className="h-10"
                onClick={onNavigateToNamespace}
                size="sm"
                variant="secondary"
              >
                Verify namespace
              </Button>
            ) : null}
          </div>
        </div>
      ) : null}

      <Section title="General">
        <div className="space-y-3">
          <SwitchRow
            checked={draft.claimsEnabled}
            description="Let members claim names in this community."
            id="claims-enabled"
            label="Enable name claims"
            onCheckedChange={(checked) => update({ claimsEnabled: checked })}
          />
        </div>
      </Section>

      <Section className="border-t border-border-soft pt-6 md:pt-8" title="Who can claim">
        <div className="space-y-4">
          <div className="grid gap-3 md:grid-cols-3">
            <OptionCard
              description="Anyone who can access this community may claim a name."
              disabled={editorDisabled}
              selected={draft.claimGateMode === "none"}
              title="Community members"
              onClick={() => update({ claimGateMode: "none" })}
            />
            <OptionCard
              description="Require the community membership gate again when the name is claimed."
              disabled={editorDisabled}
              selected={draft.claimGateMode === "inherit_community"}
              title="Community requirements"
              onClick={() => update({ claimGateMode: "inherit_community" })}
            />
            <OptionCard
              description="Set requirements that apply only to names in this namespace."
              disabled={editorDisabled}
              selected={draft.claimGateMode === "explicit"}
              title="Custom requirements"
              onClick={() => update({ claimGateMode: "explicit" })}
            />
          </div>

          {draft.claimGateMode === "explicit" ? (
            <GateTreeBuilder
              capabilities={capabilities}
              className="max-w-none p-0"
              onChange={(claimGateTreeDraft) => update({ claimGateTreeDraft })}
              showHeader={false}
              value={draft.claimGateTreeDraft}
            />
          ) : null}

          <FormNote tone="muted">
            Eligibility is checked when a member claims the name. Holding requirements are non-consumptive: the same eligible asset may satisfy more than one namespace.
          </FormNote>
        </div>
      </Section>

      <Section className="border-t border-border-soft pt-6 md:pt-8" title={ruleCopy.sectionTitle}>
        <div className="space-y-4">
          <Type as="p" variant="caption">
            {ruleCopy.sectionDescription}
          </Type>

          {draft.labelClaimRules.map((rule, index) => (
            <LabelClaimRuleCard
              key={rule.key}
              capabilities={capabilities}
              copy={ruleCopy}
              disabled={editorDisabled}
              index={index}
              onChange={(nextRule) => {
                const labelClaimRules = draft.labelClaimRules.slice();
                labelClaimRules[index] = nextRule;
                update({ labelClaimRules });
              }}
              onMove={(direction) => {
                const target = index + direction;
                if (target < 0 || target >= draft.labelClaimRules.length) return;
                const labelClaimRules = draft.labelClaimRules.slice();
                const [moved] = labelClaimRules.splice(index, 1);
                if (!moved) return;
                labelClaimRules.splice(target, 0, moved);
                update({ labelClaimRules });
              }}
              onRemove={() => {
                update({ labelClaimRules: draft.labelClaimRules.filter((_, i) => i !== index) });
              }}
              rule={rule}
              ruleCount={draft.labelClaimRules.length}
            />
          ))}

          <Button
            disabled={editorDisabled || draft.labelClaimRules.length >= MAX_LABEL_CLAIM_RULES}
            leadingIcon={<Plus size={16} />}
            onClick={() => {
              update({
                labelClaimRules: [
                  ...draft.labelClaimRules,
                  {
                    key: globalThis.crypto.randomUUID(),
                    selectorType: "exact",
                    labelsText: "",
                    gateTreeDraft: parseGatePolicyToTreeDraft(null),
                  },
                ],
              });
            }}
            size="sm"
            variant="outline"
          >
            {ruleCopy.add}
          </Button>
        </div>
      </Section>

      <Section className="border-t border-border-soft pt-6 md:pt-8" title="Pricing">
        <div className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-2">
            {pricingOptions.map((option) => (
              <OptionCard
                key={option.value}
                description={option.description}
                disabled={editorDisabled}
                selected={draft.pricingMode === option.value}
                title={option.title}
                onClick={() => update({ pricingMode: option.value })}
              />
            ))}
          </div>

          <div className="space-y-3">
            <MoneyInputRow
              label="Standard price"
              min={0}
              onChange={(value) => update({ standardPriceCents: value })}
              value={draft.standardPriceCents}
            />
            {draft.pricingMode === "premium_short" ? (
              <>
                <MoneyInputRow
                  label="Premium price"
                  min={0}
                  onChange={(value) => update({ premiumPriceCents: value })}
                  value={draft.premiumPriceCents}
                />
                <NumberInputRow
                  label="Short-name cutoff"
                  min={1}
                  onChange={(value) => update({ premiumMaxLength: value })}
                  value={draft.premiumMaxLength}
                />
              </>
            ) : null}
          </div>
        </div>
      </Section>

      <Section className="border-t border-border-soft pt-6 md:pt-8" title="Rules">
        <div className="space-y-3">
          <div className="grid gap-3 sm:grid-cols-2">
            <NumberInputRow
              label="Minimum length"
              min={1}
              onChange={(value) => update({ minLength: value })}
              value={draft.minLength}
            />
            <NumberInputRow
              label="Maximum length"
              min={1}
              onChange={(value) => update({ maxLength: value })}
              value={draft.maxLength}
            />
          </div>
          <div className="space-y-2">
            <FormFieldLabel label="Reserved names" />
            <Textarea
              className="min-h-24"
              disabled={editorDisabled}
              onChange={(e) => update({ reservedLabels: e.target.value })}
              placeholder="admin, mod, support…"
              value={draft.reservedLabels}
            />
            <FormNote tone="muted">Comma or newline separated.</FormNote>
          </div>
          <div className="space-y-2">
            <FormFieldLabel label="Special prices" />
            <Textarea
              className="min-h-44 font-mono"
              disabled={editorDisabled}
              onChange={(e) => update({ specialPrices: e.target.value })}
              placeholder={"crown: 1000.00\n👑: 1000.00\nprince: 500.00"}
              value={draft.specialPrices}
            />
            <FormNote tone="muted">One label per line as label: dollars. Exact matches override standard and short-name pricing.</FormNote>
          </div>
        </div>
      </Section>

      {hasNamespace ? (
        <Section className="border-t border-border-soft pt-6 md:pt-8" title="Preview">
          <div className="space-y-3">
            <div className="flex items-center gap-2 rounded-[var(--radius-lg)] border border-border-soft bg-muted/20 px-4 py-3">
              <Input
                className="h-10 flex-1 rounded-[var(--radius-lg)]"
                disabled={editorDisabled}
                onChange={(e) => setPreviewInput(e.target.value)}
                placeholder="yourname"
                value={previewInput}
              />
              <span className="shrink-0 font-mono text-base text-muted-foreground">
                @{namespaceLabel ?? "community"}
              </span>
            </div>
            <div className="flex items-center gap-2 text-base">
              <span className="text-muted-foreground">Price:</span>
              <span className="font-medium">{formatCents(preview.priceCents)}</span>
              {preview.tier ? (
                <span className="text-muted-foreground">
                  {preview.tier}
                </span>
              ) : null}
            </div>
          </div>
        </Section>
      ) : null}

      {hasNamespace ? (
        <Section className="border-t border-border-soft pt-6 md:pt-8" title="Operations">
          <div className="space-y-4">
            <div className="flex flex-col gap-3 rounded-[var(--radius-lg)] border border-border-soft bg-muted/20 p-4 md:flex-row md:items-end">
              <div className="min-w-0 flex-1 space-y-2">
                <FormFieldLabel label="Reserve name" />
                <Input
                  className="h-12 rounded-[var(--radius-lg)]"
                  disabled={handleOpsLoading}
                  onChange={(e) => setReserveInput(e.target.value)}
                  placeholder="crown"
                  value={reserveInput}
                />
              </div>
              <Button
                className="h-12 w-full md:w-auto"
                disabled={!reserveInput.trim() || handleOpsLoading}
                loading={handleOpsLoading}
                onClick={() => {
                  const desiredLabel = reserveInput.trim();
                  if (!desiredLabel) return;
                  void Promise.resolve(onReserveHandle?.(desiredLabel)).then(() => setReserveInput(""));
                }}
              >
                Reserve
              </Button>
            </div>

            <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
              <div className="min-w-0 space-y-1">
                <Type as="h3" variant="h4">Community names</Type>
                <Type as="p" variant="caption">List, reserve, and revoke names for this community.</Type>
              </div>
              <div className="w-full md:w-56">
                <FormFieldLabel label="Status" />
                <Select
                  value={handleStatusFilter}
                  onValueChange={(value) => onStatusFilterChange?.(value as HandleStatusFilter)}
                >
                  <SelectTrigger className="h-11 rounded-[var(--radius-lg)]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {statusOptions.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="overflow-x-auto rounded-[var(--radius-lg)] border border-border-soft">
              <table className="w-full min-w-[48rem] border-collapse bg-background">
                <thead className="bg-muted/40">
                  <tr className="border-b border-border-soft text-left">
                    <th className="px-4 py-3 font-medium">Name</th>
                    <th className="px-4 py-3 font-medium">Status</th>
                    <th className="px-4 py-3 font-medium">User</th>
                    <th className="px-4 py-3 font-medium">Price</th>
                    <th className="px-4 py-3 text-right font-medium">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {handlesLoading ? (
                    <tr>
                      <td className="px-4 py-6 text-muted-foreground" colSpan={5}>
                        Loading names…
                      </td>
                    </tr>
                  ) : handles.length === 0 ? (
                    <tr>
                      <td className="px-4 py-6 text-muted-foreground" colSpan={5}>
                        No names yet.
                      </td>
                    </tr>
                  ) : handles.map((handle) => (
                    <tr className="border-b border-border-soft last:border-b-0" key={handle.id}>
                      <td className="px-4 py-3 font-mono">{handle.label}</td>
                      <td className="px-4 py-3">{handle.status}</td>
                      <td className="max-w-64 truncate px-4 py-3 font-mono">{handle.user}</td>
                      <td className="px-4 py-3">{formatCents(handle.price_cents)}</td>
                      <td className="px-4 py-3 text-right">
                        <Button
                          disabled={handleOpsLoading || handle.status === "revoked" || handle.status === "expired"}
                          onClick={() => onRevokeHandle?.(handle.id)}
                          variant="secondary"
                        >
                          Revoke
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </Section>
      ) : null}

      <CommunityModerationSaveFooter
        disabled={saveDisabled || !hasChanges || editorDisabled}
        loading={saveLoading}
        onSave={onSave}
      />
    </section>
  );
}
