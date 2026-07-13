import type { GateAtom, GateExpression, GatePolicy } from "@pirate/api-contracts";
import { areGatePoliciesEqual } from "@/lib/gate-policy-utils";
import { isValidGateAtom } from "@/lib/gate-atom-validation";

export const GATE_POLICY_MAX_ATOMS = 20;
export const GATE_POLICY_MAX_DEPTH = 4;
export const PASSPORT_SCORE_FLOOR = 20;

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

/** Every rule in the tree passes the client mirror of the API's atom validation. */
export function gateBuilderDraftAtomsAreValid(root: GateBuilderGroupDraft): boolean {
  const isValidNode = (node: GateBuilderDraftNode): boolean => node.kind === "rule"
    ? isValidGateAtom(node.gate)
    : node.children.every(isValidNode);

  return isValidNode(root);
}

/**
 * The save guard for the tree editor.
 *
 * Limits alone are not enough: the API also validates every atom, so a draft can be within the
 * atom/depth budget and still be rejected (e.g. a card filter with no franchise or subject).
 */
export function isGateBuilderDraftSavable(root: GateBuilderGroupDraft): boolean {
  return serializeGateBuilderTreeDraft(root) != null
    && isGateBuilderDraftWithinLimits(root)
    && gateBuilderDraftAtomsAreValid(root);
}

export function normalizePassportMinimumScore(value: number): number {
  if (!Number.isFinite(value)) {
    return PASSPORT_SCORE_FLOOR;
  }
  return Math.min(100, Math.max(PASSPORT_SCORE_FLOOR, Math.trunc(value)));
}

export function gateTreeDraftMatchesPolicy(
  loadedPolicy: GatePolicy | null | undefined,
  currentDraft: GateBuilderGroupDraft,
): boolean {
  const canonicalLoadedPolicy = serializeGateBuilderTreeDraft(parseGatePolicyToTreeDraft(loadedPolicy));
  return areGatePoliciesEqual(canonicalLoadedPolicy, serializeGateBuilderTreeDraft(currentDraft));
}

export function gatePolicyHasUnsupportedExpressionNodes(policy: GatePolicy | null | undefined): boolean {
  if (!policy?.expression) {
    return false;
  }
  return expressionHasUnsupportedNodes(policy.expression as RecursiveGateExpression | Record<string, unknown>);
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

export function gateAssetMinimum(gate: GateAtom): number {
  if (gate.type === "erc721_inventory_match") {
    return gate.min_quantity ?? 1;
  }
  if (gate.type === "erc721_holding") {
    const minCount = (gate as GateAtom & { min_count?: unknown }).min_count;
    return typeof minCount === "number" ? minCount : 1;
  }
  return 0;
}

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

function expressionHasUnsupportedNodes(expression: RecursiveGateExpression | Record<string, unknown>): boolean {
  if (expression.op === "gate") {
    return !isGateAtomLike(expression.gate);
  }
  if (expression.op !== "and" && expression.op !== "or") {
    return true;
  }
  if (!Array.isArray(expression.children) || expression.children.length === 0) {
    return true;
  }
  return expression.children.some((child) => (
    !child || typeof child !== "object" || expressionHasUnsupportedNodes(child as Record<string, unknown>)
  ));
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
