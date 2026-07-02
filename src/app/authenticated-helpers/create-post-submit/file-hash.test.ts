import { describe, expect, test } from "bun:test";

import { FILE_HASH_CHUNK_BYTES, sha256File } from "./file-hash";

describe("sha256File", () => {
  test("hashes file bytes incrementally", async () => {
    const file = new File(["abc"], "abc.txt", { type: "text/plain" });

    await expect(sha256File(file)).resolves.toBe(
      "ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad",
    );
  });

  test("does not read the entire File through file.arrayBuffer", async () => {
    const chunks = [
      new Uint8Array([1, 2, 3]),
      new Uint8Array([4, 5]),
      new Uint8Array([6]),
    ];
    const file = new File(chunks, "chunked.bin", { type: "application/octet-stream" });
    const sliceCalls: Array<[number | undefined, number | undefined]> = [];
    const originalSlice = file.slice.bind(file);

    Object.defineProperty(file, "size", {
      configurable: true,
      value: FILE_HASH_CHUNK_BYTES * 2 + 1,
    });
    Object.defineProperty(file, "arrayBuffer", {
      configurable: true,
      value: () => {
        throw new Error("top-level file arrayBuffer should not be called");
      },
    });
    Object.defineProperty(file, "slice", {
      configurable: true,
      value: (start?: number, end?: number, contentType?: string) => {
        sliceCalls.push([start, end]);
        return originalSlice(start === undefined ? undefined : start % file.size, end === undefined ? undefined : end % file.size, contentType);
      },
    });

    await sha256File(file);

    expect(sliceCalls).toEqual([
      [0, FILE_HASH_CHUNK_BYTES],
      [FILE_HASH_CHUNK_BYTES, FILE_HASH_CHUNK_BYTES * 2],
      [FILE_HASH_CHUNK_BYTES * 2, FILE_HASH_CHUNK_BYTES * 2 + 1],
    ]);
  });
});
