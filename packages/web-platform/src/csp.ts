export interface SolidCspOptions {
  nonce: string;
  allowWasmUnsafeEval?: boolean;
  allowLocalApiOrigin?: boolean;
}

/** Build the per-request policy shared by the Solid perimeter and tests. */
export function buildSolidContentSecurityPolicy({
  nonce,
  allowWasmUnsafeEval = false,
  allowLocalApiOrigin = false,
}: SolidCspOptions): string {
  const scriptSources = ["'self'", `'nonce-${nonce}'`, "'strict-dynamic'"];
  if (allowWasmUnsafeEval) scriptSources.push("'wasm-unsafe-eval'");
  const connectSources = ["'self'", "https://api.pirate.sc", "https://api-staging.pirate.sc"];
  if (allowLocalApiOrigin) connectSources.push("http://127.0.0.1:8787");
  return [
    "default-src 'self'",
    `script-src ${scriptSources.join(" ")}`,
    "object-src 'none'",
    "base-uri 'none'",
    `connect-src ${connectSources.join(" ")}`,
    "img-src 'self' data: https:",
    "media-src 'self' https:",
    "font-src 'self' data:",
    "style-src 'self' 'unsafe-inline'",
    "form-action 'self'",
    "frame-ancestors 'self'",
    "worker-src 'self' blob:",
    "manifest-src 'self'",
  ].join("; ");
}
