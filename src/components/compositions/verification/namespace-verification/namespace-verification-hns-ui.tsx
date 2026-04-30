"use client";

import * as React from "react";

import { Button } from "@/components/primitives/button";
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
        <div className="border-t border-border-soft pt-4">
          <Button
            onClick={onAbandon}
            size="sm"
            variant="ghost"
          >
            {copy.moderation.namespaceVerification.verifyDifferent}
          </Button>
        </div>
      ) : null}
    </section>
  );
}
