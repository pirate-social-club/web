"use client";

import * as React from "react";

import { Button } from "@/components/primitives/button";
import { CopyField } from "@/components/primitives/copy-field";
import { FormNote } from "@/components/primitives/form-layout";
import { defaultRouteCopy } from "../../system/route-copy-defaults";
import { CheckCircle, Clock, Info, WarningCircle } from "@phosphor-icons/react";

import type { NamespaceVerificationModalState } from "@/components/compositions/verification/verify-namespace-modal/verify-namespace-modal.types";
import { Type } from "@/components/primitives/type";

function StatusBanner({
  icon,
  title,
  description,
  tone,
}: {
  icon: React.ReactNode;
  title: string;
  description?: string;
  tone: "warning" | "info" | "success" | "destructive";
}) {
  const toneClassName = {
    warning: "border-warning/20 bg-warning/5",
    info: "border-info/20 bg-info/5",
    success: "border-success/20 bg-success/5",
    destructive: "border-destructive/20 bg-destructive/5",
  }[tone];

  const iconClassName = {
    warning: "text-warning",
    info: "text-info",
    success: "text-success",
    destructive: "text-destructive",
  }[tone];

  return (
    <div className={`flex items-start gap-3 rounded-[var(--radius-lg)] border px-4 py-3 ${toneClassName}`}>
      <span className={`mt-0.5 shrink-0 ${iconClassName}`}>{icon}</span>
      <div className="space-y-0.5">
        <Type as="p" className={iconClassName} variant="label">{title}</Type>
        {description ? <Type as="p" variant="caption">{description}</Type> : null}
      </div>
    </div>
  );
}

export type HnsVerificationMode =
  | "dns_setup_required"
  | "pirate_managed"
  | "owner_managed_txt";

export function getHnsVerificationMode(input: {
  state: NamespaceVerificationModalState;
  challengeTxtValue: string | null;
  pirateDnsAuthorityVerified: boolean | null;
  operationClass: string | null;
}): HnsVerificationMode | null {
  if (input.state === "dns_setup_required") {
    return "dns_setup_required";
  }

  if (input.challengeTxtValue) {
    return "owner_managed_txt";
  }

  if (
    input.pirateDnsAuthorityVerified === true
    || input.operationClass === "pirate_delegated_namespace"
  ) {
    return "pirate_managed";
  }

  return null;
}

export function NamespaceVerificationHnsPanel({
  challengePending,
  challengeTxtValue,
  mode,
  onAbandon,
  rootLabel,
  showAbandonAction = true,
  setupNameservers,
}: {
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
        <div className="space-y-3">
          {mode === "dns_setup_required" ? (
            <StatusBanner
              description={mc.dnsSetupNote}
              icon={<WarningCircle className="size-5" weight="fill" />}
              title="DNS setup required"
              tone="warning"
            />
          ) : challengePending ? (
            <StatusBanner
              description={mc.txtPendingNote}
              icon={<Clock className="size-5" weight="duotone" />}
              title="Propagation pending"
              tone="info"
            />
          ) : (
            <StatusBanner
              description={mc.txtVerifyNote}
              icon={<Info className="size-5" weight="fill" />}
              title="Ready to verify"
              tone="success"
            />
          )}
        </div>
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

      {mode === "owner_managed_txt" && challengeTxtValue ? (
        <div className="space-y-3">
          <FormNote>{mc.txtRecordNote}</FormNote>
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
