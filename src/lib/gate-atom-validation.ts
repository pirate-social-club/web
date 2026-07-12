import { getAddress } from "viem";
import type { GateAtom } from "@pirate/api-contracts";

import { normalizeCountryCode } from "./countries";
import { isAllowedCourtyardRegistry, validateInventoryAssetMatch } from "./gate-inventory-validation";

/**
 * Client mirror of the API's gate-atom validation
 * (services/api/src/lib/communities/membership/gate-policy-validation.ts on api@main).
 *
 * The editor must not build a policy the API will reject — but it must also not reject one the API
 * accepts, which would block a moderator from saving a legitimate rule. Both directions matter.
 */

export const MIN_AGE = 18;
export const MAX_AGE = 125;
export const DOCUMENT_PROOF_PROVIDERS = ["self", "zkpassport"] as const;

/**
 * Kosovo has no ISO-3166 assignment. The API canonicalizes the ICAO Doc 9303 travel-document
 * codes (KS/RKS) and the common XKX alias to XKK; the shared country table does not know them, so
 * a policy authored from a real Kosovo passport would be rejected here but accepted by the API.
 */
const KOSOVO_ALIASES = new Set(["KS", "RKS", "XKX", "XK", "XKK"]);

function isValidCountryCode(value: unknown): boolean {
  if (typeof value !== "string") {
    return false;
  }
  const normalized = value.trim().toUpperCase();
  return KOSOVO_ALIASES.has(normalized) || normalizeCountryCode(normalized) != null;
}

/**
 * Mirrors the API's normalizeEthereumAddress, which runs ethers' getAddress in a try/catch.
 *
 * viem's getAddress is used here because it is what this app already depends on, and its
 * acceptance behaviour matches. Deliberately NOT viem's `isAddress`, whose strict mode rejects a
 * non-checksummed mixed-case address the API accepts — that would block legitimate rules.
 */
export function normalizeContractAddress(value: unknown): string | null {
  if (typeof value !== "string" || value.trim().length === 0) {
    return null;
  }
  try {
    return getAddress(value.trim());
  } catch {
    return null;
  }
}

/** accepted_providers may be omitted, but when present must be a non-empty self/zkpassport list. */
function validateAcceptedProviders(input: unknown): string | null {
  if (input == null) {
    return null;
  }
  if (!Array.isArray(input) || input.length === 0) {
    return "Accepted providers must not be empty.";
  }
  return input.every((value) => DOCUMENT_PROOF_PROVIDERS.some((provider) => provider === value))
    ? null
    : "Accepted providers must be Self or ZKPassport.";
}

/** Returns a human-readable reason the API would reject this atom, or null when it is valid. */
export function validateGateAtom(gate: GateAtom): string | null {
  const atom = gate as GateAtom & Record<string, unknown>;

  switch (gate.type) {
    case "altcha_pow":
      return null;

    case "unique_human":
      return atom.provider === "self" || atom.provider === "very"
        ? null
        : "Choose a human verification provider.";

    case "minimum_age": {
      if (atom.provider !== "self") {
        return "Minimum age rules must be proven with Self.";
      }
      const age = atom.minimum_age;
      if (!Number.isInteger(age) || (age as number) < MIN_AGE || (age as number) > MAX_AGE) {
        return `Minimum age must be a whole number from ${MIN_AGE} to ${MAX_AGE}.`;
      }
      return validateAcceptedProviders(atom.accepted_providers);
    }

    case "nationality": {
      if (atom.provider !== "self") {
        return "Nationality rules must be proven with Self.";
      }
      const allowed = atom.allowed;
      if (allowed != null && !Array.isArray(allowed)) {
        return "Countries must be a list.";
      }
      // An empty list is valid and means "any verified nationality" — it does not admit nobody.
      const countries = Array.isArray(allowed) ? allowed : [];
      if (!countries.every(isValidCountryCode)) {
        return "Countries must be valid ISO country codes.";
      }
      return validateAcceptedProviders(atom.accepted_providers);
    }

    case "gender": {
      if (atom.provider !== "self") {
        return "Document sex marker rules must be proven with Self.";
      }
      const allowed = atom.allowed;
      if (!Array.isArray(allowed) || allowed.length === 0) {
        return "Choose a document sex marker.";
      }
      if (!allowed.every((value) => value === "M" || value === "F")) {
        return "Document sex marker must be M or F.";
      }
      return validateAcceptedProviders(atom.accepted_providers);
    }

    case "wallet_score": {
      if (atom.provider !== "passport") {
        return "Passport score rules must use the Passport provider.";
      }
      const score = atom.minimum_score;
      return typeof score === "number" && Number.isFinite(score) && score >= 0 && score <= 100
        ? null
        : "Passport score must be a number from 0 to 100.";
    }

    case "erc721_holding": {
      if (atom.chain_namespace !== "eip155:1") {
        return "NFT holding rules must target Ethereum mainnet.";
      }
      if (!normalizeContractAddress(atom.contract_address)) {
        return "Enter a valid contract address.";
      }
      const minCount = atom.min_count;
      if (minCount != null && (!Number.isInteger(minCount) || (minCount as number) < 1 || (minCount as number) > 100)) {
        return "Quantity must be a whole number from 1 to 100.";
      }
      return null;
    }

    case "erc721_inventory_match": {
      if (atom.provider !== "courtyard") {
        return "Collectible rules must use a supported inventory provider.";
      }
      const chainNamespace = atom.chain_namespace;
      if (chainNamespace !== "eip155:1" && chainNamespace !== "eip155:137") {
        return "Collectible rules must target a supported chain.";
      }
      const contractAddress = normalizeContractAddress(atom.contract_address);
      if (!contractAddress) {
        return "Enter a valid contract address.";
      }
      if (!isAllowedCourtyardRegistry(chainNamespace, contractAddress)) {
        return "Choose a trusted collection.";
      }
      const minQuantity = atom.min_quantity;
      if (!Number.isInteger(minQuantity) || (minQuantity as number) < 1 || (minQuantity as number) > 100) {
        return "Quantity must be a whole number from 1 to 100.";
      }
      return validateInventoryAssetMatch(atom.match);
    }

    default:
      /**
       * An atom this build does not recognize is not necessarily invalid: the API may be ahead of
       * this client. Such atoms are preserved, shown read-only, and passed back untouched — so the
       * editor must not block saving on them. The API remains the authority.
       */
      return null;
  }
}

export function isValidGateAtom(gate: GateAtom): boolean {
  return validateGateAtom(gate) == null;
}
