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

/**
 * A hypothetical member the admin assembles, to answer "who gets in?".
 *
 * Per the gate-builder spec the simulation derives profiles from the policy's own atoms and reuses
 * policy evaluation. The earlier fixed list of single-capability personas could not represent a
 * member holding two kinds of proof, so any AND across proof kinds — and any nationality, age or
 * gender rule, for which no persona existed at all — reported "can't join" for every persona.
 *
 * Values here are real (an age, a country, a score) rather than "satisfies rule N" flags, so the
 * profile stays coherent: a 21-year-old necessarily passes an "18+" rule as well as a "21+" one.
 */
export type GateProfileDraft = {
  age: number | null;
  altcha: boolean;
  /** Quantities held per collection/predicate (see gateAssetKey). */
  assetQuantities: Record<string, number>;
  gender: string | null;
  /** A person may hold more than one humanity proof. */
  humanProviders: string[];
  nationality: string | null;
  passportScore: number | null;
};

export type GateProfileAtomResult = {
  gate: GateAtom;
  key: string;
  met: GateProfileTruth;
};

/** null means the preview cannot decide because an unrecognized atom is pivotal. */
export type GateProfileTruth = boolean | null;

export type GateProfileEvaluation = {
  atoms: GateProfileAtomResult[];
  joins: GateProfileTruth;
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

export function createGateProfileDraft(): GateProfileDraft {
  return {
    age: null,
    altcha: false,
    assetQuantities: {},
    gender: null,
    humanProviders: [],
    nationality: null,
    passportScore: null,
  };
}

/** Stable identity for one asset balance shared by every threshold over that collection/predicate. */
export function gateAssetKey(gate: GateAtom): string {
  if (gate.type !== "erc721_holding" && gate.type !== "erc721_inventory_match") {
    return "";
  }
  return [
    gate.type,
    atomChainNamespace(gate),
    atomContractAddress(gate).toLowerCase(),
    stableMatchKey(gate),
  ].join(":");
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

/** Stable per-requirement identity. Thresholds remain distinct while sharing one asset balance. */
export function gateAtomKey(gate: GateAtom): string {
  switch (gate.type) {
    case "altcha_pow":
      return "altcha_pow";
    case "unique_human":
      return `unique_human:${gate.provider ?? "any"}`;
    case "wallet_score":
      return `wallet_score:${gate.provider ?? "passport"}:${gate.minimum_score ?? 0}`;
    case "minimum_age":
      return `minimum_age:${gate.minimum_age ?? 18}`;
    case "nationality":
      return `nationality:${sortedAllowed(gate.allowed)}`;
    case "gender":
      return `gender:${sortedAllowed(gate.allowed)}`;
    case "erc721_holding":
      return `${gateAssetKey(gate)}:minimum=${gateAssetMinimum(gate)}`;
    case "erc721_inventory_match":
      return `${gateAssetKey(gate)}:minimum=${gateAssetMinimum(gate)}`;
    default:
      return `unknown:${JSON.stringify(gate)}`;
  }
}

/** Every distinct atom in the tree, in tree order — the requirements a profile is tested against. */
export function collectGateBuilderAtoms(root: GateBuilderGroupDraft): GateAtom[] {
  const seen = new Set<string>();
  const atoms: GateAtom[] = [];

  const walk = (node: GateBuilderDraftNode) => {
    if (node.kind === "rule") {
      const key = gateAtomKey(node.gate);
      if (!seen.has(key)) {
        seen.add(key);
        atoms.push(node.gate);
      }
      return;
    }
    node.children.forEach(walk);
  };

  walk(root);
  return atoms;
}

export function profileSatisfiesGate(profile: GateProfileDraft, gate: GateAtom): GateProfileTruth {
  switch (gate.type) {
    case "altcha_pow":
      return profile.altcha;
    case "unique_human":
      return gate.provider
        ? profile.humanProviders.includes(gate.provider)
        : profile.humanProviders.length > 0;
    case "wallet_score":
      return profile.passportScore != null && profile.passportScore >= (gate.minimum_score ?? 0);
    case "minimum_age":
      return profile.age != null && profile.age >= (gate.minimum_age ?? 18);
    case "nationality":
      // An empty allowed list means "any verified nationality", matching API evaluation.
      return profile.nationality != null
        && ((gate.allowed ?? []).length === 0 || (gate.allowed ?? []).includes(profile.nationality));
    case "gender":
      return profile.gender != null && (gate.allowed ?? []).includes(profile.gender);
    case "erc721_holding":
      return (profile.assetQuantities[gateAssetKey(gate)] ?? 0) >= gateAssetMinimum(gate);
    case "erc721_inventory_match":
      return (profile.assetQuantities[gateAssetKey(gate)] ?? 0) >= gateAssetMinimum(gate);
    default:
      // The client cannot claim either outcome for a requirement it cannot interpret.
      return null;
  }
}

/** Kleene evaluation: unknown only propagates when it can change the final result. */
export function evaluateGateExpressionPreview(
  expression: GateExpression,
  satisfies: (gate: GateAtom) => GateProfileTruth,
): GateProfileTruth {
  const recursive = expression as RecursiveGateExpression;
  if (recursive.op === "gate") {
    return satisfies(recursive.gate);
  }

  const results = recursive.children.map((child) => (
    evaluateGateExpressionPreview(child as GateExpression, satisfies)
  ));
  if (recursive.op === "and") {
    if (results.includes(false)) return false;
    return results.includes(null) ? null : true;
  }
  if (results.includes(true)) return true;
  return results.includes(null) ? null : false;
}

/**
 * Evaluates a profile against the whole tree, reusing the same expression evaluation the policy
 * uses. A draft with no rules serializes to a null policy: an open community, so everyone joins.
 */
export function evaluateGateProfile(
  root: GateBuilderGroupDraft,
  profile: GateProfileDraft,
): GateProfileEvaluation {
  const policy = serializeGateBuilderTreeDraft(root);
  const atoms = collectGateBuilderAtoms(root).map((gate) => ({
    gate,
    key: gateAtomKey(gate),
    met: profileSatisfiesGate(profile, gate),
  }));

  return {
    atoms,
    joins: policy
      ? evaluateGateExpressionPreview(policy.expression, (gate) => profileSatisfiesGate(profile, gate))
      : true,
  };
}

function sortedAllowed(allowed: readonly string[] | undefined): string {
  return [...(allowed ?? [])].sort().join(",");
}

function atomChainNamespace(gate: GateAtom): string {
  return "chain_namespace" in gate && typeof gate.chain_namespace === "string"
    ? gate.chain_namespace
    : "eip155:1";
}

function atomContractAddress(gate: GateAtom): string {
  return "contract_address" in gate && typeof gate.contract_address === "string"
    ? gate.contract_address
    : "";
}

function stableMatchKey(gate: GateAtom): string {
  const match = "match" in gate && gate.match && typeof gate.match === "object"
    ? gate.match as Record<string, unknown>
    : {};
  return JSON.stringify(Object.fromEntries(
    Object.keys(match)
      .sort()
      .map((key) => [key, match[key]]),
  ));
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
