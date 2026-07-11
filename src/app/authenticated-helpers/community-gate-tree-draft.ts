import type { GateAtom, GateExpression, GatePolicy } from "@pirate/api-contracts";
import { areGatePoliciesEqual } from "@/lib/gate-policy-utils";

export const GATE_POLICY_MAX_ATOMS = 20;
export const GATE_POLICY_MAX_DEPTH = 4;

export type GateBuilderGroupOp = "and" | "or";

export type GateBuilderRuleDraft = {
  kind: "rule";
  gate: GateAtom;
};

export type GateBuilderGroupDraft = {
  kind: "group";
  op: GateBuilderGroupOp;
  children: GateBuilderDraftNode[];
};

export type GateBuilderDraftNode = GateBuilderGroupDraft | GateBuilderRuleDraft;

export type GateBuilderBudget = {
  atoms: number;
  depth: number;
};

export type GateBuilderPersonaResult = {
  id: string;
  joins: boolean;
  label: string;
};

export type GateBuilderPersona = {
  id: string;
  label: string;
  satisfies: (gate: GateAtom) => boolean;
};

type RecursiveGateExpression =
  | {
    op: "gate";
    gate: GateAtom;
  }
  | {
    op: GateBuilderGroupOp;
    children: RecursiveGateExpression[];
  };

export function createEmptyGateBuilderDraft(op: GateBuilderGroupOp = "and"): GateBuilderGroupDraft {
  return { kind: "group", op, children: [] };
}

export function parseGatePolicyToTreeDraft(policy: GatePolicy | null | undefined): GateBuilderGroupDraft {
  if (!policy?.expression) {
    return createEmptyGateBuilderDraft();
  }

  const parsed = expressionToDraftNode(policy.expression as RecursiveGateExpression);
  if (!parsed) {
    return createEmptyGateBuilderDraft();
  }

  if (parsed.kind === "group") {
    return parsed;
  }

  return {
    kind: "group",
    op: "and",
    children: [parsed],
  };
}

export function serializeGateBuilderTreeDraft(root: GateBuilderGroupDraft): GatePolicy | null {
  const expression = draftNodeToExpression(root);
  return expression ? { version: 1, expression } : null;
}

export function getGateBuilderBudget(root: GateBuilderGroupDraft): GateBuilderBudget {
  const expression = draftNodeToExpression(root);
  if (!expression) {
    return { atoms: 0, depth: 0 };
  }

  return getExpressionBudget(expression as RecursiveGateExpression);
}

export function isGateBuilderDraftWithinLimits(root: GateBuilderGroupDraft): boolean {
  const budget = getGateBuilderBudget(root);
  return budget.atoms <= GATE_POLICY_MAX_ATOMS && budget.depth <= GATE_POLICY_MAX_DEPTH;
}

export function gateTreeDraftMatchesPolicy(
  loadedPolicy: GatePolicy | null | undefined,
  currentDraft: GateBuilderGroupDraft,
): boolean {
  const canonicalLoadedPolicy = serializeGateBuilderTreeDraft(parseGatePolicyToTreeDraft(loadedPolicy));
  return areGatePoliciesEqual(canonicalLoadedPolicy, serializeGateBuilderTreeDraft(currentDraft));
}

export function evaluateGateExpression(
  expression: GateExpression,
  satisfies: (gate: GateAtom) => boolean,
): boolean {
  const recursive = expression as RecursiveGateExpression;
  if (recursive.op === "gate") {
    return satisfies(recursive.gate);
  }

  if (recursive.op === "and") {
    return recursive.children.every((child) => evaluateGateExpression(child as GateExpression, satisfies));
  }

  return recursive.children.some((child) => evaluateGateExpression(child as GateExpression, satisfies));
}

export function captchaAloneAdmits(policy: GatePolicy | null | undefined): boolean {
  return Boolean(policy && evaluateGateExpression(policy.expression, (gate) => gate.type === "altcha_pow"));
}

export function simulateGateBuilderPersonas(
  policy: GatePolicy | null | undefined,
  personas: readonly GateBuilderPersona[] = DEFAULT_GATE_BUILDER_PERSONAS,
): GateBuilderPersonaResult[] {
  return personas.map((persona) => ({
    id: persona.id,
    joins: Boolean(policy && evaluateGateExpression(policy.expression, persona.satisfies)),
    label: persona.label,
  }));
}

export const DEFAULT_GATE_BUILDER_PERSONAS: GateBuilderPersona[] = [
  {
    id: "bot_captcha",
    label: "A bot with no proofs that completes the browser challenge",
    satisfies: (gate) => gate.type === "altcha_pow",
  },
  {
    id: "self_human",
    label: "Verified human (Self.xyz)",
    satisfies: (gate) => gate.type === "unique_human" && gate.provider === "self",
  },
  {
    id: "very_human",
    label: "Verified human (Very palm scan)",
    satisfies: (gate) => gate.type === "unique_human" && gate.provider === "very",
  },
  {
    id: "passport_score_20",
    label: "Wallet with Passport score 20",
    satisfies: (gate) =>
      gate.type === "wallet_score"
      && gate.provider === "passport"
      && typeof gate.minimum_score === "number"
      && gate.minimum_score <= 20,
  },
  {
    id: "nft_holder",
    label: "Holder of the required NFT",
    satisfies: (gate) => gate.type === "erc721_holding" || gate.type === "erc721_inventory_match",
  },
];

function expressionToDraftNode(expression: RecursiveGateExpression | Record<string, unknown>): GateBuilderDraftNode | null {
  if (expression.op === "gate") {
    return isGateAtomLike(expression.gate) ? { kind: "rule", gate: expression.gate } : null;
  }

  if (expression.op !== "and" && expression.op !== "or") {
    return null;
  }

  const children = Array.isArray(expression.children) ? expression.children : [];
  const draftChildren = children
    .map(expressionToDraftNode)
    .filter((child): child is GateBuilderDraftNode => child != null);

  return {
    kind: "group",
    op: expression.op,
    children: draftChildren,
  };
}

function draftNodeToExpression(node: GateBuilderDraftNode): GateExpression | null {
  if (node.kind === "rule") {
    return {
      op: "gate",
      gate: node.gate,
    };
  }

  const children = node.children
    .map(draftNodeToExpression)
    .filter((child): child is GateExpression => child != null)
    .flatMap((child) => {
      if (child.op === node.op && child.children) {
        return child.children as GateExpression[];
      }
      return [child];
    });

  if (children.length === 0) {
    return null;
  }

  if (children.length === 1) {
    return children[0] ?? null;
  }

  return {
    op: node.op,
    children,
  };
}

function getExpressionBudget(expression: RecursiveGateExpression): GateBuilderBudget {
  if (expression.op === "gate") {
    return { atoms: 1, depth: 1 };
  }

  return expression.children.reduce<GateBuilderBudget>((budget, child) => {
    const childBudget = getExpressionBudget(child);
    return {
      atoms: budget.atoms + childBudget.atoms,
      depth: Math.max(budget.depth, childBudget.depth + 1),
    };
  }, { atoms: 0, depth: 1 });
}

function isGateAtomLike(value: unknown): value is GateAtom {
  return Boolean(
    value
      && typeof value === "object"
      && typeof (value as { type?: unknown }).type === "string",
  );
}
