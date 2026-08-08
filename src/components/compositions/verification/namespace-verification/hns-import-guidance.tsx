"use client";

import * as React from "react";
import { Check, CheckCircle, Clock, Copy, WarningCircle } from "@phosphor-icons/react";

import { Button } from "@/components/primitives/button";
import { FormNote } from "@/components/primitives/form-layout";
import { Type } from "@/components/primitives/type";
import { useResettableTimeout } from "@/hooks/use-resettable-timeout";
import { cn } from "@/lib/utils";
import type {
  HnsImportChallengePayload,
  HnsRawResourceRecord,
} from "@/components/compositions/verification/verify-namespace-modal/verify-namespace-modal.types";

type ImportStage = "publish" | "watch" | "commit" | "compare" | "observe" | "done";

// Record types that form-based publishers (e.g. Bob Wallet's record editor:
// type dropdown + single value input) can represent exactly.
const HNS_FORM_TYPES = new Set(["NS", "TXT", "DS", "GLUE4", "GLUE6", "SYNTH4", "SYNTH6"]);

export type HnsRecordView =
  | { kind: "standard"; type: string; value: string }
  | { kind: "advanced"; type: string; detail: string };

// Per-field value accepted by form-based publishers for a supported type.
export function copyableHnsRecordValue(record: HnsRawResourceRecord): string {
  const type = typeof record.type === "string" ? record.type : "UNKNOWN";
  if (type === "NS") return String(record.ns ?? "");
  if (type === "TXT" && Array.isArray(record.txt) && record.txt.length === 1) {
    return String(record.txt[0] ?? "");
  }
  if (type === "DS") {
    return `${String(record.keyTag ?? "")} ${String(record.algorithm ?? "")} ${String(record.digestType ?? "")} ${String(record.digest ?? "")}`;
  }
  if ((type === "GLUE4" || type === "GLUE6") && record.ns != null) {
    return `${String(record.ns)} ${String(record.address ?? "")}`;
  }
  if ((type === "SYNTH4" || type === "SYNTH6") && record.address != null) {
    return String(record.address);
  }
  return JSON.stringify(record);
}

// How a record can honestly be presented: a fixed type label plus the exact
// value to enter, or an unsupported record that no publishing form can edit
// safely (unknown types, multi-chunk TXT).
export function describeHnsRecord(record: HnsRawResourceRecord): HnsRecordView {
  const type = typeof record.type === "string" ? record.type : "UNKNOWN";
  if (type === "TXT" && Array.isArray(record.txt) && record.txt.length > 1) {
    return { kind: "advanced", type, detail: `TXT (${record.txt.length} chunks)` };
  }
  if (HNS_FORM_TYPES.has(type)) {
    return { kind: "standard", type, value: copyableHnsRecordValue(record) };
  }
  return { kind: "advanced", type, detail: `${type} record` };
}

// Unsupported records cannot be recreated in Bob Wallet, and a Handshake
// UPDATE replaces the whole resource, so self-service publishing would drop
// or alter them. The publish step must be blocked, not annotated.
export function hnsImportHasUnsupportedRecords(payload: HnsImportChallengePayload): boolean {
  return payload.publish_plan.replacement_records.some(
    (record) => describeHnsRecord(record).kind === "advanced",
  );
}

function approximateBoundaryEta(currentHeight: number, targetHeight: number): string {
  const blocks = Math.max(0, targetHeight - currentHeight + 1);
  const minutes = blocks * 10;
  if (minutes < 60) return `about ${minutes} minutes`;
  const hours = Math.ceil(minutes / 60);
  return `about ${hours} ${hours === 1 ? "hour" : "hours"}`;
}

function currentStage(payload: HnsImportChallengePayload): ImportStage {
  switch (payload.observation?.state) {
    case "resource_mismatch": return "compare";
    case "pending_tree_commit": return "commit";
    case "delegation_not_secure": return "observe";
    case "secure": return "done";
    case "waiting_for_update":
    default: return payload.replacement_acknowledged_at ? "watch" : "publish";
  }
}

export function getHnsImportActionLabel(payload: HnsImportChallengePayload): string {
  return currentStage(payload) === "publish"
    ? "I published all records, check the chain"
    : "Check status";
}

export function hnsImportNeedsPublishAcknowledgement(payload: HnsImportChallengePayload): boolean {
  return currentStage(payload) === "publish";
}

export function HnsImportGuidance({
  expired = false,
  payload,
  restartError = null,
}: {
  expired?: boolean;
  payload: HnsImportChallengePayload;
  restartError?: string | null;
}) {
  const observation = payload.observation;
  const plan = payload.publish_plan;
  const target = observation?.target_tree_boundary ?? payload.target_tree_boundary;
  const stage = currentStage(payload);
  const blocked = stage === "publish" && hnsImportHasUnsupportedRecords(payload);

  return (
    <div className="space-y-5 rounded-[var(--radius-2xl)] border border-border-soft bg-card p-4 md:p-5">
      {expired ? (
        <StatusBlock title="Session expired" tone="action">
          Generate a fresh list before publishing.
        </StatusBlock>
      ) : null}

      {restartError ? <FormNote tone="warning">{restartError}</FormNote> : null}

      {!expired && stage === "publish" && blocked ? (
        <StatusBlock title="Unsupported records" tone="action">
          This name contains records that Bob Wallet cannot preserve. Contact support before publishing an update.
        </StatusBlock>
      ) : null}

      {!expired && stage === "publish" && !blocked ? (
        <div className="space-y-4">
          <Type as="h3" variant="body-strong">Publish these records</Type>
          <ResourceRecordList records={plan.replacement_records} />
        </div>
      ) : null}

      {!expired && stage === "watch" ? (
        <StatusBlock title="Update not confirmed yet">
          Check again after it confirms.
        </StatusBlock>
      ) : null}

      {!expired && stage === "commit" && target != null && observation ? (
        <StatusBlock title="Transaction confirmed">
          Handshake is finalizing the update. Check again in {approximateBoundaryEta(observation.current_height, target)}.
        </StatusBlock>
      ) : null}

      {!expired && stage === "compare" ? (
        <div className="space-y-4">
          <StatusBlock title="Published records don't match" tone="action">
            Publish the full list again as one update. A partial fix won&apos;t work.
          </StatusBlock>
          <ResourceMismatchList
            expected={plan.replacement_records}
            missing={observation?.missing_records ?? []}
            unexpected={observation?.unexpected_records ?? []}
          />
        </div>
      ) : null}

      {!expired && stage === "observe" ? (
        <StatusBlock title="Records confirmed">
          Secure delegation isn&apos;t available yet.
        </StatusBlock>
      ) : null}

      {!expired && stage === "done" ? (
        <StatusBlock title="Setup complete" tone="done" />
      ) : null}
    </div>
  );
}

