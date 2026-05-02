"use client"

import * as React from "react"
import { Plus, Trash } from "@phosphor-icons/react"

import { Button } from "@/components/primitives/button"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/primitives/select"
import { cn } from "@/lib/utils"
import { Type } from "@/components/primitives/type"
import {
  type GateExpression,
  type GateAtom,
  type GateGroupMode,
  type GateExpressionScope,
  getAtomsForScope,
} from "./gate-expression-builder.types"
import { TokenGateConfigSheet, getTokenGateSummary } from "./token-gate-config-sheet"

export type { GateExpression, GateAtom, GateGroupMode, GateExpressionScope }

export interface GateExpressionBuilderProps {
  expression: GateExpression
  scope: GateExpressionScope
  maxDepth?: number
  onChange: (expression: GateExpression) => void
  className?: string
}

export function GateExpressionBuilder({
  expression,
  scope,
  maxDepth = 2,
  onChange,
  className,
}: GateExpressionBuilderProps) {
  return (
    <div className={cn("space-y-3", className)}>
      <GateGroupCard
        expression={expression}
        scope={scope}
        depth={0}
        maxDepth={maxDepth}
        onChange={onChange}
        isRoot
      />
    </div>
  )
}

interface GateGroupCardProps {
  expression: GateExpression
  scope: GateExpressionScope
  depth: number
  maxDepth: number
  onChange: (expression: GateExpression) => void
  isRoot?: boolean
  onRemove?: () => void
}

function GateGroupCard({
  expression,
  scope,
  depth,
  maxDepth,
  onChange,
  isRoot,
  onRemove,
}: GateGroupCardProps) {
  const mode = expression.op === "gate" ? "and" : expression.op === "threshold" ? "threshold" : expression.op
  const children = expression.op === "gate" ? [] : expression.children
  const canNest = depth < maxDepth - 1

  const handleModeChange = (nextMode: string) => {
    if (nextMode === mode) return
    const currentChildren: GateExpression[] = expression.op === "gate" ? [expression] : (expression as { children: GateExpression[] }).children
    if (nextMode === "threshold") {
      onChange({ op: "threshold" as const, count: 1, children: currentChildren.length > 0 ? currentChildren : [{ op: "gate" as const, gate: makeDefaultGate(scope) }] })
    } else if (nextMode === "and" || nextMode === "or") {
      onChange({ op: nextMode as "and" | "or", children: currentChildren })
    }
  }

  const handleThresholdCountChange = (count: number) => {
    if (expression.op !== "threshold") return
    const maxCount = expression.children.length
    onChange({ ...expression, count: Math.max(1, Math.min(count, maxCount)) })
  }

  const handleChildChange = (index: number, child: GateExpression) => {
    if (expression.op === "gate") return
    const next = [...(expression as { children: GateExpression[] }).children]
    next[index] = child
    onChange({ ...expression, children: next } as GateExpression)
  }

  const handleRemoveChild = (index: number) => {
    if (expression.op === "gate") return
    const next = (expression as { children: GateExpression[] }).children.filter((_, i) => i !== index)
    if (next.length === 0) {
      onRemove?.()
      return
    }
    if (next.length === 1 && !isRoot) {
      onChange(next[0])
      return
    }
    onChange({ ...expression, children: next } as GateExpression)
  }

  const handleAddGate = () => {
    const newGate: GateExpression = { op: "gate", gate: makeDefaultGate(scope) }
    if (expression.op === "gate") {
      onChange({ op: mode === "threshold" ? "threshold" : "and", children: [expression, newGate], ...(mode === "threshold" ? { count: 1 } : {}) } as GateExpression)
    } else {
      onChange({ ...expression, children: [...(expression as { children: GateExpression[] }).children, newGate] } as GateExpression)
    }
  }

  const handleAddGroup = () => {
    if (!canNest) return
    const newGroup: GateExpression = { op: "and", children: [{ op: "gate", gate: makeDefaultGate(scope) }] }
    if (expression.op === "gate") {
      onChange({ op: "and", children: [expression, newGroup] })
    } else {
      onChange({ ...expression, children: [...(expression as { children: GateExpression[] }).children, newGroup] } as GateExpression)
    }
  }

  const isNested = depth > 0

  return (
    <div
      className={cn(
        "rounded-[var(--radius-lg)] border bg-background",
        isNested ? "border-border bg-muted/10 p-3" : "border-border-soft",
      )}
    >
      <div className={cn("flex flex-wrap items-center gap-2", isNested ? "mb-2" : "mb-3")}>
        <Select value={mode} onValueChange={handleModeChange}>
          <SelectTrigger className="h-9 w-auto gap-1 border-border-soft bg-background px-3">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="and">ALL</SelectItem>
            <SelectItem value="or">ANY</SelectItem>
            <SelectItem value="threshold">X of Y</SelectItem>
          </SelectContent>
        </Select>

        {expression.op === "threshold" ? (
          <div className="flex items-center gap-1.5">
            <Type as="span" variant="body" className="text-muted-foreground">At least</Type>
            <input
              type="number"
              min={1}
              max={expression.children.length}
              value={expression.count}
              onChange={(e) => handleThresholdCountChange(Number(e.target.value))}
              className="h-7 w-12 rounded border border-border-soft bg-background px-2 text-center text-base"
            />
            <Type as="span" variant="body" className="text-muted-foreground">
              of {expression.children.length} must match
            </Type>
          </div>
        ) : (
          <Type as="span" variant="body" className="text-muted-foreground">
            {mode === "and" ? "must match" : "can match"}
          </Type>
        )}

        {onRemove && (
          <Button
            size="icon"
            variant="ghost"
            className="ml-auto size-7 text-muted-foreground"
            onClick={onRemove}
          >
            <Trash className="size-4" />
          </Button>
        )}
      </div>

      <div className="space-y-2">
        {children.map((child, index) =>
          child.op === "gate" ? (
            <GateRequirementCard
              key={index}
              gate={child.gate}
              scope={scope}
              onChange={(gate) => handleChildChange(index, { op: "gate", gate })}
              onRemove={() => handleRemoveChild(index)}
            />
          ) : (
            <GateGroupCard
              key={index}
              expression={child}
              scope={scope}
              depth={depth + 1}
              maxDepth={maxDepth}
              onChange={(expr) => handleChildChange(index, expr)}
              onRemove={() => handleRemoveChild(index)}
            />
          ),
        )}
      </div>

      <div className="mt-2 flex flex-wrap gap-2">
        <Button variant="outline" size="sm" onClick={handleAddGate}>
          <Plus className="mr-1 size-4" />
          Add requirement
        </Button>
        {canNest && (
          <Button variant="outline" size="sm" onClick={handleAddGroup}>
            <Plus className="mr-1 size-4" />
            Add group
          </Button>
        )}
      </div>
    </div>
  )
}

