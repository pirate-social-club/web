import { describe, expect, test } from "bun:test";

import { installCryptoRandomUuidFallback } from "./crypto-random-uuid";

describe("installCryptoRandomUuidFallback", () => {
  test("keeps a native randomUUID implementation", () => {
    const native = () => "00000000-0000-4000-8000-000000000000" as const;
    const target = {
      getRandomValues: <T extends ArrayBufferView | null>(value: T) => value,
      randomUUID: native,
    };

    expect(installCryptoRandomUuidFallback(target)).toBe(false);
    expect(target.randomUUID).toBe(native);
  });

  test("builds an RFC 4122 UUID v4 from secure random bytes", () => {
    const target: {
      getRandomValues: Crypto["getRandomValues"];
      randomUUID?: Crypto["randomUUID"];
    } = {
      getRandomValues: <T extends ArrayBufferView | null>(value: T) => {
        if (value instanceof Uint8Array) {
          value.set([0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15]);
        }
        return value;
      },
    };

    expect(installCryptoRandomUuidFallback(target)).toBe(true);
    expect(target.randomUUID?.()).toBe("00010203-0405-4607-8809-0a0b0c0d0e0f");
  });

  test("fails closed when no secure random source exists", () => {
    expect(installCryptoRandomUuidFallback(undefined)).toBe(false);
  });
});
