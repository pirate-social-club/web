import type { GateAtom, GateExpression, GatePolicy } from "@pirate/api-contracts";

type RecursiveGateExpression = Omit<GateExpression, "children"> & {
  children?: RecursiveGateExpression[];
};

export function flattenGatePolicyAtoms(policy: GatePolicy | null | undefined): GateAtom[] {
  if (!policy) return [];

  const atoms: GateAtom[] = [];
  collectGatePolicyAtoms(policy.expression as RecursiveGateExpression, atoms);
  return atoms;
}

export function getGatePolicyMatchMode(policy: GatePolicy | null | undefined): "all" | "any" {
  return policy?.expression.op === "or" ? "any" : "all";
}

export function isFlatOrGateExpression(expression: unknown): boolean {
  if (!expression || typeof expression !== "object" || (expression as { op?: unknown }).op !== "or") {
    return false;
  }
  const children = (expression as { children?: unknown }).children;
  return Array.isArray(children) && children.length > 1 && children.every((child) =>
    Boolean(child) && typeof child === "object" && (child as { op?: unknown }).op === "gate"
  );
}

export function areGatePoliciesEqual(
  left: GatePolicy | null | undefined,
  right: GatePolicy | null | undefined,
): boolean {
  return areStableJsonValuesEqual(left ?? null, right ?? null);
}

export function areStableJsonValuesEqual(left: unknown, right: unknown): boolean {
  return JSON.stringify(normalizePolicyValue(left)) === JSON.stringify(normalizePolicyValue(right));
}

export function isGatePolicyProjectionLossy(
  originalPolicy: GatePolicy | null | undefined,
  projectedPolicy: GatePolicy | null | undefined,
): boolean {
  return originalPolicy != null && !areGatePoliciesEqual(originalPolicy, projectedPolicy);
}

function collectGatePolicyAtoms(expression: RecursiveGateExpression, atoms: GateAtom[]): void {
  if (expression.op === "gate" && expression.gate) {
    atoms.push(expression.gate);
    return;
  }

  for (const child of expression.children ?? []) {
    collectGatePolicyAtoms(child, atoms);
  }
}

function normalizePolicyValue(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map(normalizePolicyValue);
  }
  if (!value || typeof value !== "object") {
    return value;
  }

  const normalized: Record<string, unknown> = {};
  for (const key of Object.keys(value).sort()) {
    normalized[key] = normalizePolicyValue((value as Record<string, unknown>)[key]);
  }
  return normalized;
}
