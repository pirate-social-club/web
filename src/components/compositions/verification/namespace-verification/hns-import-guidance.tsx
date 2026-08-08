"use client";

import * as React from "react";
import { Check, Copy } from "@phosphor-icons/react";

import { Button } from "@/components/primitives/button";
import { FormNote } from "@/components/primitives/form-layout";
import { Type } from "@/components/primitives/type";
import { useResettableTimeout } from "@/hooks/use-resettable-timeout";
import type {
  HnsImportChallengePayload,
  HnsRawResourceRecord,
} from "@/components/compositions/verification/verify-namespace-modal/verify-namespace-modal.types";

type ImportStage = "publish" | "watch" | "commit" | "compare" | "observe" | "done";

export function formatHnsResourceRecord(record: HnsRawResourceRecord): string {
  const type = typeof record.type === "string" ? record.type : "UNKNOWN";
  if (type === "NS") return `NS  ${String(record.ns ?? "")}`;
  if (type === "TXT" && Array.isArray(record.txt)) {
    return record.txt.length > 1
      ? `TXT  ${JSON.stringify(record.txt)} (${record.txt.length} chunks)`
      : `TXT  ${String(record.txt[0] ?? "")}`;
  }
  if (type === "DS") {
    return `DS  ${String(record.keyTag ?? "")} ${String(record.algorithm ?? "")} ${String(record.digestType ?? "")} ${String(record.digest ?? "")}`;
  }
  return JSON.stringify(record);
}

export function copyableHnsResourceRecord(record: HnsRawResourceRecord): string {
  const type = typeof record.type === "string" ? record.type : "UNKNOWN";
  if (type === "TXT" && Array.isArray(record.txt) && record.txt.length > 1) {
    return JSON.stringify(record);
  }
  if (type !== "NS" && type !== "TXT" && type !== "DS") {
    return JSON.stringify(record);
  }
  return formatHnsResourceRecord(record);
}

export function formatHnsResourceRecords(records: HnsRawResourceRecord[]): string {
  return records.map(copyableHnsResourceRecord).join("\n");
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
    ? "I published all records — check the chain"
    : "Check status";
}

export function hnsImportNeedsPublishAcknowledgement(payload: HnsImportChallengePayload): boolean {
  return currentStage(payload) === "publish";
}

export function HnsImportGuidance({
  expired = false,
  payload,
  rootLabel,
}: {
  expired?: boolean;
  payload: HnsImportChallengePayload;
  rootLabel: string;
}) {
  const observation = payload.observation;
  const plan = payload.publish_plan;
  const target = observation?.target_tree_boundary ?? payload.target_tree_boundary;
  const stage = currentStage(payload);
  const phase = stage === "publish" ? 1 : 2;

  return (
    <div className="space-y-5 rounded-[var(--radius-2xl)] border border-border-soft bg-card p-4 md:p-5">
      <div className="space-y-1">
        <Type as="h2" variant="body-strong">Connect .{rootLabel}</Type>
        <Type as="p" className="text-muted-foreground" variant="body">
          Publish one complete on-chain UPDATE. Then Pirate checks the chain and delegation.
        </Type>
      </div>

      <PhaseProgress expired={expired} phase={phase} />

      {expired ? (
        <div className="space-y-2">
          <Type as="h3" variant="body-strong">This setup session expired</Type>
          <FormNote tone="warning">
            Start again before publishing. A new session creates a fresh ownership proof and complete replacement resource.
          </FormNote>
        </div>
      ) : null}

      {!expired && stage === "publish" ? (
        <div className="space-y-4">
          <Type as="h3" variant="body-strong">Publish the UPDATE</Type>
          <Type as="p" variant="body">
            In the wallet or registrar that holds <strong>{rootLabel}</strong>, publish every record below together. This list includes your existing records so nothing is lost.
          </Type>

          <ResourceRecordList records={plan.replacement_records} title="Complete replacement resource" />

          <FormNote tone="warning">
            Handshake UPDATEs replace the entire resource; they do not merge records. Publish the complete list, not only the new records.
          </FormNote>
        </div>
      ) : null}

      {!expired && stage === "watch" ? (
        <div className="space-y-2">
          <Type as="h3" variant="body-strong">Waiting for the UPDATE</Type>
          <FormNote>
            Click <strong>Check status</strong> after the transaction is mined. Pirate does not refresh this page automatically.
          </FormNote>
        </div>
      ) : null}

      {!expired && stage === "commit" && target != null && observation ? (
        <div className="space-y-2">
          <Type as="h3" variant="body-strong">UPDATE mined — waiting for the tree commit</Type>
          <Type as="p" variant="body">
            Current height <strong>{observation.current_height.toLocaleString()}</strong> · target block <strong>{target.toLocaleString()}</strong>
          </Type>
          <FormNote>
            Estimated {approximateBoundaryEta(observation.current_height, target)}. Handshake commits resource changes every 36 blocks, so this can take from a few minutes to about 6 hours. Click <strong>Check status</strong> after the target block.
          </FormNote>
        </div>
      ) : null}

      {!expired && stage === "compare" ? (
        <div className="space-y-4">
          <div className="space-y-2">
            <Type as="h3" variant="body-strong">The committed resource does not match</Type>
            <FormNote tone="warning">
              The UPDATE was committed, but it is missing or contains different records. Repair it with one complete replacement UPDATE—never a partial delta.
            </FormNote>
          </div>
          <ResourceMismatchList
            expected={plan.replacement_records}
            missing={observation?.missing_records ?? []}
            unexpected={observation?.unexpected_records ?? []}
          />
        </div>
      ) : null}

      {!expired && stage === "observe" ? (
        <div className="space-y-2">
          <Type as="h3" variant="body-strong">Records match — checking the delegation</Type>
          <FormNote tone="warning">
            The resource is committed, but the secure delegation is not valid yet. Keep the complete NS, TXT, and both DS records in place, then click <strong>Check status</strong> again.
          </FormNote>
        </div>
      ) : null}

      {!expired && stage === "done" ? (
        <div className="space-y-2">
          <Type as="h3" variant="body-strong">Name connected</Type>
          <FormNote>The complete resource is committed and the secure delegation has been observed.</FormNote>
        </div>
      ) : null}
    </div>
  );
}

