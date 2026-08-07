"use client";

import { CopyField } from "@/components/primitives/copy-field";
import { FormNote } from "@/components/primitives/form-layout";
import { Type } from "@/components/primitives/type";
import type {
  HnsImportChallengePayload,
  HnsRawResourceRecord,
} from "@/components/compositions/verification/verify-namespace-modal/verify-namespace-modal.types";

function formatRecord(record: HnsRawResourceRecord): string {
  const type = typeof record.type === "string" ? record.type : "UNKNOWN";
  if (type === "NS") return `NS  ${String(record.ns ?? "")}`;
  if (type === "TXT" && Array.isArray(record.txt)) return `TXT  ${record.txt.join("")}`;
  if (type === "DS") {
    return `DS  ${String(record.keyTag ?? "")} ${String(record.algorithm ?? "")} ${String(record.digestType ?? "")} ${String(record.digest ?? "")}`;
  }
  return `${type}  ${JSON.stringify(record)}`;
}

function recordsText(records: HnsRawResourceRecord[]): string {
  return records.map(formatRecord).join("\n");
}

function approximateBoundaryEta(currentHeight: number, targetHeight: number): string {
  const blocks = Math.max(0, targetHeight - currentHeight + 1);
  const minutes = blocks * 10;
  if (minutes < 60) return `about ${minutes} minutes`;
  const hours = Math.ceil(minutes / 60);
  return `about ${hours} ${hours === 1 ? "hour" : "hours"}`;
}

export function HnsImportGuidance({
  acknowledged,
  busy,
  onAcknowledgedChange,
  payload,
  rootLabel,
}: {
  acknowledged: boolean;
  busy: boolean;
  onAcknowledgedChange: (value: boolean) => void;
  payload: HnsImportChallengePayload;
  rootLabel: string;
}) {
  const observation = payload.observation;
  const plan = payload.publish_plan;
  const acknowledgementRecorded = Boolean(payload.replacement_acknowledged_at);
  const target = observation?.target_tree_boundary ?? payload.target_tree_boundary;

  return (
    <div className="space-y-5 rounded-[var(--radius-2xl)] border border-border-soft bg-card p-4 md:p-5">
      <div className="space-y-2">
        <Type as="h2" variant="body-strong">Publish one complete Handshake UPDATE</Type>
        <Type as="p" variant="body">
          Pirate has provisioned and DNSSEC-signed <strong>{rootLabel}</strong>. Publish the complete resource below in the wallet or registrar that holds the TLD. It contains ownership proof, delegation, and both DNSSEC anchors.
        </Type>
        <FormNote tone="warning">
          Handshake UPDATEs replace the entire resource; they do not merge records. Use the complete block below. Pirate preserved records it does not control, including unknown record types.
        </FormNote>
      </div>

      <div className="space-y-2">
        <Type as="h3" variant="caption">Complete replacement resource</Type>
        <CopyField value={recordsText(plan.replacement_records)} />
      </div>

      {plan.preserved_unknown_record_types.length > 0 ? (
        <FormNote>
          Preserved opaque record types: {plan.preserved_unknown_record_types.join(", ")}.
        </FormNote>
      ) : null}

      {!acknowledgementRecorded ? (
        <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-border-soft p-3">
          <input
            checked={acknowledged}
            className="mt-1 size-4"
            disabled={busy}
            onChange={(event) => onAcknowledgedChange(event.target.checked)}
            type="checkbox"
          />
          <span className="text-foreground">
            I understand this replaces the full on-chain resource, and I will publish every record shown above.
          </span>
        </label>
      ) : null}

      {observation?.state === "waiting_for_update" ? (
        <FormNote tone="warning">
          We have not observed the UPDATE mined yet. Publish it, wait for confirmation, then check again.
        </FormNote>
      ) : null}

      {observation?.state === "resource_mismatch" ? (
        <div className="space-y-3">
          <FormNote tone="warning">
            The mined resource does not match the complete block. Do not publish another delta—repair it with one full replacement UPDATE.
          </FormNote>
          {observation.missing_records?.length ? (
            <div className="space-y-1">
              <Type as="h3" variant="caption">Missing records</Type>
              <CopyField value={recordsText(observation.missing_records)} />
            </div>
          ) : null}
          {observation.unexpected_records?.length ? (
            <div className="space-y-1">
              <Type as="h3" variant="caption">Unexpected records</Type>
              <CopyField value={recordsText(observation.unexpected_records)} />
            </div>
          ) : null}
        </div>
      ) : null}

      {observation?.state === "pending_tree_commit" && target != null ? (
        <FormNote>
          UPDATE mined. Handshake height {observation.current_height.toLocaleString()} · tree commit target {target.toLocaleString()} · estimated {approximateBoundaryEta(observation.current_height, target)}. This is progress, not an error.
        </FormNote>
      ) : null}

      {observation?.state === "delegation_not_secure" ? (
        <FormNote tone="warning">
          The tree committed, but DNSSEC/DANE validation is not secure. Keep the full NS, TXT, and both DS records in place and check again.
        </FormNote>
      ) : null}

      <div className="grid gap-2 border-t border-border-soft pt-4 sm:grid-cols-3">
        <Readiness label="Freedom" ready={observation?.state === "secure" || observation?.state === "delegation_not_secure"} requirement="NS + web records" />
        <Readiness label="Denuo / DANE" ready={observation?.state === "secure"} requirement="DS + DNSSEC + TLSA" />
        <Readiness label="Pirate route" ready={false} requirement="secure observation + activation" />
      </div>
    </div>
  );
}

function Readiness({ label, ready, requirement }: { label: string; ready: boolean; requirement: string }) {
  return (
    <div className="rounded-xl border border-border-soft p-3">
      <Type as="div" variant="body-strong">{label}</Type>
      <Type as="div" variant="caption">{ready ? "Ready" : "Not ready yet"}</Type>
      <Type as="div" variant="caption">{requirement}</Type>
    </div>
  );
}
