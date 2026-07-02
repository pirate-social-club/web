"use client";

import { sha256 } from "@noble/hashes/sha2.js";
import { bytesToHex } from "@noble/hashes/utils.js";

export const FILE_HASH_CHUNK_BYTES = 4 * 1024 * 1024;

export async function sha256File(file: File): Promise<string> {
  const hash = sha256.create();

  for (let offset = 0; offset < file.size; offset += FILE_HASH_CHUNK_BYTES) {
    const chunk = file.slice(offset, Math.min(offset + FILE_HASH_CHUNK_BYTES, file.size));
    hash.update(new Uint8Array(await chunk.arrayBuffer()));
  }

  return bytesToHex(hash.digest());
}
