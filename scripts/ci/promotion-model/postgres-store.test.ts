import { SQL } from "bun";
import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import { PromotionShadowStore, ShadowStoreTransitionError } from "./postgres-store";

const ADMIN_URL = process.env.PROMOTION_STORE_TEST_ADMIN_URL;
const CORE_DIR = process.env.PROMOTION_STORE_TEST_CORE_DIR;
const RUN = Boolean(ADMIN_URL && CORE_DIR);
const TEST_DB = "web_promotion_shadow_store_test";
let store: PromotionShadowStore;

function urlFor(db: string): string {
  const url = new URL(ADMIN_URL as string);
  url.pathname = `/${db}`;
  if (!url.searchParams.get("sslmode")) url.searchParams.set("sslmode", "disable");
  return url.toString();
}

function connect(db = "postgres"): SQL {
  return new SQL({ url: urlFor(db), tls: false, max: 4, connectionTimeout: 5 } as Record<string, unknown>);
}

describe.skipIf(!RUN)("PostgreSQL promotion shadow store", () => {
  beforeAll(async () => {
    const admin = connect();
    await admin.unsafe(`DROP DATABASE IF EXISTS ${TEST_DB} WITH (FORCE)`);
    await admin.unsafe(`CREATE DATABASE ${TEST_DB}`);
    await admin.end();

    const migrationUrl = urlFor(TEST_DB);
    const process = Bun.spawn(
      [
        "bun",
        "run",
        `${CORE_DIR}/scripts/control-plane/apply-postgres-migrations.ts`,
        "--database-url-env",
        "PROMOTION_MIGRATION_DATABASE_URL",
        "--migrations",
        `${CORE_DIR}/db/promotion/migrations`,
        "--label",
        "promotion-shadow",
      ],
      {
        cwd: CORE_DIR,
        env: { ...globalThis.process.env, PROMOTION_MIGRATION_DATABASE_URL: migrationUrl },
        stdout: "pipe",
        stderr: "pipe",
      },
    );
    const stdout = await new Response(process.stdout).text();
    const stderr = await new Response(process.stderr).text();
    await process.exited;
    expect(process.exitCode, `${stderr}\n${stdout}`).toBe(0);

    store = new PromotionShadowStore(migrationUrl);
    await store.mintCandidate({
      candidateId: "shc_store_test",
      webSha: "web",
      apiSha: "api",
      coreSha: "core",
      manifest: { schema: 1 },
    });
  });

  afterAll(async () => {
    await store?.close();
    const admin = connect();
    await admin.unsafe(`DROP DATABASE IF EXISTS ${TEST_DB} WITH (FORCE)`).catch(() => {});
    await admin.end();
  });

  test("accepts equivalent candidate replay and rejects mismatched identity payload", async () => {
    await store.mintCandidate({
      candidateId: "shc_store_test",
      webSha: "web",
      apiSha: "api",
      coreSha: "core",
      manifest: { schema: 1 },
    });
    await expect(store.mintCandidate({
      candidateId: "shc_store_test",
      webSha: "different",
      apiSha: "api",
      coreSha: "core",
      manifest: { schema: 1 },
    })).rejects.toBeInstanceOf(ShadowStoreTransitionError);
  });

  test("enforces single-flight without consuming rejected attempt numbers", async () => {
    const starts = await Promise.allSettled(
      Array.from({ length: 8 }, (_, index) =>
        store.startAttempt({
          attemptId: `attempt_race_${index}`,
          deliveryId: `delivery_race_${index}`,
          candidateId: "shc_store_test",
          gateId: "schema",
          gateVersion: 1,
          sourceRunId: `run-race-${index}`,
          sourceRunAttempt: 1,
        }),
      ),
    );
    const fulfilled = starts.filter((result) => result.status === "fulfilled");
    const rejected = starts.filter((result) => result.status === "rejected");
    expect(fulfilled).toHaveLength(1);
    expect(rejected).toHaveLength(7);
    for (const result of rejected) {
      expect(result.reason).toBeInstanceOf(ShadowStoreTransitionError);
    }

    const winner = fulfilled[0] as PromiseFulfilledResult<{ kind: "started"; attemptNo: number }>;
    expect(winner.value.attemptNo).toBe(1);
    const db = connect(TEST_DB);
    const [counter] = await db.unsafe(`
      SELECT next_attempt_no
      FROM promotion_shadow.attempt_counters
      WHERE candidate_id = 'shc_store_test' AND gate_id = 'schema' AND gate_version = 1
    `) as { next_attempt_no: number }[];
    const [anomalies] = await db.unsafe(`
      SELECT COUNT(*)::int AS count
      FROM promotion_shadow.promotion_anomalies
      WHERE kind = 'concurrent_attempt'
    `) as { count: number }[];
    await db.end();
    expect(counter?.next_attempt_no).toBe(2);
    expect(anomalies?.count).toBe(7);

    const winningAttempt = starts.find(
      (result): result is PromiseFulfilledResult<{ kind: "started"; attemptNo: number }> =>
        result.status === "fulfilled",
    );
    const winningIndex = starts.indexOf(winningAttempt as PromiseSettledResult<unknown>);
    await store.completeAttempt({
      attemptId: `attempt_race_${winningIndex}`,
      result: "pass",
      detectedBy: "test",
    });
  });

  test("deduplicates delivery across evidence kinds but preserves run attempts", async () => {
    const db = connect(TEST_DB);
    const [delivered] = await db.unsafe(`
      SELECT source_run_id
      FROM promotion_shadow.gate_deliveries
      WHERE candidate_id = 'shc_store_test' AND gate_id = 'schema'
      LIMIT 1
    `) as { source_run_id: string }[];
    await db.end();
    const sourceRunId = delivered?.source_run_id;
    expect(sourceRunId).toBeString();

    const duplicate = await store.recordObservation({
      observationId: "observation_duplicate",
      deliveryId: "delivery_cross_kind",
      candidateId: "shc_store_test",
      gateId: "schema",
      gateVersion: 1,
      sourceRunId: sourceRunId!,
      sourceRunAttempt: 1,
      observation: "skipped",
    });
    expect(duplicate).toBe("duplicate");

    const rerun = await store.startAttempt({
      attemptId: "attempt_rerun",
      deliveryId: "delivery_rerun",
      candidateId: "shc_store_test",
      gateId: "schema",
      gateVersion: 1,
      sourceRunId: sourceRunId!,
      sourceRunAttempt: 2,
    });
    expect(rerun).toEqual({ kind: "started", attemptNo: 2 });

    const redelivery = await store.startAttempt({
      attemptId: "attempt_redelivery",
      deliveryId: "delivery_redelivery",
      candidateId: "shc_store_test",
      gateId: "schema",
      gateVersion: 1,
      sourceRunId: sourceRunId!,
      sourceRunAttempt: 2,
    });
    expect(redelivery).toEqual({ kind: "duplicate", attemptNo: 2 });
  });

  test("makes completion races durable and rejects stale lease holders", async () => {
    const completions = await Promise.allSettled([
      store.completeAttempt({ attemptId: "attempt_rerun", result: "pass", detectedBy: "runner-a" }),
      store.completeAttempt({ attemptId: "attempt_rerun", result: "fail", detectedBy: "runner-b" }),
    ]);
    expect(completions.filter((result) => result.status === "fulfilled")).toHaveLength(1);
    expect(completions.filter((result) => result.status === "rejected")).toHaveLength(1);

    const oldLease = await store.acquireLease({ lane: "shadow", owner: "old", epoch: 1n, ttlMs: 25 });
    expect(oldLease).not.toBeNull();
    await Bun.sleep(40);
    const newLease = await store.acquireLease({ lane: "shadow", owner: "new", epoch: 2n, ttlMs: 1_000 });
    expect(newLease).not.toBeNull();

    await expect(store.recordFencedDecision({
      lane: "shadow",
      epoch: oldLease!.epoch,
      token: oldLease!.token,
      decisionId: "decision_stale",
      candidateId: "shc_store_test",
      scenario: "p95-v1",
      decision: "admitted",
      decidedAt: new Date(),
    })).rejects.toBeInstanceOf(ShadowStoreTransitionError);

    await store.recordFencedDecision({
      lane: "shadow",
      epoch: newLease!.epoch,
      token: newLease!.token,
      decisionId: "decision_current",
      candidateId: "shc_store_test",
      scenario: "p95-v1",
      decision: "admitted",
      decidedAt: new Date(),
    });

    const db = connect(TEST_DB);
    const [counts] = await db.unsafe(`
      SELECT
        (SELECT COUNT(*)::int FROM promotion_shadow.shadow_decisions) AS decisions,
        (SELECT COUNT(*)::int FROM promotion_shadow.promotion_anomalies
          WHERE kind = 'late_duplicate_completion') AS completion_anomalies
    `) as { decisions: number; completion_anomalies: number }[];
    await db.end();
    expect(counts).toEqual({ decisions: 1, completion_anomalies: 1 });
  });
});
