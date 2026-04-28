import type { WebBotAuthEnv } from "./types";
import { bytesToBase64, bytesToBase64Url, structuredFieldString } from "./shared";

async function ed25519JwkThumbprint(jwk: JsonWebKey): Promise<string> {
  if (jwk.kty !== "OKP" || jwk.crv !== "Ed25519" || typeof jwk.x !== "string") {
    throw new Error("WEB_BOT_AUTH_PRIVATE_JWK must be an Ed25519 private JWK with public x coordinate");
  }

  const canonical = JSON.stringify({ crv: jwk.crv, kty: jwk.kty, x: jwk.x });
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(canonical));
  return bytesToBase64Url(digest);
}

function parseWebBotAuthPrivateJwk(value: string | undefined): JsonWebKey | null {
  const trimmed = value?.trim();
  if (!trimmed) {
    return null;
  }

  const parsed = JSON.parse(trimmed) as JsonWebKey;
  if (parsed.kty !== "OKP" || parsed.crv !== "Ed25519" || typeof parsed.d !== "string" || typeof parsed.x !== "string") {
    throw new Error("WEB_BOT_AUTH_PRIVATE_JWK must be an Ed25519 private JWK containing kty, crv, x, and d");
  }

  return {
    ...parsed,
    ext: true,
    key_ops: ["sign"],
  };
}

function webBotAuthPublicJwk(jwk: JsonWebKey, kid: string): Record<string, unknown> {
  return {
    kty: "OKP",
    crv: "Ed25519",
    x: jwk.x,
    kid,
    alg: "EdDSA",
    use: "sig",
    key_ops: ["verify"],
  };
}

export async function buildWebBotAuthDirectoryResponse(request: Request, env: WebBotAuthEnv): Promise<Response> {
  const privateJwk = parseWebBotAuthPrivateJwk(env.WEB_BOT_AUTH_PRIVATE_JWK);
  if (!privateJwk) {
    return new Response("Not found", { status: 404 });
  }

  const keyid = await ed25519JwkThumbprint(privateJwk);
  const body = JSON.stringify({ keys: [webBotAuthPublicJwk(privateJwk, keyid)] }, null, 2);
  const created = Math.floor(Date.now() / 1000);
  const expires = created + 300;
  const nonceBytes = new Uint8Array(32);
  crypto.getRandomValues(nonceBytes);

  const authority = request.headers.get("host") ?? new URL(request.url).host;
  const nonce = bytesToBase64(nonceBytes);
  const signatureParams = [
    `("@authority";req)`,
    `alg="ed25519"`,
    `keyid=${structuredFieldString(keyid)}`,
    `nonce=${structuredFieldString(nonce)}`,
    `tag="http-message-signatures-directory"`,
    `created=${created}`,
    `expires=${expires}`,
  ].join(";");
  const signatureInput = `sig1=${signatureParams}`;
  const signatureBase = `"@authority";req: ${authority}\n"@signature-params": ${signatureParams}`;
  const privateKey = await crypto.subtle.importKey(
    "jwk",
    privateJwk,
    { name: "Ed25519" },
    false,
    ["sign"],
  );
  const signature = await crypto.subtle.sign(
    { name: "Ed25519" },
    privateKey,
    new TextEncoder().encode(signatureBase),
  );

  return new Response(body, {
    headers: {
      "cache-control": "public, max-age=60, s-maxage=60",
      "content-type": "application/http-message-signatures-directory+json; charset=utf-8",
      "signature": `sig1=:${bytesToBase64(signature)}:`,
      "signature-input": signatureInput,
    },
  });
}
