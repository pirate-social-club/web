"use client";

import * as React from "react";

import { CopyField } from "@/components/primitives/copy-field";
import { FormNote } from "@/components/primitives/form-layout";

import type { NamespaceVerificationModalState } from "@/components/compositions/verify-namespace-modal/verify-namespace-modal.types";

export type HnsVerificationMode =
  | "dns_setup_required"
  | "pirate_managed"
  | "owner_managed_txt";

export function getHnsVerificationMode(input: {
  state: NamespaceVerificationModalState;
  challengeHost: string | null;
  challengeTxtValue: string | null;
  pirateDnsAuthorityVerified: boolean | null;
  operationClass: string | null;
}): HnsVerificationMode | null {
  if (input.state === "dns_setup_required") {
    return "dns_setup_required";
  }

  if (
    input.pirateDnsAuthorityVerified === true
    || input.operationClass === "pirate_delegated_namespace"
  ) {
    return "pirate_managed";
  }

  if (input.challengeHost && input.challengeTxtValue) {
    return "owner_managed_txt";
  }

  return null;
}

export function NamespaceVerificationHnsPanel({
  challengeHost,
  challengePending,
  challengeTxtValue,
  mode,
  onAbandon,
  rootLabel,
  setupNameservers,
}: {
  challengeHost: string | null;
  challengePending: boolean;
  challengeTxtValue: string | null;
  mode: HnsVerificationMode;
  onAbandon: () => void;
  rootLabel: string;
  setupNameservers: string[] | null;
}) {
  const nameservers = (setupNameservers ?? []).filter((value) => value.trim().length > 0);
  const challengeName = challengeHost ?? (rootLabel.trim() ? `_pirate.${rootLabel.trim()}` : "_pirate");

  return (
    <section className="space-y-4 rounded-[var(--radius-2xl)] border border-border-soft bg-card px-5 py-5">
      <FormNote>
        {mode === "dns_setup_required"
          ? "Set nameservers first. Parent-side TXT values do not create the delegated _pirate record."
          : mode === "pirate_managed"
            ? challengePending
              ? "Pirate is serving the TXT challenge from the delegated zone. Wait for propagation, then check again."
              : "Delegation is live. Pirate serves the TXT challenge for you."
            : challengePending
              ? "TXT propagation is still pending."
              : "Add this TXT record on your authoritative DNS, then verify."}
      </FormNote>

      {nameservers.length > 0 ? (
        <div className="space-y-3">
          <div className="text-base text-muted-foreground">Nameservers</div>
          <div className="space-y-2">
            {nameservers.map((value) => (
              <CopyField key={value} value={value} />
            ))}
          </div>
        </div>
      ) : null}

      {mode === "dns_setup_required" ? (
        <div className="text-base text-muted-foreground">
          Update the root&apos;s `NS` records where you manage the Handshake parent. After delegation is live, Pirate will publish the TXT challenge.
        </div>
      ) : null}

      {mode === "pirate_managed" ? (
        <div className="space-y-3">
          <div className="space-y-1.5">
            <div className="text-base text-muted-foreground">Challenge</div>
            <CopyField value={challengeName} />
          </div>
        </div>
      ) : null}

      {mode === "owner_managed_txt" && challengeHost && challengeTxtValue ? (
        <div className="space-y-3">
          <div className="space-y-1.5">
            <div className="text-base text-muted-foreground">Host</div>
            <CopyField value={challengeHost} />
          </div>
          <div className="space-y-1.5">
            <div className="text-base text-muted-foreground">Value</div>
            <CopyField value={challengeTxtValue} />
          </div>
        </div>
      ) : null}

      <button
        className="text-base text-muted-foreground transition-colors hover:text-foreground"
        onClick={onAbandon}
        type="button"
      >
        Verify a different namespace
      </button>
    </section>
  );
}
