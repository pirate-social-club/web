import { createChallenge } from "altcha-lib";
import { deriveKey } from "altcha-lib/algorithms/pbkdf2";

/**
 * A challenge shaped exactly like the one the API issues (altcha-lib v2,
 * PBKDF2 derive). The web solves proofs headlessly, so mocked specs need a
 * genuinely solvable challenge — a hand-written stub silently pushes the UI
 * onto its visible-widget fallback path and hides the behavior under test.
 * Cost is kept tiny so tests stay fast.
 */
export async function createSolvableAltchaChallenge(input: {
  action: string;
  actor?: string;
  scope: string;
}): Promise<Record<string, unknown>> {
  const challenge = await createChallenge({
    algorithm: "PBKDF2/SHA-256",
    cost: 2,
    data: { action: input.action, actor: input.actor ?? "usr_mock", scope: input.scope },
    deriveKey,
    hmacSignatureSecret: "e2e-altcha-secret",
    maxNumber: 25,
    number: 3,
  } as Parameters<typeof createChallenge>[0]);
  return challenge as unknown as Record<string, unknown>;
}
