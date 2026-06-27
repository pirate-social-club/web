import * as React from "react";
import { Plus, Trash } from "@phosphor-icons/react";

import { Button } from "@/components/primitives/button";
import { Card, CardContent } from "@/components/primitives/card";
import { Input } from "@/components/primitives/input";
import { Separator } from "@/components/primitives/separator";
import { Type } from "@/components/primitives/type";
import { cn } from "@/lib/utils";

const WEEKDAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"] as const;

export interface AvailabilityRuleDraft {
  id: string;
  byWeekday: number[];
  startLocal: string;
  endLocal: string;
  slotDurationMinutes: number;
}

export interface PriceRuleDraft {
  id: string;
  matchWeekday: number[];
  startLocal: string;
  endLocal: string;
  priceCents: number;
}

export interface AvailabilityExceptionDraft {
  id: string;
  kind: "block" | "open";
  startUtc: string;
  endUtc: string;
}

export interface HostAvailabilityEditorProps {
  rules: AvailabilityRuleDraft[];
  priceRules: PriceRuleDraft[];
  exceptions: AvailabilityExceptionDraft[];
  onRulesChange?: (rules: AvailabilityRuleDraft[]) => void;
  onPriceRulesChange?: (rules: PriceRuleDraft[]) => void;
  onExceptionsChange?: (exceptions: AvailabilityExceptionDraft[]) => void;
  className?: string;
}

let nextDraftId = 0;
function newDraftId(prefix: string): string {
  nextDraftId += 1;
  return `${prefix}-${nextDraftId}`;
}

