import { describe, expect, test } from "bun:test";
import { createChallenge, verifySolution, type Payload } from "altcha-lib";
import { deriveKey as nodePbkdf2DeriveKey } from "altcha-lib/algorithms/pbkdf2";

import { solveAltchaChallengeHeadless } from "./altcha-headless";

// The server derives keys with node:crypto PBKDF2; the headless solver must
// derive byte-identical keys with WebCrypto or every proof it produces would
// fail server verification. Round-trip: server-created challenge -> headless
// solve -> server-side verify.
describe("solveAltchaChallengeHeadless", () => {
  test("solves a server-created PBKDF2 challenge so the server verifies it", async () => {
    const challenge = await createChallenge({
      algorithm: "PBKDF2/SHA-256",
      cost: 2,
      data: { action: "post:post-1:1", actor: "usr_1", scope: "vote" },
      deriveKey: nodePbkdf2DeriveKey,
      hmacSignatureSecret: "test-secret",
      maxNumber: 25,
      number: 7,
    } as Parameters<typeof createChallenge>[0]);

    const loads: Array<{ action: string; scope: string }> = [];
    const payload = await solveAltchaChallengeHeadless({
      action: "post:post-1:1",
      loadChallenge: async (input) => {
        loads.push(input);
        return challenge as unknown as Record<string, unknown>;
      },
      scope: "vote",
    });

    expect(loads).toEqual([{ action: "post:post-1:1", scope: "vote" }]);
    const decoded = JSON.parse(atob(payload)) as Payload;
    expect(decoded.challenge).toEqual(challenge as Payload["challenge"]);

    const verification = await verifySolution({
      challenge: decoded.challenge as Parameters<typeof verifySolution>[0]["challenge"],
      deriveKey: nodePbkdf2DeriveKey,
      hmacSignatureSecret: "test-secret",
      solution: decoded.solution,
    } as Parameters<typeof verifySolution>[0]);
    expect(verification.verified).toBe(true);
  });

  test("throws when the challenge cannot be loaded", async () => {
    await expect(solveAltchaChallengeHeadless({
      action: "post:post-1:1",
      loadChallenge: async () => {
        throw new Error("rate limited");
      },
      scope: "vote",
    })).rejects.toThrow("rate limited");
  });
});
