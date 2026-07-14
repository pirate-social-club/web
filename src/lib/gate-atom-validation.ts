import { getAddress } from "viem";
import type { GateAtom } from "@pirate/api-contracts";

import { normalizeCountryCode } from "./countries";
import { isAllowedCourtyardRegistry, validateInventoryAssetMatch } from "./gate-inventory-validation";
import type { InventoryAssetMatchValidationError } from "./gate-inventory-validation";

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

export type GateAtomValidationError = InventoryAssetMatchValidationError | {
  code:
    | "acceptedProvidersEmpty"
    | "acceptedProvidersUnsupported"
    | "collectibleChainUnsupported"
    | "collectibleProviderUnsupported"
    | "contractAddressInvalid"
    | "countryCodesInvalid"
    | "countryListInvalid"
    | "genderMarkerInvalid"
    | "genderMarkerRequired"
    | "genderProviderInvalid"
    | "humanProviderRequired"
    | "minimumAgeProviderInvalid"
    | "minimumAgeRange"
    | "nationalityProviderInvalid"
    | "nftChainInvalid"
    | "passportScoreProviderInvalid"
    | "passportScoreRange"
    | "quantityRange"
    | "trustedCollectionRequired";
  params?: Record<string, string>;
};

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
function validateAcceptedProviders(input: unknown): GateAtomValidationError | null {
  if (input == null) {
    return null;
  }
  if (!Array.isArray(input) || input.length === 0) {
    return { code: "acceptedProvidersEmpty" };
  }
  return input.every((value) => DOCUMENT_PROOF_PROVIDERS.some((provider) => provider === value))
    ? null
    : { code: "acceptedProvidersUnsupported" };
}

/** Returns a stable, localizable reason the API would reject this atom, or null when it is valid. */
export function validateGateAtom(gate: GateAtom): GateAtomValidationError | null {
  const atom = gate as GateAtom & Record<string, unknown>;

  switch (gate.type) {
    case "altcha_pow":
      return null;

    case "unique_human":
      return atom.provider === "self" || atom.provider === "very"
        ? null
        : { code: "humanProviderRequired" };

    case "minimum_age": {
      if (atom.provider !== "self") {
        return { code: "minimumAgeProviderInvalid" };
      }
      const age = atom.minimum_age;
      if (!Number.isInteger(age) || (age as number) < MIN_AGE || (age as number) > MAX_AGE) {
        return { code: "minimumAgeRange", params: { max: String(MAX_AGE), min: String(MIN_AGE) } };
      }
      return validateAcceptedProviders(atom.accepted_providers);
    }

    case "nationality": {
      if (atom.provider !== "self") {
        return { code: "nationalityProviderInvalid" };
      }
      const allowed = atom.allowed;
      if (allowed != null && !Array.isArray(allowed)) {
        return { code: "countryListInvalid" };
      }
      // An empty list is valid and means "any verified nationality" — it does not admit nobody.
      const countries = Array.isArray(allowed) ? allowed : [];
      if (!countries.every(isValidCountryCode)) {
        return { code: "countryCodesInvalid" };
      }
      return validateAcceptedProviders(atom.accepted_providers);
    }

    case "gender": {
      if (atom.provider !== "self") {
        return { code: "genderProviderInvalid" };
      }
      const allowed = atom.allowed;
      if (!Array.isArray(allowed) || allowed.length === 0) {
        return { code: "genderMarkerRequired" };
      }
      if (!allowed.every((value) => value === "M" || value === "F")) {
        return { code: "genderMarkerInvalid" };
      }
      return validateAcceptedProviders(atom.accepted_providers);
    }

    case "wallet_score": {
      if (atom.provider !== "passport") {
        return { code: "passportScoreProviderInvalid" };
      }
      const score = atom.minimum_score;
      return typeof score === "number" && Number.isFinite(score) && score >= 0 && score <= 100
        ? null
        : { code: "passportScoreRange" };
    }

    case "erc721_holding": {
      if (atom.chain_namespace !== "eip155:1") {
        return { code: "nftChainInvalid" };
      }
      if (!normalizeContractAddress(atom.contract_address)) {
        return { code: "contractAddressInvalid" };
      }
      const minCount = atom.min_count;
      if (minCount != null && (!Number.isInteger(minCount) || (minCount as number) < 1 || (minCount as number) > 100)) {
        return { code: "quantityRange" };
      }
      return null;
    }

    case "erc721_inventory_match": {
      if (atom.provider !== "courtyard") {
        return { code: "collectibleProviderUnsupported" };
      }
      const chainNamespace = atom.chain_namespace;
      if (chainNamespace !== "eip155:1" && chainNamespace !== "eip155:137") {
        return { code: "collectibleChainUnsupported" };
      }
      const contractAddress = normalizeContractAddress(atom.contract_address);
      if (!contractAddress) {
        return { code: "contractAddressInvalid" };
      }
      if (!isAllowedCourtyardRegistry(chainNamespace, contractAddress)) {
        return { code: "trustedCollectionRequired" };
      }
      const minQuantity = atom.min_quantity;
      if (!Number.isInteger(minQuantity) || (minQuantity as number) < 1 || (minQuantity as number) > 100) {
        return { code: "quantityRange" };
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
