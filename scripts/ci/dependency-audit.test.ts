import { describe, expect, test } from "bun:test";

import { loadExceptions, normalizeBun, normalizeNpm } from "./dependency-audit.mjs";

// Real shape from `bun audit --json`: advisories keyed by package name.
const BUN_FIXTURE = JSON.stringify({
  decompress: [{
    id: 1122670,
    severity: "critical",
    title: "Decompress: Archive extraction can create files and links outside of the target directory",
    url: "https://github.com/advisories/GHSA-mp2f-45pm-3cg9",
  }],
  hono: [{
    id: 1124005,
    severity: "moderate",
    title: "Hono: API Gateway v1 adapter can drop a repeated request header",
    url: "https://github.com/advisories/GHSA-xgm2-5f3f-mvvc",
  }],
});

// Real shape from `npm audit --json`: nested under vulnerabilities[pkg].via,
// where a via entry is either an advisory object or a bare package-name string.
const NPM_FIXTURE = JSON.stringify({
  vulnerabilities: {
    tar: {
      name: "tar",
      severity: "high",
      via: [
        "minipass",
        {
          name: "tar",
          severity: "high",
          title: "tar: arbitrary file overwrite",
          url: "https://github.com/advisories/GHSA-tar-example",
        },
      ],
    },
  },
});

describe("dependency audit normalizers", () => {
  test("extracts GHSA, severity and package from bun output", () => {
    const findings = normalizeBun(BUN_FIXTURE);
    expect(findings).toHaveLength(2);
    const critical = findings.find((f) => f.severity === "critical");
    expect(critical?.ghsa).toBe("GHSA-mp2f-45pm-3cg9");
    expect(critical?.package).toBe("decompress");
  });

  test("extracts advisories from npm output and skips indirect string vias", () => {
    const findings = normalizeNpm(NPM_FIXTURE);
    // The bare "minipass" string is a dependency path, not an advisory.
    expect(findings).toHaveLength(1);
    expect(findings[0]?.ghsa).toBe("GHSA-tar-example");
    expect(findings[0]?.severity).toBe("high");
  });

  test("tolerates empty audit output from either tool", () => {
    expect(normalizeBun("{}")).toEqual([]);
    expect(normalizeNpm(JSON.stringify({ vulnerabilities: {} }))).toEqual([]);
  });
});

describe("baseline exceptions", () => {
  const now = new Date("2026-07-22T00:00:00Z");
  const entry = {
    advisory: "GHSA-mp2f-45pm-3cg9",
    expires: "2026-10-01",
    reason: "no patched upstream release; not reachable on untrusted input",
  };

  test("marks an exception expired only after its expiry date", () => {
    expect(loadExceptions({ exceptions: [entry] }, now).get(entry.advisory)?.expired).toBe(false);
    const lapsed = { ...entry, expires: "2026-07-01" };
    expect(loadExceptions({ exceptions: [lapsed] }, now).get(entry.advisory)?.expired).toBe(true);
  });

  // An exception is a security decision. Silently accepting one without a stated
  // reason or a deadline is how a baseline rots into a permanent ignore.
  test("rejects an exception missing a reason or an expiry", () => {
    expect(() => loadExceptions({ exceptions: [{ advisory: "GHSA-x", expires: "2026-10-01" }] }, now))
      .toThrow(/needs a `reason`/u);
    expect(() => loadExceptions({ exceptions: [{ advisory: "GHSA-x", reason: "because" }] }, now))
      .toThrow(/needs an `expires`/u);
    expect(() => loadExceptions({ exceptions: [{ expires: "2026-10-01", reason: "because" }] }, now))
      .toThrow(/needs an `advisory`/u);
  });

  test("rejects an unparseable expiry rather than treating it as unexpired", () => {
    expect(() => loadExceptions({ exceptions: [{ ...entry, expires: "whenever" }] }, now))
      .toThrow(/unparseable/u);
  });
});
