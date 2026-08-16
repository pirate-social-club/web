import { describe, expect, test } from "bun:test";
import {
  classifySolidHost,
  fetchWithTimeout,
  resolveSolidRequestDisposition,
} from "./perimeter";

describe("Solid staging host allowlist", () => {
  test("accepts only the explicitly configured isolated host", () => {
    expect(classifySolidHost("solid-staging.workers.dev", "solid-staging.workers.dev")).toBe("canonical");
    expect(classifySolidHost("other.workers.dev", "solid-staging.workers.dev")).toBe("unknown");
    expect(classifySolidHost("evil.example", "solid-staging.workers.dev")).toBe("unknown");
  });
});

describe("Solid request disposition", () => {
  test("rejects unknown hosts before any route or upstream work", () => {
    expect(resolveSolidRequestDisposition({
      pathname: "/",
      surface: "unknown",
      forwardingMetadataPresent: false,
      seamEnabled: true,
    })).toEqual({ kind: "reject", status: 404, reason: "unknown-host" });
  });

  test("settles redirects and forwarding rejection before rendering", () => {
    expect(resolveSolidRequestDisposition({
      pathname: "/",
      surface: "sovereign-apex",
      forwardingMetadataPresent: false,
      seamEnabled: true,
    })).toEqual({ kind: "redirect", status: 307 });

    expect(resolveSolidRequestDisposition({
      pathname: "/c/crew",
      surface: "sovereign-apex",
      forwardingMetadataPresent: false,
      seamEnabled: true,
    })).toEqual({ kind: "reject", status: 404, reason: "forwarding-metadata-required" });
  });

  test("denies seam paths outside local execution", () => {
    expect(resolveSolidRequestDisposition({
      pathname: "/seam/binding",
      surface: "canonical",
      forwardingMetadataPresent: false,
      seamEnabled: false,
    })).toEqual({ kind: "reject", status: 404, reason: "seam-disabled" });
  });
});

describe("bounded upstream calls", () => {
  test("aborts a fetch that exceeds its explicit timeout", async () => {
    const result = fetchWithTimeout(
      async (_input, init) => new Promise<Response>((_resolve, reject) => {
        init?.signal?.addEventListener("abort", () => reject(new DOMException("Aborted", "AbortError")));
      }),
      "https://api.example.test/slow",
      undefined,
      1,
    );

    await expect(result).rejects.toMatchObject({ name: "AbortError" });
  });
});
