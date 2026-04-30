"use client";

import * as React from "react";
import { PencilSimple, Plus, Trash } from "@phosphor-icons/react";

import { Button } from "@/components/primitives/button";
import { CommunityModerationSaveFooter } from "@/components/compositions/community/moderation-shell/community-moderation-save-footer";
import { FormFieldLabel } from "@/components/primitives/form-layout";
import { Input } from "@/components/primitives/input";
import { Textarea } from "@/components/primitives/textarea";
import { cn } from "@/lib/utils";
import { defaultRouteCopy } from "../../system/route-copy-defaults";
import { Type } from "@/components/primitives/type";

export interface RuleDraft {
  id: string;
  existingRuleId: string | null;
  title: string;
  body: string;
  reportReason: string;
}

export function createEmptyRuleDraft(): RuleDraft {
  return {
    id: `draft-${Math.random().toString(36).slice(2, 10)}`,
    existingRuleId: null,
    title: "",
    body: "",
    reportReason: "",
  };
}

export interface CommunityRulesEditorPageProps {
  className?: string;
  rules: RuleDraft[];
  onRulesChange?: (rules: RuleDraft[]) => void;
  onSave?: () => void;
  saveDisabled?: boolean;
  saveLoading?: boolean;
}

function RuleRow({
  index,
  onEdit,
  onRemove,
  rule,
}: {
  index: number;
  onEdit: () => void;
  onRemove: () => void;
  rule: RuleDraft;
}) {
  const isEmpty = !rule.title.trim() && !rule.body.trim();
  return (
    <div className="flex items-start gap-4 rounded-[var(--radius-xl)] border border-border-soft bg-card px-4 py-3">
      <span className="shrink-0 pt-1 tabular-nums text-muted-foreground/60">{index + 1}</span>
      <div className="min-w-0 flex-1">
        <Type as="div" variant="body-strong" className="truncate">
          {rule.title.trim() || "Untitled rule"}
        </Type>
        {rule.body.trim() ? (
          <Type as="div" variant="caption" className="mt-1 line-clamp-2 text-muted-foreground/70">
            {rule.body}
          </Type>
        ) : null}
      </div>
      <div className="flex shrink-0 items-center gap-1">
        <Button
          aria-label="Edit rule"
          className="size-9"
          onClick={onEdit}
          size="icon"
          variant="ghost"
        >
          <PencilSimple className="size-5" />
        </Button>
        <Button
          aria-label="Delete rule"
          className="size-9"
          onClick={onRemove}
          size="icon"
          variant="ghost"
        >
          <Trash className="size-5" />
        </Button>
      </div>
    </div>
  );
}

function RuleEditForm({
  mc,
  onCancel,
  onDraftChange,
  onSave,
  draft,
}: {
  mc: typeof defaultRouteCopy.moderation.rules;
  onCancel: () => void;
  onDraftChange: (patch: Partial<RuleDraft>) => void;
  onSave: () => void;
  draft: RuleDraft;
}) {
  return (
    <div className="space-y-5 rounded-[var(--radius-2_5xl)] border border-border-soft bg-card p-5">
      <div className="space-y-3">
        <FormFieldLabel label={mc.namePlaceholder} />
        <Input
          onChange={(event) => onDraftChange({ title: event.target.value })}
          placeholder={mc.namePlaceholder}
          size="lg"
          value={draft.title}
        />
        <Type as="div" variant="caption" className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
          <span>{mc.maxChars100}</span>
          <span>{draft.title.length}/100</span>
        </Type>
      </div>

      <div className="space-y-3">
        <FormFieldLabel label={mc.descriptionPlaceholder} />
        <Textarea
          className="min-h-36 rounded-[var(--radius-2_5xl)] px-5 py-4"
          onChange={(event) => onDraftChange({ body: event.target.value })}
          placeholder={mc.descriptionPlaceholder}
          value={draft.body}
        />
        <Type as="div" variant="caption" className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
          <span>{mc.maxChars500}</span>
          <span>{draft.body.length}/500</span>
        </Type>
      </div>

      <div className="space-y-3 pt-1">
        <div className="space-y-1">
          <Type as="div" variant="label">{mc.reportingTitle}</Type>
          <Type as="p" variant="caption">{mc.reportingDescription}</Type>
        </div>
        <Input
          onChange={(event) => onDraftChange({ reportReason: event.target.value })}
          placeholder={mc.reportReasonPlaceholder}
          size="lg"
          value={draft.reportReason}
        />
        <Type as="div" variant="caption" className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
          <span>{mc.reportReasonHint}</span>
          <span>{draft.reportReason.length}/100</span>
        </Type>
      </div>

      <div className="flex items-center justify-end gap-3 pt-1">
        <Button onClick={onCancel} variant="ghost">Cancel</Button>
        <Button disabled={!draft.title.trim()} onClick={onSave}>Save rule</Button>
      </div>
    </div>
  );
}

