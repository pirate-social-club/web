import { describe, expect, test } from "bun:test";

import {
  buildAgentActionProof,
  canonicalizeAgentActionProofRequest,
  canonicalizeAgentActionProofSignaturePayload,
  computeAgentActionProofHash,
} from "./browser-agent-action-proof";

function arrayBufferToBase64(value: ArrayBuffer): string {
  const bytes = new Uint8Array(value);
  let binary = "";

  for (let index = 0; index < bytes.length; index += 0x8000) {
    const chunk = bytes.subarray(index, index + 0x8000);
    binary += String.fromCharCode(...chunk);
  }

  return btoa(binary);
}

function encodePem(label: string, value: ArrayBuffer): string {
  const base64 = arrayBufferToBase64(value);
  const lines = base64.match(/.{1,64}/g) ?? [base64];
  return `-----BEGIN ${label}-----\n${lines.join("\n")}\n-----END ${label}-----`;
}

async function createTestSigningKey() {
  const keyPair = await globalThis.crypto.subtle.generateKey({ name: "Ed25519" }, true, ["sign", "verify"]);

  if (!("privateKey" in keyPair) || !("publicKey" in keyPair)) {
    throw new Error("Could not create an agent signing key.");
  }

  const [publicKeySpki, privateKeyPkcs8] = await Promise.all([
    globalThis.crypto.subtle.exportKey("spki", keyPair.publicKey),
    globalThis.crypto.subtle.exportKey("pkcs8", keyPair.privateKey),
  ]);

  return {
    privateKeyPem: encodePem("PRIVATE KEY", privateKeyPkcs8),
    publicKeyPem: encodePem("PUBLIC KEY", publicKeySpki),
  };
}

function decodePemBase64(pem: string): ArrayBuffer {
  const body = pem
    .replace(/-----BEGIN [^-]+-----/g, "")
    .replace(/-----END [^-]+-----/g, "")
    .replace(/\s+/g, "");
  const binary = atob(body);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }
  return bytes.buffer;
}

function decodeBase64Like(value: string): ArrayBuffer {
  const normalized = value.trim().replace(/-/g, "+").replace(/_/g, "/");
  const paddingLength = (4 - (normalized.length % 4)) % 4;
  const binary = atob(`${normalized}${"=".repeat(paddingLength)}`);
  const bytes = Uint8Array.from(binary, (char) => char.charCodeAt(0));
  return bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength);
}

describe("browser agent action proof", () => {
  test("canonicalizes request bodies recursively with UTF-8 key ordering", () => {
    const canonical = canonicalizeAgentActionProofRequest({
      method: "post",
      url: "https://pirate.test/communities/cmt_test/posts?z=1&%C3%A4=2",
      body: {
        body: "Hello",
        nested: { z: 1, ä: 2 },
        post_type: "text",
        title: "Test",
      },
    });

    expect(canonical).toContain("pirate-agent-action-proof-v2");
    expect(canonical).toContain("POST");
    expect(canonical).toContain("https://pirate.test");
    expect(canonical).toContain("/communities/cmt_test/posts");
    expect(canonical).toContain("z=1&%C3%A4=2");
    expect(canonical).toContain('{"body":"Hello","nested":{"z":1,"ä":2},"post_type":"text","title":"Test"}');
  });

  test("builds a verifiable Ed25519 proof from a stored private key", async () => {
    const signingKey = await createTestSigningKey();
    const proof = await buildAgentActionProof({
      method: "POST",
      url: "https://pirate.test/communities/cmt_test/posts",
      body: {
        body: "Hello from agent",
        post_type: "text",
        title: "Ship log",
      },
      privateKeyPem: signingKey.privateKeyPem,
    });
    const expectedHash = await computeAgentActionProofHash({
      method: "POST",
      url: "https://pirate.test/communities/cmt_test/posts",
      body: {
        body: "Hello from agent",
        post_type: "text",
        title: "Ship log",
      },
    });
    const publicKey = await globalThis.crypto.subtle.importKey(
      "spki",
      decodePemBase64(signingKey.publicKeyPem),
      { name: "Ed25519" },
      false,
      ["verify"],
    );
    const payload = canonicalizeAgentActionProofSignaturePayload({
      nonce: proof.nonce,
      signedAt: proof.signed_at,
      canonicalRequestHash: proof.canonical_request_hash,
    });
    const verified = await globalThis.crypto.subtle.verify(
      "Ed25519",
      publicKey,
      decodeBase64Like(proof.signature),
      new TextEncoder().encode(payload),
    );

    expect(proof.canonical_request_hash).toBe(expectedHash);
    expect(verified).toBe(true);
  });

  test("binds the canonical request hash to the request origin", async () => {
    const httpHash = await computeAgentActionProofHash({
      method: "POST",
      url: "http://pirate.test/communities/cmt_test/posts",
      body: { title: "Ship log" },
    });
    const httpsHash = await computeAgentActionProofHash({
      method: "POST",
      url: "https://pirate.test/communities/cmt_test/posts",
      body: { title: "Ship log" },
    });

    expect(httpHash === httpsHash).toBe(false);
  });

  test("rejects circular JSON bodies", () => {
    const body: Record<string, unknown> = { title: "loop" };
    body.self = body;

    let thrown: unknown = null;
    try {
      canonicalizeAgentActionProofRequest({
        method: "POST",
        url: "https://pirate.test/example",
        body,
      });
    } catch (error) {
      thrown = error;
    }

    expect(thrown instanceof Error ? thrown.message : String(thrown)).toContain("circular references");
  });
});
