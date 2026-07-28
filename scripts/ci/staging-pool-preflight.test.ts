import { describe, expect, test } from "bun:test";

import {
  checkAppendOnly,
  checkConfigCoverage,
  checkRefillSafety,
  parseJsonc,
  planExpectedAdditions,
  poolBindingName,
  poolDatabaseName,
  readConfigBindings,
  readD1PoolIndexes,
  readPoolBindingNames,
} from "./staging-pool-preflight.mjs";

function bindings(from: number, to: number): string[] {
  return Array.from({ length: to - from + 1 }, (_, offset) => poolBindingName(from + offset));
}

function configFor(names: string[]): string {
  const entries = names.map((binding) => ({
    binding,
    database_name: poolDatabaseName(Number(binding.slice(-4))),
    database_id: "00000000-0000-0000-0000-000000000000",
  }));
  // Deliberately includes a comment and a URL, because the JSONC stripper must
  // not treat "https://" as the start of a line comment.
  return `{
  // staging shard bindings
  "name": "community-d1-shard",
  "vars": { "DOCS": "https://developers.cloudflare.com/d1/" },
  "d1_databases": ${JSON.stringify(entries, null, 2)}
}`;
}

describe("staging pool pre-flight", () => {
  test("derives expected additions deterministically, matching the allocator", () => {
    expect(planExpectedAdditions(945, 3)).toEqual(["DB_CMTY_0945", "DB_CMTY_0946", "DB_CMTY_0947"]);
    expect(poolDatabaseName(945)).toBe("community-d1-pool-0945-staging");
    expect(() => planExpectedAdditions(945, 0)).toThrow();
  });

  test("parses JSONC without mangling URLs inside strings", () => {
    const parsed = parseJsonc(configFor(bindings(1, 2)));
    expect(parsed.vars.DOCS).toBe("https://developers.cloudflare.com/d1/");
    expect(readConfigBindings(parsed).map((entry) => entry.binding)).toEqual(["DB_CMTY_0001", "DB_CMTY_0002"]);
  });

  // The real shard config lists the SAME binding once per environment:
  // DB_CMTY_0054 is …-0054-staging at the top level and …-0054-prod under
  // env.production. Collecting across environments invents duplicate-binding
  // failures and compares staging pool rows against production databases.
  test("reads only the deployed environment, not every environment", () => {
    const parsed = parseJsonc(`{
      "d1_databases": [
        { "binding": "DB_CMTY_0001", "database_name": "community-d1-pool-0001-staging", "database_id": "a" }
      ],
      "env": {
        "production": {
          "d1_databases": [
            { "binding": "DB_CMTY_0001", "database_name": "community-d1-pool-0001-prod", "database_id": "b" }
          ]
        }
      }
    }`);
    const staging = readConfigBindings(parsed);
    expect(staging.map((entry) => entry.binding)).toEqual(["DB_CMTY_0001"]);
    expect(staging[0]?.databaseName).toBe("community-d1-pool-0001-staging");
    // And the duplicate check must not fire on that perfectly valid config.
    expect(checkConfigCoverage({
      poolBindingNames: ["DB_CMTY_0001"],
      configBindingNames: staging.map((entry) => entry.binding),
    }).problems).toEqual([]);
    expect(readConfigBindings(parsed, "production")[0]?.databaseName).toBe("community-d1-pool-0001-prod");
  });

  // Case 1: stale config — a live pool binding is absent from the config.
  test("fails closed when the config no longer lists a live pool binding", () => {
    const pool = bindings(1, 5);
    const configured = pool.filter((name) => name !== "DB_CMTY_0003");
    const result = checkConfigCoverage({ poolBindingNames: pool, configBindingNames: configured });
    expect(result.missing).toEqual(["DB_CMTY_0003"]);
    expect(result.problems[0]).toContain("stale config");
    expect(result.problems[0]).toContain("strand");
  });

  // Case 2: overlapping refill — databases exist above the highest registered binding.
  test("fails closed when another session has already created pool databases", () => {
    const pool = bindings(1, 944);
    const result = checkRefillSafety({
      d1Indexes: [...Array.from({ length: 944 }, (_, i) => i + 1), 945, 946],
      poolBindingNames: pool,
      startIndex: 947,
      count: 20,
    });
    expect(result.orphaned).toEqual([945, 946]);
    expect(result.problems.some((problem) => problem.includes("concurrent refill"))).toBe(true);
    expect(result.problems.some((problem) => problem.includes("stand down"))).toBe(true);
  });

  test("fails closed when the requested range overlaps existing databases", () => {
    const result = checkRefillSafety({
      d1Indexes: Array.from({ length: 944 }, (_, i) => i + 1),
      poolBindingNames: bindings(1, 944),
      startIndex: 940,
      count: 20,
    });
    expect(result.problems.some((problem) => problem.includes("not above the highest known pool index"))).toBe(true);
    expect(result.problems.some((problem) => problem.includes("Use 945"))).toBe(true);
  });

  // A truncated `d1 list` (pagination) would hide orphans and make the overlap
  // check pass vacuously, so a short inventory must fail rather than reassure.
  test("fails closed when the D1 inventory is smaller than the pool table", () => {
    const result = checkRefillSafety({
      d1Indexes: Array.from({ length: 100 }, (_, i) => i + 1),
      poolBindingNames: bindings(1, 944),
      startIndex: 945,
      count: 20,
    });
    expect(result.problems.some((problem) => problem.includes("incomplete inventory"))).toBe(true);
    expect(result.problems.some((problem) => problem.includes("stand down"))).toBe(true);
  });

  test("an equal-sized inventory is not treated as truncated", () => {
    const result = checkRefillSafety({
      d1Indexes: Array.from({ length: 944 }, (_, i) => i + 1),
      poolBindingNames: bindings(1, 944),
      startIndex: 945,
      count: 20,
    });
    expect(result.problems).toEqual([]);
  });

  // Case 3: unexpected delta — config gained something this refill did not plan.
  test("fails closed on a config delta beyond the planned additions", () => {
    const pool = bindings(1, 944);
    const expectedAdditions = planExpectedAdditions(945, 2);
    const result = checkAppendOnly({
      poolBindingNames: pool,
      configBindingNames: [...pool, ...expectedAdditions, "DB_CMTY_0999"],
      expectedAdditions,
    });
    expect(result.unexpected).toEqual(["DB_CMTY_0999"]);
    expect(result.problems[0]).toContain("unexpected config delta");
  });

  test("fails closed when a planned binding never made it into the config", () => {
    const pool = bindings(1, 944);
    const expectedAdditions = planExpectedAdditions(945, 3);
    const result = checkAppendOnly({
      poolBindingNames: pool,
      configBindingNames: [...pool, "DB_CMTY_0945", "DB_CMTY_0946"],
      expectedAdditions,
    });
    expect(result.absent).toEqual(["DB_CMTY_0947"]);
    expect(result.problems[0]).toContain("incomplete config");
  });

  // A rename must be caught twice over: missing from coverage AND unexpected in the delta.
  test("catches a renamed binding as both a coverage failure and an unexpected delta", () => {
    const pool = bindings(1, 3);
    const configBindingNames = ["DB_CMTY_0001", "DB_CMTY_0002", "DB_CMTY_0009"];
    const expectedAdditions = planExpectedAdditions(4, 1);
    expect(checkConfigCoverage({ poolBindingNames: pool, configBindingNames }).missing).toEqual(["DB_CMTY_0003"]);
    expect(checkAppendOnly({ poolBindingNames: pool, configBindingNames, expectedAdditions }).unexpected)
      .toEqual(["DB_CMTY_0009"]);
  });

  // Case 4: the clean append everything else is measured against.
  test("passes a clean append", () => {
    const pool = bindings(1, 944);
    const expectedAdditions = planExpectedAdditions(945, 20);
    const configBindingNames = [...pool, ...expectedAdditions];
    expect(checkConfigCoverage({ poolBindingNames: pool, configBindingNames }).problems).toEqual([]);
    expect(checkAppendOnly({ poolBindingNames: pool, configBindingNames, expectedAdditions }).problems).toEqual([]);
    expect(checkRefillSafety({
      d1Indexes: Array.from({ length: 944 }, (_, i) => i + 1),
      poolBindingNames: pool,
      startIndex: 945,
      count: 20,
    }).problems).toEqual([]);
  });

  test("reads wrangler payload shapes without trusting one version", () => {
    expect(readPoolBindingNames([{ results: [{ binding_name: "DB_CMTY_0001" }] }])).toEqual(["DB_CMTY_0001"]);
    expect(readPoolBindingNames({ results: [{ binding_name: "DB_CMTY_0002" }] })).toEqual(["DB_CMTY_0002"]);
    expect(readD1PoolIndexes([{ name: "community-d1-pool-0007-staging" }, { name: "unrelated-db" }])).toEqual([7]);
    // A production-suffixed database must never be counted as staging capacity.
    expect(readD1PoolIndexes([{ name: "community-d1-pool-0007-production" }], "staging")).toEqual([]);
  });

  test("duplicate bindings in config are rejected", () => {
    const result = checkConfigCoverage({
      poolBindingNames: ["DB_CMTY_0001"],
      configBindingNames: ["DB_CMTY_0001", "DB_CMTY_0001"],
    });
    expect(result.problems.some((problem) => problem.includes("duplicate binding"))).toBe(true);
  });
});