export function CommunityRulesEditorPage({
  className,
  rules,
  onRulesChange,
  onSave,
  saveDisabled = false,
  saveLoading = false,
}: CommunityRulesEditorPageProps) {
  const copy = defaultRouteCopy;
  const mc = copy.moderation.rules;
  const [editingId, setEditingId] = React.useState<string | null>(null);

  const editingDraft = rules.find((r) => r.id === editingId) ?? null;

  const updateRule = React.useCallback(
    (id: string, patch: Partial<RuleDraft>) => {
      onRulesChange?.(rules.map((r) => (r.id === id ? { ...r, ...patch } : r)));
    },
    [rules, onRulesChange],
  );

  const removeRule = React.useCallback(
    (id: string) => {
      if (editingId === id) {
        setEditingId(null);
      }
      onRulesChange?.(rules.filter((r) => r.id !== id));
    },
    [editingId, rules, onRulesChange],
  );

  const addRule = React.useCallback(() => {
    const draft = createEmptyRuleDraft();
    onRulesChange?.([...rules, draft]);
    setEditingId(draft.id);
  }, [rules, onRulesChange]);

  const commitEdit = React.useCallback(() => {
    if (!editingDraft) return;
    if (!editingDraft.title.trim()) return;
    updateRule(editingDraft.id, {});
    setEditingId(null);
  }, [editingDraft, updateRule]);

  const cancelEdit = React.useCallback(() => {
    if (!editingDraft) return;
    if (!editingDraft.title.trim() && !editingDraft.body.trim() && !editingDraft.existingRuleId) {
      onRulesChange?.(rules.filter((r) => r.id !== editingDraft.id));
    }
    setEditingId(null);
  }, [editingDraft, rules, onRulesChange]);

  return (
    <section className={cn("mx-auto flex w-full max-w-5xl flex-col gap-6 md:gap-8", className)}>
      <div className="flex items-center justify-between gap-4">
        <div className="space-y-1">
          <Type as="h1" variant="h1" className="md:text-4xl">{mc.title}</Type>
          <Type as="p" variant="caption">{mc.description}</Type>
        </div>
        <Button onClick={addRule} variant="secondary">
          <Plus className="size-5" />
          {mc.addRule}
        </Button>
      </div>

      <div className="flex flex-col gap-3">
        {rules.map((rule, index) =>
          rule.id === editingId && editingDraft ? (
            <RuleEditForm
              draft={editingDraft}
              key={rule.id}
              mc={mc}
              onCancel={cancelEdit}
              onDraftChange={(patch) => updateRule(rule.id, patch)}
              onSave={commitEdit}
            />
          ) : (
            <RuleRow
              index={index}
              key={rule.id}
              onEdit={() => setEditingId(rule.id)}
              onRemove={() => removeRule(rule.id)}
              rule={rule}
            />
          ),
        )}

        {rules.length === 0 ? (
          <Type as="div" variant="caption" className="rounded-[var(--radius-xl)] border border-dashed border-border-soft bg-card px-5 py-8 text-center">
            {mc.emptyState}
          </Type>
        ) : null}
      </div>

      <CommunityModerationSaveFooter
        disabled={saveDisabled}
        loading={saveLoading}
        onSave={onSave}
      />
    </section>
  );
}
