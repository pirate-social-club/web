import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { parse } from "yaml";

const PATH = ".github/workflows/provider-identity-duplicate-evidence-provenance.yml";
const SIBLING = ".github/workflows/provider-identity-invalid-link-audit.yml";
const source = readFileSync(PATH, "utf8");
const workflow = parse(source);
const sibling = parse(readFileSync(SIBLING, "utf8"));
const audit = workflow.jobs.audit;

describe("duplicate-evidence provenance audit workflow", () => {
  // Declaring a GitHub environment rewrites the OIDC `sub` claim to the
  // environment form, which the staging identity does not trust. That has
  // produced a 401 on this exact identity before.
  test("declares no GitHub environment, so the OIDC subject stays ref-form", () => {
    expect(audit.environment).toBeUndefined();
    expect(audit.permissions["id-token"]).toBe("write");
    expect(audit.permissions.contents).toBe("read");
  });

  test("reads staging through the staging control-plane identity", () => {
    const fetchStep = audit.steps.find((step: { name?: string }) => (
      step.name === "Fetch staging control-plane credential through Web OIDC"
    ));
    expect(fetchStep.env.INFISICAL_ENV).toBe("staging");
    expect(fetchStep.env.INFISICAL_SECRET_PATH).toBe("/services/control-plane");
    expect(fetchStep.env.SECRET_NAMES).toBe("CONTROL_PLANE_MIGRATOR_DATABASE_URL");
  });

  // This workflow exists to make a blocked decision legible. If it can ever
  // write, it stops being safe to run while a migration guard is unresolved.
  test("cannot mutate: read-only transaction and no write statements", () => {
    expect(source).toContain("SET TRANSACTION READ ONLY");
    for (const statement of ["INSERT ", "UPDATE ", "DELETE ", "TRUNCATE", "ALTER ", "DROP "]) {
      expect(source.toUpperCase()).not.toContain(statement);
    }
  });

  // The grouping CTE has to read user_id to find conflicting tuples; what must
  // never happen is emitting it, because this artifact is retained in CI.
  test("emits a digest, never a raw account id, in the reported projection", () => {
    expect(source).toContain("SHA256(a.user_id::bytea)");
    expect(source).toContain("AS user_digest");

    const start = source.lastIndexOf("SELECT a.user_attestation_id");
    const projection = source.slice(start, source.indexOf("FROM user_attestations a", start));
    expect(start).toBeGreaterThan(-1);
    expect(projection).not.toContain("a.user_id,");
  });

  // Both audits read the same schema through the same helper import. Letting the
  // pins drift means one can silently break while the other keeps passing.
  test("pins the same Core revision as the proven sibling audit", () => {
    expect(audit.env.CORE_SHA).toBe(sibling.jobs.audit.env.CORE_SHA);
  });
});
