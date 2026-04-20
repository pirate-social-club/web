"use client";

const textEncoder = new TextEncoder();

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

function bytesToHex(bytes: Uint8Array): string {
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("");
}

function ensureBrowserCrypto(): SubtleCrypto {
  const subtle = globalThis.crypto?.subtle;
  if (!subtle) {
    throw new Error("This browser does not support secure agent registration.");
  }
  return subtle;
}

export async function createSignedAgentChallenge(input: { message: string; timestamp?: number }) {
  const subtle = ensureBrowserCrypto();
  const timestamp = input.timestamp ?? Date.now();
  const keyPair = await subtle.generateKey({ name: "Ed25519" }, true, ["sign", "verify"]);

  if (!("privateKey" in keyPair) || !("publicKey" in keyPair)) {
    throw new Error("Could not create an agent signing key.");
  }

  const publicKeySpkiPromise = subtle.exportKey("spki", keyPair.publicKey);
  const [publicKeySpki, privateKeyPkcs8, signature] = await Promise.all([
    publicKeySpkiPromise,
    subtle.exportKey("pkcs8", keyPair.privateKey),
    subtle.sign("Ed25519", keyPair.privateKey, textEncoder.encode(input.message)),
  ]);
  const deviceDigest = await subtle.digest("SHA-256", publicKeySpki);
  const deviceId = `device_${bytesToHex(new Uint8Array(deviceDigest)).slice(0, 16)}`;

  return {
    deviceId,
    privateKeyPem: encodePem("PRIVATE KEY", privateKeyPkcs8),
    publicKeyPem: encodePem("PUBLIC KEY", publicKeySpki),
    publicKeyDerBase64: arrayBufferToBase64(publicKeySpki),
    agentChallenge: {
      device_id: deviceId,
      message: input.message,
      public_key: arrayBufferToBase64(publicKeySpki),
      signature: arrayBufferToBase64(signature),
      timestamp,
    },
  };
}