function StatusBlock({
  children,
  title,
  tone = "waiting",
}: {
  children?: React.ReactNode;
  title: string;
  tone?: "waiting" | "action" | "done";
}) {
  const Icon = tone === "action" ? WarningCircle : tone === "done" ? CheckCircle : Clock;
  return (
    <div className="space-y-2" data-tone={tone}>
      <div className="flex items-center gap-2">
        <Icon
          aria-hidden
          className={cn(
            "size-5 shrink-0",
            tone === "action" && "text-warning",
            tone === "done" && "text-success",
            tone === "waiting" && "text-muted-foreground",
          )}
          weight="fill"
        />
        <Type as="h3" variant="body-strong">{title}</Type>
      </div>
      {children ? (
        <FormNote tone={tone === "action" ? "warning" : "muted"}>{children}</FormNote>
      ) : null}
    </div>
  );
}

function StatusPill({ children }: { children: React.ReactNode }) {
  return (
    <span className="shrink-0 rounded-full bg-warning/10 px-2 py-0.5 text-base font-medium text-warning">
      {children}
    </span>
  );
}

function HnsRecordRow({
  record,
  tag,
  tone = "default",
}: {
  record: HnsRawResourceRecord;
  tag?: "Missing" | "Unexpected";
  tone?: "default" | "warning";
}) {
  const view = describeHnsRecord(record);
  const copyable = view.kind === "standard" && tag !== "Unexpected";

  return (
    <div className={cn(
      "flex items-center gap-3 border-b px-3 py-2.5 last:border-b-0",
      tone === "warning" ? "border-warning/30 bg-warning/5" : "border-border-soft bg-background",
    )}>
      <Type as="span" className="w-16 shrink-0 truncate text-muted-foreground" variant="caption">{view.type}</Type>
      {tag ? <StatusPill>{tag}</StatusPill> : null}
      {view.kind === "standard" ? (
        <code className="min-w-0 flex-1 whitespace-pre-wrap break-all font-mono text-base leading-6 text-foreground select-all">
          {view.value}
        </code>
      ) : (
        <code className="min-w-0 flex-1 whitespace-pre-wrap break-all font-mono text-base leading-6 text-muted-foreground">
          {view.detail}
        </code>
      )}
      {copyable && view.kind === "standard" ? (
        <CopyButton label={`Copy ${view.type} value`} value={view.value} />
      ) : null}
    </div>
  );
}

function ResourceRecordList({ records }: { records: HnsRawResourceRecord[] }) {
  return (
    <div className="overflow-hidden rounded-xl border border-border-soft">
      {records.map((record, index) => (
        <HnsRecordRow key={`${JSON.stringify(record)}-${index}`} record={record} />
      ))}
    </div>
  );
}

function ResourceMismatchList({
  expected,
  missing,
  unexpected,
}: {
  expected: HnsRawResourceRecord[];
  missing: HnsRawResourceRecord[];
  unexpected: HnsRawResourceRecord[];
}) {
  const missingKeys = new Set(missing.map((record) => JSON.stringify(record)));
  return (
    <div className="overflow-hidden rounded-xl border border-warning/50">
      {expected.map((record, index) => (
        <HnsRecordRow
          key={`expected-${JSON.stringify(record)}-${index}`}
          record={record}
          tag={missingKeys.has(JSON.stringify(record)) ? "Missing" : undefined}
        />
      ))}
      {unexpected.map((record, index) => (
        <HnsRecordRow
          key={`unexpected-${JSON.stringify(record)}-${index}`}
          record={record}
          tag="Unexpected"
          tone="warning"
        />
      ))}
    </div>
  );
}

function CopyButton({ label, value }: { label: string; value: string }) {
  const [copied, setCopied] = React.useState(false);
  const { schedule: scheduleCopiedReset } = useResettableTimeout();

  const handleCopy = React.useCallback(async () => {
    await navigator.clipboard.writeText(value);
    setCopied(true);
    scheduleCopiedReset(() => setCopied(false), 2000);
  }, [scheduleCopiedReset, value]);

  return (
    <Button
      aria-label={copied ? "Copied" : label}
      className="size-8 shrink-0"
      onClick={handleCopy}
      size="icon"
      variant="secondary"
    >
      {copied ? <Check aria-hidden="true" className="size-4" /> : <Copy aria-hidden="true" className="size-4" />}
    </Button>
  );
}
