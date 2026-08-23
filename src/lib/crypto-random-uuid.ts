type CryptoWithOptionalRandomUuid = Pick<Crypto, "getRandomValues"> & {
  randomUUID?: Crypto["randomUUID"];
};

function uuidV4FromRandomBytes(bytes: Uint8Array): ReturnType<Crypto["randomUUID"]> {
  bytes[6] = (bytes[6] & 0x0f) | 0x40;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;

  const hex = Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0"));
  return [
    hex.slice(0, 4).join(""),
    hex.slice(4, 6).join(""),
    hex.slice(6, 8).join(""),
    hex.slice(8, 10).join(""),
    hex.slice(10, 16).join(""),
  ].join("-") as ReturnType<Crypto["randomUUID"]>;
}

/**
 * Chromium withholds `crypto.randomUUID` from plaintext origins even though it
 * still exposes the cryptographically secure `getRandomValues` primitive.
 * Install the equivalent UUID-v4 operation before React hydration so public
 * read-only HNS pages can render without weakening idempotency identifiers.
 */
export function installCryptoRandomUuidFallback(
  target: CryptoWithOptionalRandomUuid | undefined = globalThis.crypto,
): boolean {
  if (!target || typeof target.getRandomValues !== "function") return false;
  if (typeof target.randomUUID === "function") return false;

  Object.defineProperty(target, "randomUUID", {
    configurable: true,
    value: () => uuidV4FromRandomBytes(target.getRandomValues(new Uint8Array(16))),
    writable: true,
  });
  return true;
}
