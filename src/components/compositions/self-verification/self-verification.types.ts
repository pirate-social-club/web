import type { ReactNode } from "react";

export type SelfVerificationPhase =
  | "sign_in"
  | "ready"
  | "waiting"
  | "verified"
  | "error";

export type SelfVerificationEntry =
  | { kind: "qr"; content: ReactNode }
  | { kind: "link"; label: string; onClick: () => void }
  | { kind: "none" };

export interface SelfVerificationActions {
  primary?: { label: string; onClick: () => void };
  footer?: { label: string; onClick: () => void };
}

export interface SelfVerificationProps {
  phase: SelfVerificationPhase;
  title: string;
  description?: string;
  statusNote?: string;
  errorTitle?: string;
  errorBody?: string;
  entry?: SelfVerificationEntry;
  actions: SelfVerificationActions;
}
