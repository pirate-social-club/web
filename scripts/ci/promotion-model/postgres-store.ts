import { randomUUID } from "node:crypto";

type GateKey = {
  candidateId: string;
  gateId: string;
  gateVersion: number;
};

type Delivery = GateKey & {
  deliveryId: string;
  sourceRunId: string;
  sourceRunAttempt: number;
};

export class ShadowStoreTransitionError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ShadowStoreTransitionError";
  }
}

export class PromotionShadowStore {
  readonly sql: Bun.SQL;

  constructor(databaseUrl: string) {
    this.sql = new Bun.SQL(databaseUrl);
  }

  async close(): Promise<void> {
    await this.sql.end();
  }

  async mintCandidate(input: {
    candidateId: string;
    webSha: string;
    apiSha: string;
    coreSha: string;
    manifest: unknown;
  }): Promise<void> {
    const rows = await this.sql`
      INSERT INTO promotion_shadow.candidates
        (candidate_id, web_sha, api_sha, core_sha, manifest)
      VALUES
        (${input.candidateId}, ${input.webSha}, ${input.apiSha}, ${input.coreSha},
         ${JSON.stringify(input.manifest)}::jsonb)
      ON CONFLICT (candidate_id) DO UPDATE
        SET candidate_id = EXCLUDED.candidate_id
        WHERE promotion_shadow.candidates.web_sha = EXCLUDED.web_sha
          AND promotion_shadow.candidates.api_sha = EXCLUDED.api_sha
          AND promotion_shadow.candidates.core_sha = EXCLUDED.core_sha
          AND promotion_shadow.candidates.manifest = EXCLUDED.manifest
      RETURNING candidate_id
    `;
    if (rows.length !== 1) {
      throw new ShadowStoreTransitionError("candidate idempotency payload mismatch");
    }
  }

  async startAttempt(input: Delivery & { attemptId: string }): Promise<
    { kind: "started"; attemptNo: number } | { kind: "duplicate"; attemptNo: number | null }
  > {
    const outcome = await this.sql.begin(async (tx) => {
        const delivery = await tx<{ delivery_id: string }[]>`
          INSERT INTO promotion_shadow.gate_deliveries
            (delivery_id, candidate_id, gate_id, gate_version,
             source_run_id, source_run_attempt, classified_as)
          VALUES
            (${input.deliveryId}, ${input.candidateId}, ${input.gateId}, ${input.gateVersion},
             ${input.sourceRunId}, ${input.sourceRunAttempt}, 'attempt')
          ON CONFLICT (candidate_id, gate_id, gate_version, source_run_id, source_run_attempt)
            DO NOTHING
          RETURNING delivery_id
        `;
        if (delivery.length === 0) {
          const existing = await tx<{ attempt_no: number | null }[]>`
            SELECT attempt.attempt_no
            FROM promotion_shadow.gate_deliveries AS delivered
            LEFT JOIN promotion_shadow.attestation_attempts AS attempt
              ON attempt.delivery_id = delivered.delivery_id
            WHERE delivered.candidate_id = ${input.candidateId}
              AND delivered.gate_id = ${input.gateId}
              AND delivered.gate_version = ${input.gateVersion}
              AND delivered.source_run_id = ${input.sourceRunId}
              AND delivered.source_run_attempt = ${input.sourceRunAttempt}
          `;
          return { kind: "duplicate" as const, attemptNo: existing[0]?.attempt_no ?? null };
        }

        await tx`
          INSERT INTO promotion_shadow.attempt_counters
            (candidate_id, gate_id, gate_version)
          VALUES (${input.candidateId}, ${input.gateId}, ${input.gateVersion})
          ON CONFLICT (candidate_id, gate_id, gate_version) DO NOTHING
        `;
        const counter = await tx<{ next_attempt_no: number }[]>`
          SELECT next_attempt_no
          FROM promotion_shadow.attempt_counters
          WHERE candidate_id = ${input.candidateId}
            AND gate_id = ${input.gateId}
            AND gate_version = ${input.gateVersion}
          FOR UPDATE
        `;
        const running = await tx`
          SELECT 1
          FROM promotion_shadow.attestation_attempts
          WHERE candidate_id = ${input.candidateId}
            AND gate_id = ${input.gateId}
            AND gate_version = ${input.gateVersion}
            AND status = 'running'
        `;
        if (running.length > 0) {
          await tx`
            INSERT INTO promotion_shadow.promotion_anomalies
              (anomaly_id, kind, candidate_id, gate_id, gate_version, detected_by, detail)
            VALUES
              (${`anomaly_${randomUUID()}`}, 'concurrent_attempt', ${input.candidateId},
               ${input.gateId}, ${input.gateVersion}, 'shadow-store',
               ${JSON.stringify({ deliveryId: input.deliveryId })}::jsonb)
          `;
          return { kind: "conflict" as const };
        }
        const attemptNo = counter[0]?.next_attempt_no;
        if (!attemptNo) throw new Error("attempt counter returned no value");
        await tx`
          INSERT INTO promotion_shadow.attestation_attempts
            (attempt_id, delivery_id, candidate_id, gate_id, gate_version,
             attempt_no, status)
          VALUES
            (${input.attemptId}, ${input.deliveryId}, ${input.candidateId}, ${input.gateId},
             ${input.gateVersion}, ${attemptNo}, 'running')
        `;
        await tx`
          UPDATE promotion_shadow.attempt_counters
          SET next_attempt_no = next_attempt_no + 1
          WHERE candidate_id = ${input.candidateId}
            AND gate_id = ${input.gateId}
            AND gate_version = ${input.gateVersion}
        `;
        return { kind: "started" as const, attemptNo };
      });
    if (outcome.kind === "conflict") {
      throw new ShadowStoreTransitionError("attempt already in flight");
    }
    return outcome;
  }

