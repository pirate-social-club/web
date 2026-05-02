export type GateExpressionScope =
  | "membership"
  | "viewer"
  | "posting"
  | "handle_claim"
  | "handle_renewal"
  | "auction_bid"

export type GateExpression =
  | { op: "and"; children: GateExpression[] }
  | { op: "or"; children: GateExpression[] }
  | { op: "threshold"; count: number; children: GateExpression[] }
  | { op: "gate"; gate: GateAtom }

export type GateAtom =
  | { type: "unique_human"; provider: "very" | "self" }
  | { type: "minimum_age"; provider: "self"; minimum_age: number }
  | { type: "nationality"; provider: "self"; allowed: string[] }
  | { type: "gender"; provider: "self"; allowed: Array<"M" | "F"> }
  | { type: "wallet_score"; provider: "passport"; minimum_score: number }
  | { type: "contract_any"; chain_namespace: string; contract_address: string }
  | { type: "token_id_allowlist"; chain_namespace: string; contract_address: string; token_ids: string[] }
  | { type: "metadata_match"; chain_namespace: string; contract_address: string; min_quantity: number; match: Record<string, unknown> }
  | { type: "token_balance"; chain_namespace: string; contract_address: string; min_balance: number }
  | { type: "community_membership" }
  | { type: "community_karma"; min_karma: number }
  | { type: "account_age"; min_days: number }

export type GateGroupMode = "and" | "or" | "threshold"

export type GateAtomConfig = {
  type: GateAtom["type"]
  label: string
  description: string
  scopes: GateExpressionScope[]
  category: "identity" | "token" | "community" | "time"
  requiresConfig: boolean
}

export const GATE_ATOM_REGISTRY: GateAtomConfig[] = [
  { type: "unique_human", label: "Verified human", description: "Unique human verification", scopes: ["membership", "viewer", "posting", "handle_claim", "handle_renewal", "auction_bid"], category: "identity", requiresConfig: false },
  { type: "minimum_age", label: "Minimum age", description: "Self-verified age requirement", scopes: ["membership", "viewer", "posting", "handle_claim", "handle_renewal", "auction_bid"], category: "identity", requiresConfig: true },
  { type: "nationality", label: "Nationality", description: "Self-verified nationality requirement", scopes: ["membership", "viewer", "posting", "handle_claim", "handle_renewal", "auction_bid"], category: "identity", requiresConfig: true },
  { type: "gender", label: "Gender", description: "Self-verified gender requirement", scopes: ["membership", "viewer", "posting", "handle_claim", "handle_renewal", "auction_bid"], category: "identity", requiresConfig: true },
  { type: "wallet_score", label: "Wallet score", description: "Human Passport wallet score", scopes: ["membership", "viewer", "posting", "handle_claim", "handle_renewal", "auction_bid"], category: "identity", requiresConfig: true },
  { type: "contract_any", label: "Token holder", description: "Holds any token from a contract", scopes: ["membership", "handle_claim", "handle_renewal", "auction_bid"], category: "token", requiresConfig: true },
  { type: "token_id_allowlist", label: "Specific token IDs", description: "Holds one of specific token IDs", scopes: ["membership", "handle_claim", "handle_renewal", "auction_bid"], category: "token", requiresConfig: true },
  { type: "metadata_match", label: "Metadata match", description: "Token with matching metadata", scopes: ["membership", "handle_claim", "handle_renewal", "auction_bid"], category: "token", requiresConfig: true },
  { type: "token_balance", label: "Token balance", description: "Minimum token balance", scopes: ["membership", "handle_claim", "handle_renewal", "auction_bid"], category: "token", requiresConfig: true },
  { type: "community_membership", label: "Community member", description: "Must be a member of this community", scopes: ["handle_claim", "handle_renewal", "auction_bid"], category: "community", requiresConfig: false },
  { type: "community_karma", label: "Community karma", description: "Minimum community karma score", scopes: ["handle_claim", "handle_renewal", "auction_bid"], category: "community", requiresConfig: true },
  { type: "account_age", label: "Account age", description: "Minimum account age in days", scopes: ["handle_claim", "handle_renewal", "auction_bid"], category: "time", requiresConfig: true },
]

export function getAtomsForScope(scope: GateExpressionScope): GateAtomConfig[] {
  return GATE_ATOM_REGISTRY.filter((atom) => atom.scopes.includes(scope))
}

export function getAtomConfig(type: GateAtom["type"]): GateAtomConfig | undefined {
  return GATE_ATOM_REGISTRY.find((atom) => atom.type === type)
}
