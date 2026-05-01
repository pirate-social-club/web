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

function collectGatePolicyAtoms(expression: RecursiveGateExpression, atoms: GateAtom[]): void {
  if (expression.op === "gate" && expression.gate) {
    atoms.push(expression.gate);
    return;
  }

  for (const child of expression.children ?? []) {
    collectGatePolicyAtoms(child, atoms);
  }
}