  async completeAttempt(input: {
    attemptId: string;
    result: "pass" | "fail" | "inconclusive";
    detectedBy: string;
  }): Promise<void> {
    const completed = await this.sql.begin(async (tx) => {
      const updated = await tx<{ candidate_id: string; gate_id: string; gate_version: number; attempt_no: number }[]>`
        UPDATE promotion_shadow.attestation_attempts
        SET status = 'terminal', result = ${input.result}, completed_at = clock_timestamp()
        WHERE attempt_id = ${input.attemptId} AND status = 'running'
        RETURNING candidate_id, gate_id, gate_version, attempt_no
      `;
      if (updated.length === 1) return true;
      const [existing] = await tx<{
        candidate_id: string;
        gate_id: string;
        gate_version: number;
        attempt_no: number;
      }[]>`
        SELECT candidate_id, gate_id, gate_version, attempt_no
        FROM promotion_shadow.attestation_attempts
        WHERE attempt_id = ${input.attemptId}
      `;
      await tx`
        INSERT INTO promotion_shadow.promotion_anomalies
          (anomaly_id, kind, candidate_id, gate_id, gate_version, attempt_no,
           detected_by, detail)
        VALUES
          (${`anomaly_${randomUUID()}`}, 'late_duplicate_completion',
           ${existing?.candidate_id ?? null}, ${existing?.gate_id ?? null},
           ${existing?.gate_version ?? null}, ${existing?.attempt_no ?? null}, ${input.detectedBy},
           ${JSON.stringify({ attemptId: input.attemptId })}::jsonb)
      `;
      return false;
    });
    if (!completed) throw new ShadowStoreTransitionError("attempt is not running");
  }

  async recordObservation(input: Delivery & {
    observationId: string;
    observation: "absent" | "skipped";
  }): Promise<"recorded" | "duplicate"> {
    return this.sql.begin(async (tx) => {
      const delivery = await tx<{ delivery_id: string }[]>`
        INSERT INTO promotion_shadow.gate_deliveries
          (delivery_id, candidate_id, gate_id, gate_version,
           source_run_id, source_run_attempt, classified_as)
        VALUES
          (${input.deliveryId}, ${input.candidateId}, ${input.gateId}, ${input.gateVersion},
           ${input.sourceRunId}, ${input.sourceRunAttempt}, 'observation')
        ON CONFLICT (candidate_id, gate_id, gate_version, source_run_id, source_run_attempt)
          DO NOTHING
        RETURNING delivery_id
      `;
      if (delivery.length === 0) return "duplicate";
      await tx`
        INSERT INTO promotion_shadow.gate_observations
          (observation_id, delivery_id, candidate_id, gate_id, gate_version, observation)
        VALUES
          (${input.observationId}, ${input.deliveryId}, ${input.candidateId},
           ${input.gateId}, ${input.gateVersion}, ${input.observation})
      `;
      return "recorded";
    });
  }

  async acquireLease(input: {
    lane: string;
    owner: string;
    epoch: bigint;
    ttlMs: number;
  }): Promise<{ epoch: bigint; token: bigint } | null> {
    const rows = await this.sql<{ fencing_epoch: bigint; fencing_token: bigint }[]>`
      INSERT INTO promotion_shadow.promoter_leases
        (lane, owner, fencing_epoch, fencing_token, acquired_at, heartbeat_at, expires_at)
      VALUES
        (${input.lane}, ${input.owner}, ${input.epoch},
         nextval('promotion_shadow.fencing_sequence'), clock_timestamp(),
         clock_timestamp(), clock_timestamp() + (${input.ttlMs} * interval '1 millisecond'))
      ON CONFLICT (lane) DO UPDATE
        SET owner = EXCLUDED.owner,
            fencing_epoch = EXCLUDED.fencing_epoch,
            fencing_token = nextval('promotion_shadow.fencing_sequence'),
            acquired_at = clock_timestamp(),
            heartbeat_at = clock_timestamp(),
            expires_at = clock_timestamp() + (${input.ttlMs} * interval '1 millisecond')
        WHERE promotion_shadow.promoter_leases.expires_at < clock_timestamp()
      RETURNING fencing_epoch, fencing_token
    `;
    const row = rows[0];
    return row ? { epoch: row.fencing_epoch, token: row.fencing_token } : null;
  }

  async recordFencedDecision(input: {
    lane: string;
    epoch: bigint;
    token: bigint;
    decisionId: string;
    candidateId: string | null;
    scenario: string;
    decision: "admitted" | "superseded" | "blocked" | "halted";
    hypotheticalDeployedSha?: string | null;
    decidedAt: Date;
  }): Promise<void> {
    const rows = await this.sql`
      WITH fence AS (
        UPDATE promotion_shadow.promoter_leases
        SET heartbeat_at = clock_timestamp()
        WHERE lane = ${input.lane}
          AND fencing_epoch = ${input.epoch}
          AND fencing_token = ${input.token}
          AND expires_at > clock_timestamp()
        RETURNING fencing_token
      )
      INSERT INTO promotion_shadow.shadow_decisions
        (decision_id, candidate_id, scenario, decision,
         hypothetical_deployed_sha, decided_at)
      SELECT
        ${input.decisionId}, ${input.candidateId}, ${input.scenario}, ${input.decision},
        ${input.hypotheticalDeployedSha ?? null}, ${input.decidedAt}
      FROM fence
      RETURNING decision_id
    `;
    if (rows.length !== 1) throw new ShadowStoreTransitionError("lease fence rejected decision");
  }
}