function PhaseProgress({ expired, phase }: { expired: boolean; phase: 1 | 2 }) {
  return (
    <div aria-label="Import progress" role="group">
      <div className="mb-2 flex items-baseline justify-between gap-3">
        <Type as="span" variant="caption">{expired ? "Session expired" : `Phase ${phase} of 2`}</Type>
        {!expired ? <Type as="span" className="text-muted-foreground" variant="caption">{phase === 1 ? "Publish UPDATE" : "Check the chain"}</Type> : null}
      </div>
      <div aria-hidden="true" className="flex gap-1">
        <span className={expired ? "h-1.5 flex-1 rounded-full bg-border-soft" : "h-1.5 flex-1 rounded-full bg-primary"} />
        <span className={!expired && phase === 2 ? "h-1.5 flex-1 rounded-full bg-primary" : "h-1.5 flex-1 rounded-full bg-border-soft"} />
      </div>
    </div>
  );
}

function ResourceRecordList({
  records,
  title,
}: {
  records: HnsRawResourceRecord[];
  title: string;
}) {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-3">
        <Type as="h4" variant="caption">{title}</Type>
        <CopyButton label="Copy all records" value={formatHnsResourceRecords(records)} />
      </div>
      <div className="overflow-hidden rounded-xl border border-border-soft">
        {records.map((record, index) => {
          const formatted = formatHnsResourceRecord(record);
          return (
            <div className="flex items-start gap-2 border-b border-border-soft bg-background px-3 py-2.5 last:border-b-0" key={`${formatted}-${index}`}>
              <code className="min-w-0 flex-1 whitespace-pre-wrap break-all font-mono text-sm leading-6 text-foreground select-all">
                {formatted}
              </code>
            </div>
          );
        })}
      </div>
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
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-3">
        <Type as="h4" variant="caption">Complete replacement with differences</Type>
        <CopyButton label="Copy all records" value={formatHnsResourceRecords(expected)} />
      </div>
      <div className="overflow-hidden rounded-xl border border-warning/50">
        {expected.map((record, index) => {
          const formatted = formatHnsResourceRecord(record);
          const isMissing = missingKeys.has(JSON.stringify(record));
          return (
            <div className="flex items-start gap-3 border-b border-border-soft bg-background px-3 py-2.5 last:border-b-0" key={`expected-${formatted}-${index}`}>
              <code className="min-w-0 flex-1 whitespace-pre-wrap break-all font-mono text-sm leading-6 text-foreground select-all">{formatted}</code>
              {isMissing ? <Type as="span" className="shrink-0 text-warning" variant="caption">Missing</Type> : null}
            </div>
          );
        })}
        {unexpected.map((record, index) => {
          const formatted = formatHnsResourceRecord(record);
          return (
            <div className="flex items-start gap-3 border-t border-warning/30 bg-warning/5 px-3 py-2.5" key={`unexpected-${formatted}-${index}`}>
              <code className="min-w-0 flex-1 whitespace-pre-wrap break-all font-mono text-sm leading-6 text-foreground select-all">{formatted}</code>
              <Type as="span" className="shrink-0 text-warning" variant="caption">Unexpected</Type>
            </div>
          );
        })}
      </div>
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
      onClick={handleCopy}
      size="sm"
      variant="secondary"
    >
      {copied ? <Check aria-hidden="true" className="size-4" /> : <Copy aria-hidden="true" className="size-4" />}
      {copied ? "Copied" : "Copy all"}
    </Button>
  );
}
