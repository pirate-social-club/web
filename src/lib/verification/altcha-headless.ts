import { solveChallenge } from "altcha-lib";
import { deriveKey } from "altcha-lib/algorithms/pbkdf2";
import type { Challenge, Payload } from "altcha-lib";

import type { AltchaScope } from "@/lib/api/client-groups-core";

export type AltchaChallengeLoader = (input: {
  action: string;
  scope: AltchaScope;
}) => Promise<Record<string, unknown>>;

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
