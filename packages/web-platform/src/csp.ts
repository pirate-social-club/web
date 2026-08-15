export interface SolidCspOptions {
  nonce: string;
  allowWasmUnsafeEval?: boolean;
}

/** Build the per-request policy shared by the Solid perimeter and tests. */
export function buildSolidContentSecurityPolicy({ nonce, allowWasmUnsafeEval = false }: SolidCspOptions): string {
  const scriptSources = [`'nonce-${nonce}'`, "'strict-dynamic'"];
  if (allowWasmUnsafeEval) scriptSources.push("'wasm-unsafe-eval'");
  return [
    "default-src 'self'",
    `script-src ${scriptSources.join(" ")}`,
    "object-src 'none'",
    "base-uri 'none'",
    "connect-src 'self' https://api.pirate.sc https://api-staging.pirate.sc",
    "img-src 'self' data: https:",
    "media-src 'self' https:",
    "font-src 'self' data:",
    "form-action 'self'",
    "frame-ancestors 'self'",
  ].join("; ");
}