interface GateRequirementCardProps {
  gate: GateAtom
  scope: GateExpressionScope
  onChange: (gate: GateAtom) => void
  onRemove: () => void
}

function GateRequirementCard({
  gate,
  scope,
  onChange,
  onRemove,
}: GateRequirementCardProps) {
  const availableAtoms = getAtomsForScope(scope)
  const isTokenGate = "chain_namespace" in gate
  const [sheetOpen, setSheetOpen] = React.useState(false)

  const handleTypeChange = (nextType: string) => {
    if ("chain_namespace" in gate || ["contract_any", "token_id_allowlist", "metadata_match", "token_balance"].includes(nextType)) {
      const newGate = makeDefaultGate(scope, nextType as GateAtom["type"])
      if (newGate) {
        onChange(newGate)
        if ("chain_namespace" in newGate) setSheetOpen(true)
      }
      return
    }
    const newGate = makeDefaultGate(scope, nextType as GateAtom["type"])
    if (newGate) onChange(newGate)
  }

  const summary = isTokenGate ? getTokenGateSummary(gate) : null

  return (
    <div className="flex flex-col gap-1 rounded-[var(--radius-lg)] border border-border-soft bg-background px-3 py-2.5 sm:flex-row sm:items-center sm:gap-2">
      <div className="flex items-center gap-2">
        <Select value={gate.type} onValueChange={handleTypeChange}>
          <SelectTrigger className="h-8 w-auto gap-1 border-0 bg-transparent px-1 text-base shadow-none">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {availableAtoms.map((atom) => (
              <SelectItem key={atom.type} value={atom.type}>
                {atom.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Button
          size="icon"
          variant="ghost"
          className="ml-auto size-7 shrink-0 text-muted-foreground sm:hidden"
          onClick={onRemove}
        >
          <Trash className="size-4" />
        </Button>
      </div>

      {isTokenGate ? (
        <button
          type="button"
          onClick={() => setSheetOpen(true)}
          className="text-start"
        >
          {summary ? (
            <Type as="span" variant="caption" className="text-muted-foreground">
              {summary}
            </Type>
          ) : (
            <Type as="span" variant="caption" className="text-warning">
              Configure
            </Type>
          )}
        </button>
      ) : (
        <GateAtomConfigInline gate={gate} onChange={onChange} />
      )}

      <Button
        size="icon"
        variant="ghost"
        className="ml-auto hidden size-7 shrink-0 text-muted-foreground sm:flex"
        onClick={onRemove}
      >
        <Trash className="size-4" />
      </Button>

      {isTokenGate && (
        <TokenGateConfigSheet
          gate={gate as Extract<GateAtom, { chain_namespace: string }>}
          onChange={onChange}
          open={sheetOpen}
          onOpenChange={setSheetOpen}
        />
      )}
    </div>
  )
}

function GateAtomConfigInline({
  gate,
  onChange,
}: {
  gate: GateAtom
  onChange: (gate: GateAtom) => void
}) {
  if (gate.type === "minimum_age") {
    return (
      <div className="flex items-center gap-1.5">
        <Type as="span" variant="caption" className="text-muted-foreground">age ≥</Type>
        <input
          type="number"
          min={1}
          max={125}
          value={gate.minimum_age}
          onChange={(e) => onChange({ ...gate, minimum_age: Number(e.target.value) })}
          className="h-7 w-14 rounded border border-border-soft bg-background px-2 text-center text-base"
        />
      </div>
    )
  }

  if (gate.type === "wallet_score") {
    return (
      <div className="flex items-center gap-1.5">
        <Type as="span" variant="caption" className="text-muted-foreground">score ≥</Type>
        <input
          type="number"
          min={0}
          max={100}
          value={gate.minimum_score}
          onChange={(e) => onChange({ ...gate, minimum_score: Number(e.target.value) })}
          className="h-7 w-14 rounded border border-border-soft bg-background px-2 text-center text-base"
        />
      </div>
    )
  }

  if (gate.type === "community_karma") {
    return (
      <div className="flex items-center gap-1.5">
        <Type as="span" variant="caption" className="text-muted-foreground">karma ≥</Type>
        <input
          type="number"
          min={0}
          value={gate.min_karma}
          onChange={(e) => onChange({ ...gate, min_karma: Number(e.target.value) })}
          className="h-7 w-14 rounded border border-border-soft bg-background px-2 text-center text-base"
        />
      </div>
    )
  }

  if (gate.type === "account_age") {
    return (
      <div className="flex items-center gap-1.5">
        <Type as="span" variant="caption" className="text-muted-foreground">days ≥</Type>
        <input
          type="number"
          min={1}
          value={gate.min_days}
          onChange={(e) => onChange({ ...gate, min_days: Number(e.target.value) })}
          className="h-7 w-14 rounded border border-border-soft bg-background px-2 text-center text-base"
        />
      </div>
    )
  }

  if (gate.type === "unique_human") {
    return (
      <Select
        value={gate.provider}
        onValueChange={(v) => onChange({ ...gate, provider: v as "very" | "self" })}
      >
        <SelectTrigger className="h-7 w-auto gap-1 border-0 bg-transparent px-1 text-base shadow-none">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="very">Very</SelectItem>
          <SelectItem value="self">Self</SelectItem>
        </SelectContent>
      </Select>
    )
  }

  return null
}

function makeDefaultGate(scope: GateExpressionScope, forceType?: GateAtom["type"]): GateAtom {
  const available = getAtomsForScope(scope)
  const type = forceType ?? available[0]?.type ?? "unique_human"

  switch (type) {
    case "unique_human":
      return { type: "unique_human", provider: "very" }
    case "minimum_age":
      return { type: "minimum_age", provider: "self", minimum_age: 18 }
    case "wallet_score":
      return { type: "wallet_score", provider: "passport", minimum_score: 20 }
    case "community_karma":
      return { type: "community_karma", min_karma: 50 }
    case "account_age":
      return { type: "account_age", min_days: 30 }
    case "community_membership":
      return { type: "community_membership" }
    case "contract_any":
      return { type: "contract_any", chain_namespace: "eip155:8453", contract_address: "" }
    case "token_id_allowlist":
      return { type: "token_id_allowlist", chain_namespace: "eip155:8453", contract_address: "", token_ids: [] }
    case "metadata_match":
      return { type: "metadata_match", chain_namespace: "eip155:8453", contract_address: "", min_quantity: 1, match: {} }
    case "token_balance":
      return { type: "token_balance", chain_namespace: "eip155:8453", contract_address: "", min_balance: 1 }
    default:
      return { type: "unique_human", provider: "very" }
  }
}
