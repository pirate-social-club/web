"use client";

import * as React from "react";
import { CaretDown, CaretUp, Plus, Trash } from "@phosphor-icons/react";

import { Button } from "@/components/primitives/button";
import { IconButton } from "@/components/primitives/icon-button";
import { Input } from "@/components/primitives/input";
import { Textarea } from "@/components/primitives/textarea";
import { cn } from "@/lib/utils";

import type {
  CommunitySettingsRule,
  CommunitySettingsRulesProps,
} from "./community-settings.types";

function Section({
  title,
  children,
  className,
}: {
  title: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section className={cn("space-y-4", className)}>
      <h3 className="text-lg font-semibold tracking-tight text-foreground">
        {title}
      </h3>
      {children}
    </section>
  );
}

function RuleCard({
  index,
  isFirst,
  isLast,
  onArchive,
  onBodyChange,
  onMoveDown,
  onMoveUp,
  onTitleChange,
  readOnly,
  rule,
}: {
  index: number;
  isFirst: boolean;
  isLast: boolean;
  rule: CommunitySettingsRule;
  readOnly?: boolean;
  onTitleChange: (value: string) => void;
  onBodyChange: (value: string) => void;
  onArchive: () => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
}) {
  return (
    <div className="space-y-3 rounded-[var(--radius-lg)] border border-border-soft bg-muted/20 px-4 py-4">
      <div className="flex items-start gap-3">
        <span className="mt-2.5 text-base tabular-nums text-muted-foreground">
          {index + 1}.
        </span>
        <div className="min-w-0 flex-1">
          <Input
            className="h-10 rounded-[var(--radius-lg)]"
            disabled={readOnly}
            onChange={(e) => onTitleChange(e.target.value)}
            placeholder="Rule title"
            value={rule.title}
          />
        </div>
      </div>
      <div className="pl-8">
        <Textarea
          className="min-h-20 text-base"
          disabled={readOnly}
          onChange={(e) => onBodyChange(e.target.value)}
          placeholder="Rule description"
          value={rule.body}
        />
      </div>
      {!readOnly ? (
        <div className="flex justify-end gap-1 pl-8">
          <IconButton
            disabled={isFirst}
            size="sm"
            variant="ghost"
            onClick={onMoveUp}
          >
            <CaretUp className="size-4" weight="bold" />
          </IconButton>
          <IconButton
            disabled={isLast}
            size="sm"
            variant="ghost"
            onClick={onMoveDown}
          >
            <CaretDown className="size-4" weight="bold" />
          </IconButton>
          <IconButton
            size="sm"
            variant="ghost"
            onClick={onArchive}
          >
            <Trash className="size-4" />
          </IconButton>
        </div>
      ) : null}
    </div>
  );
}

export function CommunitySettingsRules({
  className,
  rules,
  onRulesChange,
  readOnly,
}: CommunitySettingsRulesProps) {
  const activeRules = rules
    .filter((r) => r.status === "active")
    .sort((a, b) => a.position - b.position);

  const addRule = React.useCallback(() => {
    const maxPosition = activeRules.reduce(
      (max, r) => Math.max(max, r.position),
      -1,
    );
    const newRule: CommunitySettingsRule = {
      ruleId: crypto.randomUUID(),
      title: "",
      body: "",
      position: maxPosition + 1,
      status: "active",
    };
    onRulesChange([...rules, newRule]);
  }, [rules, activeRules, onRulesChange]);

  const updateRule = React.useCallback(
    (ruleId: string, partial: Partial<CommunitySettingsRule>) => {
      onRulesChange(
        rules.map((r) => (r.ruleId === ruleId ? { ...r, ...partial } : r)),
      );
    },
    [rules, onRulesChange],
  );

  const archiveRule = React.useCallback(
    (ruleId: string) => {
      onRulesChange(
        rules.map((r) =>
          r.ruleId === ruleId
            ? { ...r, status: "archived" as const }
            : r,
        ),
      );
    },
    [rules, onRulesChange],
  );

  const moveRule = React.useCallback(
    (ruleId: string, direction: "up" | "down") => {
      const sorted = activeRules.map((r) => r.ruleId);
      const currentIndex = sorted.indexOf(ruleId);
      if (currentIndex < 0) return;
      const targetIndex =
        direction === "up" ? currentIndex - 1 : currentIndex + 1;
      if (targetIndex < 0 || targetIndex >= sorted.length) return;

      const updated = rules.map((r) => {
        if (r.ruleId === ruleId)
          return { ...r, position: activeRules[targetIndex].position };
        if (r.ruleId === sorted[targetIndex])
          return { ...r, position: activeRules[currentIndex].position };
        return r;
      });
      onRulesChange(updated);
    },
    [rules, activeRules, onRulesChange],
  );

  return (
    <div className={cn("space-y-6", className)}>
      <Section title="Community rules">
        {activeRules.length === 0 ? (
          <p className="text-base text-muted-foreground">No rules yet.</p>
        ) : (
          <div className="space-y-3">
            {activeRules.map((rule, index) => (
              <RuleCard
                index={index}
                isFirst={index === 0}
                isLast={index === activeRules.length - 1}
                key={rule.ruleId}
                readOnly={readOnly}
                rule={rule}
                onArchive={() => archiveRule(rule.ruleId)}
                onBodyChange={(v) => updateRule(rule.ruleId, { body: v })}
                onMoveDown={() => moveRule(rule.ruleId, "down")}
                onMoveUp={() => moveRule(rule.ruleId, "up")}
                onTitleChange={(v) => updateRule(rule.ruleId, { title: v })}
              />
            ))}
          </div>
        )}
      </Section>

      {!readOnly ? (
        <Button onClick={addRule} variant="secondary">
          <Plus className="size-4" weight="bold" />
          Add rule
        </Button>
      ) : null}
    </div>
  );
}
