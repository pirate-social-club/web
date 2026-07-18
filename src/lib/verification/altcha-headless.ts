import { solveChallenge } from "altcha-lib";
import type { Challenge, ChallengeParameters, Payload } from "altcha-lib";

import type { AltchaScope } from "@/lib/api/client-groups-core";

export type AltchaChallengeLoader = (input: {
  action: string;
  scope: AltchaScope;
}) => Promise<Record<string, unknown>>;

function pbkdf2HashName(algorithm: ChallengeParameters["algorithm"]): "SHA-256" | "SHA-384" | "SHA-512" {
  switch (algorithm) {
    case "PBKDF2/SHA-512":
      return "SHA-512";
    case "PBKDF2/SHA-384":
      return "SHA-384";
    default:
      return "SHA-256";
  }
}

// WebCrypto PBKDF2 derive. altcha-lib ships its own in
// `altcha-lib/algorithms/pbkdf2`, but that module imports node:crypto at load
// time and crashes the browser bundle — the main `altcha-lib` entry is the
// only one that is WebCrypto-pure.
async function deriveKey(
  parameters: ChallengeParameters,
  salt: Uint8Array,
  password: Uint8Array,
): Promise<{ parameters: Record<string, never>; derivedKey: Uint8Array }> {
  const key = await crypto.subtle.importKey("raw", password as BufferSource, "PBKDF2", false, ["deriveBits"]);
  const bits = await crypto.subtle.deriveBits(
    {
      hash: pbkdf2HashName(parameters.algorithm),
      iterations: parameters.cost,
      name: "PBKDF2",
      salt: salt as BufferSource,
    },
    key,
    parameters.keyLength * 8,
  );
  return { derivedKey: new Uint8Array(bits), parameters: {} };
}

/**
 * ALTCHA proof-of-work needs no user input — it is pure computation — so
 * interactions can solve it invisibly instead of routing through a widget
 * modal. Resolves to the payload the API expects (base64 challenge+solution);
 * throws when the challenge cannot be fetched or solved, in which case the
 * caller should fall back to the visible widget.
 */
export async function solveAltchaChallengeHeadless(input: {
  action: string;
  loadChallenge: AltchaChallengeLoader;
  scope: AltchaScope;
}): Promise<string> {
  const challenge = await input.loadChallenge({ action: input.action, scope: input.scope }) as unknown as Challenge;
  const solution = await solveChallenge({ challenge, deriveKey });
  if (!solution) {
    throw new Error("Browser anti-bot check did not solve.");
  }
  return btoa(JSON.stringify({ challenge, solution } satisfies Payload));
}
