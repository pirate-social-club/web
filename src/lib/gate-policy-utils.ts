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

export function areGatePoliciesEqual(
  left: GatePolicy | null | undefined,
  right: GatePolicy | null | undefined,
): boolean {
  return JSON.stringify(left ?? null) === JSON.stringify(right ?? null);
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