export function HostAvailabilityEditor({
  rules,
  priceRules,
  exceptions,
  onRulesChange,
  onPriceRulesChange,
  onExceptionsChange,
  className,
}: HostAvailabilityEditorProps) {
  const toggleWeekday = (ruleId: string, day: number) => {
    if (!onRulesChange) return;
    const rule = rules.find((r) => r.id === ruleId);
    if (!rule) return;
    const has = rule.byWeekday.includes(day);
    onRulesChange(
      rules.map((r) =>
        r.id === ruleId
          ? {
              ...r,
              byWeekday: has
                ? r.byWeekday.filter((d) => d !== day)
                : [...r.byWeekday, day].sort(),
            }
          : r,
      ),
    );
  };

  const updateRule = (ruleId: string, patch: Partial<AvailabilityRuleDraft>) => {
    onRulesChange?.(rules.map((r) => (r.id === ruleId ? { ...r, ...patch } : r)));
  };

  const addRule = () => {
    onRulesChange?.([
      ...rules,
      {
        id: newDraftId("rule"),
        byWeekday: [1, 2, 3, 4, 5],
        startLocal: "09:00",
        endLocal: "17:00",
        slotDurationMinutes: 30,
      },
    ]);
  };

  const removeRule = (ruleId: string) => {
    onRulesChange?.(rules.filter((r) => r.id !== ruleId));
  };

  const addPriceRule = () => {
    onPriceRulesChange?.([
      ...priceRules,
      {
        id: newDraftId("price"),
        matchWeekday: [1, 2, 3, 4, 5],
        startLocal: "09:00",
        endLocal: "12:00",
        priceCents: 6000,
      },
    ]);
  };

  const removePriceRule = (id: string) => {
    onPriceRulesChange?.(priceRules.filter((r) => r.id !== id));
  };

  const updatePriceRule = (id: string, patch: Partial<PriceRuleDraft>) => {
    onPriceRulesChange?.(priceRules.map((r) => (r.id === id ? { ...r, ...patch } : r)));
  };

  const addException = () => {
    onExceptionsChange?.([
      ...exceptions,
      {
        id: newDraftId("exc"),
        kind: "block",
        startUtc: "2026-07-04T00:00:00Z",
        endUtc: "2026-07-04T23:59:59Z",
      },
    ]);
  };

  const removeException = (id: string) => {
    onExceptionsChange?.(exceptions.filter((e) => e.id !== id));
  };

  const updateException = (id: string, patch: Partial<AvailabilityExceptionDraft>) => {
    onExceptionsChange?.(exceptions.map((e) => (e.id === id ? { ...e, ...patch } : e)));
  };

  return (
    <div className={cn("flex flex-col gap-6", className)}>
      {/* Recurring rules */}
      <Card>
        <CardContent className="flex flex-col gap-4 p-6">
          <div className="flex items-center justify-between">
            <Type as="h2" variant="h3">
              Recurring availability
            </Type>
            <Button onClick={addRule} size="icon" variant="secondary">
              <Plus />
            </Button>
          </div>
          {rules.length === 0 ? (
            <Type variant="caption">No recurring rules yet.</Type>
          ) : null}
          {rules.map((rule) => (
            <div key={rule.id} className="flex flex-col gap-3 rounded-[var(--radius-md)] border border-border-soft p-4">
              <div className="flex items-center justify-between">
                <Type variant="label">Rule</Type>
                <Button onClick={() => removeRule(rule.id)} size="icon" variant="ghost">
                  <Trash />
                </Button>
              </div>
              <div className="flex flex-wrap gap-2">
                {WEEKDAY_LABELS.map((label, day) => (
                  <button
                    key={label}
                    className={cn(
                      "h-9 w-9 rounded-full border text-center transition-colors",
                      rule.byWeekday.includes(day)
                        ? "border-primary bg-primary text-primary-foreground"
                        : "border-border-soft bg-card",
                    )}
                    onClick={() => toggleWeekday(rule.id, day)}
                    type="button"
                  >
                    <Type as="span" variant="caption">
                      {label[0]}
                    </Type>
                  </button>
                ))}
              </div>
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-4">
                <label className="flex flex-col gap-1">
                  <Type variant="caption">Start</Type>
                  <Input
                    onChange={(e) => updateRule(rule.id, { startLocal: e.target.value })}
                    type="time"
                    value={rule.startLocal}
                  />
                </label>
                <label className="flex flex-col gap-1">
                  <Type variant="caption">End</Type>
                  <Input
                    onChange={(e) => updateRule(rule.id, { endLocal: e.target.value })}
                    type="time"
                    value={rule.endLocal}
                  />
                </label>
                <label className="flex flex-col gap-1">
                  <Type variant="caption">Slot length (min)</Type>
                  <Input
                    min={5}
                    onChange={(e) =>
                      updateRule(rule.id, { slotDurationMinutes: parseInt(e.target.value, 10) || 30 })
                    }
                    type="number"
                    value={rule.slotDurationMinutes}
                  />
                </label>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Price rules */}
      <Card>
        <CardContent className="flex flex-col gap-4 p-6">
          <div className="flex items-center justify-between">
            <Type as="h2" variant="h3">
              Variable pricing
            </Type>
            <Button onClick={addPriceRule} size="icon" variant="secondary">
              <Plus />
            </Button>
          </div>
          {priceRules.length === 0 ? (
            <Type variant="caption">No variable pricing — base price applies to all slots.</Type>
          ) : null}
          {priceRules.map((rule) => (
            <div key={rule.id} className="flex flex-col gap-3 rounded-[var(--radius-md)] border border-border-soft p-4">
              <div className="flex items-center justify-between">
                <Type variant="label">Price rule</Type>
                <Button onClick={() => removePriceRule(rule.id)} size="icon" variant="ghost">
                  <Trash />
                </Button>
              </div>
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-4">
                <label className="flex flex-col gap-1">
                  <Type variant="caption">Start</Type>
                  <Input
                    onChange={(e) => updatePriceRule(rule.id, { startLocal: e.target.value })}
                    type="time"
                    value={rule.startLocal}
                  />
                </label>
                <label className="flex flex-col gap-1">
                  <Type variant="caption">End</Type>
                  <Input
                    onChange={(e) => updatePriceRule(rule.id, { endLocal: e.target.value })}
                    type="time"
                    value={rule.endLocal}
                  />
                </label>
                <label className="flex flex-col gap-1">
                  <Type variant="caption">Price (cents)</Type>
                  <Input
                    min={0}
                    onChange={(e) =>
                      updatePriceRule(rule.id, { priceCents: parseInt(e.target.value, 10) || 0 })
                    }
                    type="number"
                    value={rule.priceCents}
                  />
                </label>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Exceptions */}
      <Card>
        <CardContent className="flex flex-col gap-4 p-6">
          <div className="flex items-center justify-between">
            <Type as="h2" variant="h3">
              One-off exceptions
            </Type>
            <Button onClick={addException} size="icon" variant="secondary">
              <Plus />
            </Button>
          </div>
          {exceptions.length === 0 ? (
            <Type variant="caption">No exceptions — recurring rules apply as-is.</Type>
          ) : null}
          {exceptions.map((exc) => (
            <div key={exc.id} className="flex flex-col gap-3 rounded-[var(--radius-md)] border border-border-soft p-4">
              <div className="flex items-center justify-between">
                <Type variant="label">{exc.kind === "block" ? "Block" : "Open window"}</Type>
                <Button onClick={() => removeException(exc.id)} size="icon" variant="ghost">
                  <Trash />
                </Button>
              </div>
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-4">
                <label className="flex flex-col gap-1">
                  <Type variant="caption">Start (UTC)</Type>
                  <Input
                    onChange={(e) => updateException(exc.id, { startUtc: e.target.value })}
                    type="datetime-local"
                    value={exc.startUtc.replace("Z", "")}
                  />
                </label>
                <label className="flex flex-col gap-1">
                  <Type variant="caption">End (UTC)</Type>
                  <Input
                    onChange={(e) => updateException(exc.id, { endUtc: e.target.value })}
                    type="datetime-local"
                    value={exc.endUtc.replace("Z", "")}
                  />
                </label>
                <label className="flex flex-col gap-1">
                  <Type variant="caption">Type</Type>
                  <select
                    className="h-11 rounded-full border border-border-soft bg-card px-4 text-base"
                    onChange={(e) =>
                      updateException(exc.id, { kind: e.target.value as "block" | "open" })
                    }
                    value={exc.kind}
                  >
                    <option value="block">Block</option>
                    <option value="open">Open</option>
                  </select>
                </label>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
