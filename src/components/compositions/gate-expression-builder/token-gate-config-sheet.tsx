"use client"

import * as React from "react"
import { isAddress } from "viem"

import { Button } from "@/components/primitives/button"
import { Input } from "@/components/primitives/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/primitives/select"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/primitives/sheet"
import { FormFieldLabel, FormNote } from "@/components/primitives/form-layout"
import { Type } from "@/components/primitives/type"
import { cn } from "@/lib/utils"
import type { GateAtom } from "./gate-expression-builder.types"

const CHAIN_OPTIONS = [
  { value: "eip155:1", label: "Ethereum" },
  { value: "eip155:8453", label: "Base" },
  { value: "eip155:137", label: "Polygon" },
  { value: "eip155:10", label: "Optimism" },
  { value: "eip155:42161", label: "Arbitrum" },
  { value: "eip155:7777777", label: "MegaETH" },
] as const

const TOKEN_GATE_TYPES = [
  { value: "contract_any", label: "Token holder" },
  { value: "metadata_match", label: "Metadata match" },
  { value: "token_id_allowlist", label: "Specific token IDs" },
  { value: "token_balance", label: "Token balance" },
] as const

type TokenGateAtom = Extract<GateAtom, { chain_namespace: string }>

export interface TokenGateConfigSheetProps {
  gate: TokenGateAtom
  onChange: (gate: GateAtom) => void
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function TokenGateConfigSheet({
  gate,
  onChange,
  open,
  onOpenChange,
}: TokenGateConfigSheetProps) {
  const [draft, setDraft] = React.useState<TokenGateAtom>(gate)

  React.useEffect(() => {
    if (open) setDraft(gate)
  }, [open, gate])

  const addressValid = !draft.contract_address || isAddress(draft.contract_address)
  const hasAddress = Boolean(draft.contract_address?.trim())

  const handleDone = () => {
    if (!addressValid || !hasAddress) return
    onChange(draft)
    onOpenChange(false)
  }

  const updateDraft = (partial: Partial<TokenGateAtom>) => {
    setDraft((prev) => ({ ...prev, ...partial } as TokenGateAtom))
  }

  const handleTypeChange = (nextType: string) => {
    const base = {
      chain_namespace: draft.chain_namespace,
      contract_address: draft.contract_address,
    }
    switch (nextType) {
      case "contract_any":
        setDraft({ type: "contract_any", ...base })
        break
      case "metadata_match":
        setDraft({
          type: "metadata_match",
          ...base,
          min_quantity: draft.type === "metadata_match" ? draft.min_quantity : 1,
          match: draft.type === "metadata_match" ? draft.match : {},
        })
        break
      case "token_id_allowlist":
        setDraft({
          type: "token_id_allowlist",
          ...base,
          token_ids: draft.type === "token_id_allowlist" ? draft.token_ids : [],
        })
        break
      case "token_balance":
        setDraft({
          type: "token_balance",
          ...base,
          min_balance: draft.type === "token_balance" ? draft.min_balance : 1,
        })
        break
    }
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="flex w-full flex-col p-0 sm:max-w-md">
        <SheetHeader className="shrink-0 px-6 pb-4 pt-6">
          <SheetTitle>Token gate config</SheetTitle>
          <SheetDescription>Configure the token requirement for this gate.</SheetDescription>
        </SheetHeader>

        <div className="min-h-0 flex-1 space-y-5 overflow-y-auto px-6 py-2">
          <div className="space-y-2">
            <FormFieldLabel label="Gate type" />
            <Select value={draft.type} onValueChange={handleTypeChange}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {TOKEN_GATE_TYPES.map((t) => (
                  <SelectItem key={t.value} value={t.value}>
                    {t.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <FormFieldLabel label="Chain" />
            <Select
              value={draft.chain_namespace}
              onValueChange={(v) => updateDraft({ chain_namespace: v })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {CHAIN_OPTIONS.map((c) => (
                  <SelectItem key={c.value} value={c.value}>
                    {c.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <FormFieldLabel label="Contract address" />
            <Input
              placeholder="0x..."
              value={draft.contract_address}
              onChange={(e) => updateDraft({ contract_address: e.target.value })}
            />
            {!addressValid && (
              <FormNote tone="destructive">Invalid address</FormNote>
            )}
          </div>

          {draft.type === "metadata_match" && (
            <MetadataMatchFields
              minQuantity={draft.min_quantity}
              match={draft.match}
              onChange={(min_quantity, match) => setDraft({ ...draft, min_quantity, match } as TokenGateAtom)}
            />
          )}

          {draft.type === "token_id_allowlist" && (
            <TokenIdAllowlistFields
              tokenIds={draft.token_ids}
              onChange={(token_ids) => setDraft({ ...draft, token_ids } as TokenGateAtom)}
            />
          )}

          {draft.type === "token_balance" && (
            <div className="space-y-2">
              <FormFieldLabel label="Minimum balance" />
              <Input
                type="number"
                min={1}
                value={draft.min_balance}
                onChange={(e) =>
                  setDraft({ ...draft, min_balance: Math.max(1, Number(e.target.value)) } as TokenGateAtom)
                }
              />
            </div>
          )}
        </div>

        <SheetFooter className="sticky bottom-0 shrink-0 border-t border-border-soft bg-card px-6 py-4">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button disabled={!addressValid || !hasAddress} onClick={handleDone}>
            Done
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  )
}

function MetadataMatchFields({
  minQuantity,
  match,
  onChange,
}: {
  minQuantity: number
  match: Record<string, unknown>
  onChange: (min_quantity: number, match: Record<string, unknown>) => void
}) {
  const [filterKey, setFilterKey] = React.useState("")
  const [filterValue, setFilterValue] = React.useState("")

  const addFilter = () => {
    const key = filterKey.trim()
    const value = filterValue.trim()
    if (!key) return
    onChange(minQuantity, { ...match, [key]: value })
    setFilterKey("")
    setFilterValue("")
  }

  const removeFilter = (key: string) => {
    const next = { ...match }
    delete next[key]
    onChange(minQuantity, next)
  }

  return (
    <div className="space-y-3">
      <div className="space-y-2">
        <FormFieldLabel label="Minimum quantity" />
        <Input
          type="number"
          min={1}
          value={minQuantity}
          onChange={(e) => onChange(Math.max(1, Number(e.target.value)), match)}
        />
      </div>

      <div className="space-y-2">
        <FormFieldLabel label="Metadata filters" />
        {Object.entries(match).map(([key, value]) => (
          <div key={key} className="flex items-center gap-2">
            <div className="flex flex-1 items-center gap-1.5 rounded border border-border-soft bg-muted/30 px-3 py-1.5">
              <Type as="span" variant="label">{key}</Type>
              <Type as="span" variant="caption" className="text-muted-foreground">=</Type>
              <Type as="span" variant="label">{String(value)}</Type>
            </div>
            <Button
              size="icon"
              variant="ghost"
              className="size-7 shrink-0 text-muted-foreground"
              onClick={() => removeFilter(key)}
            >
              &times;
            </Button>
          </div>
        ))}
        <div className="flex items-end gap-2">
          <div className="flex-1 space-y-1">
            <Input
              placeholder="Key (e.g. franchise)"
              value={filterKey}
              onChange={(e) => setFilterKey(e.target.value)}
            />
          </div>
          <div className="flex-1 space-y-1">
            <Input
              placeholder="Value (e.g. pokemon)"
              value={filterValue}
              onChange={(e) => setFilterValue(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault()
                  addFilter()
                }
              }}
            />
          </div>
          <Button size="sm" variant="outline" onClick={addFilter} disabled={!filterKey.trim()}>
            Add
          </Button>
        </div>
      </div>
    </div>
  )
}

function TokenIdAllowlistFields({
  tokenIds,
  onChange,
}: {
  tokenIds: string[]
  onChange: (token_ids: string[]) => void
}) {
  const [text, setText] = React.useState(tokenIds.join(", "))

  React.useEffect(() => {
    setText(tokenIds.join(", "))
  }, [tokenIds])

  return (
    <div className="space-y-2">
      <FormFieldLabel label="Token IDs" />
      <Input
        placeholder="1, 42, 999"
        value={text}
        onChange={(e) => {
          setText(e.target.value)
          const ids = e.target.value
            .split(",")
            .map((s) => s.trim())
            .filter(Boolean)
          onChange(ids)
        }}
      />
      <FormNote>Comma-separated list of token IDs.</FormNote>
    </div>
  )
}

export function getTokenGateSummary(gate: GateAtom): string | null {
  if (!("chain_namespace" in gate)) return null
  const tokenGate = gate as TokenGateAtom
  if (!tokenGate.contract_address?.trim()) return null

  const chain = CHAIN_OPTIONS.find((c) => c.value === tokenGate.chain_namespace)
  const chainLabel = chain?.label ?? tokenGate.chain_namespace.replace("eip155:", "")
  const addr = `${tokenGate.contract_address.slice(0, 6)}...${tokenGate.contract_address.slice(-4)}`

  if (tokenGate.type === "metadata_match") {
    const matchEntries = Object.entries(tokenGate.match)
    const matchLabel = matchEntries.length > 0 ? matchEntries.map(([k, v]) => `${k}=${v}`).join(", ") : null
    return matchLabel ? `${chainLabel} · ${addr} · ${matchLabel}` : `${chainLabel} · ${addr}`
  }

  if (tokenGate.type === "token_id_allowlist") {
    const count = tokenGate.token_ids.length
    return `${chainLabel} · ${addr} · ${count} ID${count !== 1 ? "s" : ""}`
  }

  if (tokenGate.type === "token_balance") {
    return `${chainLabel} · ${addr} · ≥${tokenGate.min_balance}`
  }

  return `${chainLabel} · ${addr}`
}
