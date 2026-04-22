import type {
  SpacesChallengePayload,
} from "@/components/compositions/verify-namespace-modal/verify-namespace-modal.types";

function ensureAtPrefix(value: string) {
  return value.startsWith("@") ? value : `@${value}`;
}

export function buildSpacesSigningHelperCommand(
  challengePayload: Pick<SpacesChallengePayload, "digest" | "root_label">,
) {
  const space = ensureAtPrefix(challengePayload.root_label);

  return [
    "git clone https://github.com/pirate-social-club/core.git pirate-core",
    "cd pirate-core",
    "bun install",
    "SPACES_NATIVE_ALLOW_BUILD_FALLBACK=true bun services/verifier/spaces/scripts/sign-digest.ts \\",
    `  --space ${space} \\`,
    `  --digest ${challengePayload.digest} \\`,
    "  --wallet-dir <path-to-spaces-wallet> \\",
    "  --network mainnet",
  ].join("\n");
}
