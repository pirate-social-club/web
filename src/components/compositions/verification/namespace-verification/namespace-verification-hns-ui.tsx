"use client";

import * as React from "react";

import { CopyField } from "@/components/primitives/copy-field";
import { FormNote } from "@/components/primitives/form-layout";
import { defaultRouteCopy } from "../../system/route-copy-defaults";

import type { NamespaceVerificationModalState } from "@/components/compositions/verification/verify-namespace-modal/verify-namespace-modal.types";
import { Type } from "@/components/primitives/type";

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
  showAbandonAction = true,
  setupNameservers,
}: {
  challengeHost: string | null;
  challengePending: boolean;
  challengeTxtValue: string | null;
  mode: HnsVerificationMode;
  onAbandon: () => void;
  rootLabel: string;
  showAbandonAction?: boolean;
  setupNameservers: string[] | null;
}) {
  const copy = defaultRouteCopy;
  const mc = copy.moderation.namespaceVerification.hns;
  const nameservers = (setupNameservers ?? []).filter((value) => value.trim().length > 0);
  const challengeName = challengeHost ?? (rootLabel.trim() ? `_pirate.${rootLabel.trim()}` : "_pirate");

  return (
    <section className="space-y-4 rounded-[var(--radius-2xl)] border border-border-soft bg-card px-5 py-5">
      {mode === "pirate_managed" ? null : (
        <FormNote>
          {mode === "dns_setup_required"
            ? mc.dnsSetupNote
            : challengePending
              ? mc.txtPendingNote
              : mc.txtVerifyNote}
        </FormNote>
      )}

      {nameservers.length > 0 ? (
        <div className="space-y-3">
          <Type as="div" variant="caption">{mc.nameserversLabel}</Type>
          <div className="space-y-2">
            {nameservers.map((value) => (
              <CopyField key={value} value={value} />
            ))}
          </div>
        </div>
      ) : null}

      {mode === "dns_setup_required" ? (
        <Type as="div" variant="caption">
          Update the root&apos;s `NS` records where you manage the Handshake parent. After that, Pirate will show the TXT record here.
        </Type>
      ) : null}

      {mode === "pirate_managed" ? (
        <div className="space-y-3">
          <div className="space-y-1.5">
            <Type as="div" variant="caption">{mc.challengeLabel}</Type>
            <CopyField value={challengeName} />
          </div>
        </div>
      ) : null}

      {mode === "owner_managed_txt" && challengeHost && challengeTxtValue ? (
        <div className="space-y-3">
          <div className="space-y-1.5">
            <Type as="div" variant="caption">{mc.hostLabel}</Type>
            <CopyField value={challengeHost} />
          </div>
          <div className="space-y-1.5">
            <Type as="div" variant="caption">{mc.valueLabel}</Type>
            <CopyField value={challengeTxtValue} />
          </div>
        </div>
      ) : null}

      {showAbandonAction ? (
        <button
          className="text-base text-muted-foreground transition-colors hover:text-foreground"
          onClick={onAbandon}
          type="button"
        >
          {copy.moderation.namespaceVerification.verifyDifferent}
        </button>
      ) : null}
    </section>
  );
}
