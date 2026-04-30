import { applyFrameDenyHeader } from "@/lib/security-headers";

export const CSP_HEADER = "Content-Security-Policy";
export const CSP_REPORT_ONLY_HEADER = "Content-Security-Policy-Report-Only";

export type SecurityHeadersMode = {
  dev: boolean;
  reportOnly: boolean;
};

export function buildContentSecurityPolicy(nonce: string): string {
  const directives: string[] = [
    "default-src 'self'",
    `script-src 'self' 'nonce-${nonce}' 'wasm-unsafe-eval' https://challenges.cloudflare.com https://platform.x.com https://platform.twitter.com`,
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: blob: https:",
    "media-src 'self' blob: https:",
    "font-src 'self' data:",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'",
    [
      "child-src",
      "https://auth.privy.io",
      "https://verify.walletconnect.com",
      "https://verify.walletconnect.org",
    ].join(" "),
    [
      "frame-src",
      "https://auth.privy.io",
      "https://verify.walletconnect.com",
      "https://verify.walletconnect.org",
      "https://challenges.cloudflare.com",
      "https://platform.x.com",
      "https://platform.twitter.com",
      "https://syndication.twitter.com",
      "https://x.com",
      "https://twitter.com",
      "https://www.youtube.com",
      "https://www.youtube-nocookie.com",
    ].join(" "),
    [
      "connect-src",
      "'self'",
      "https://api.pirate",
      "https://api.pirate.sc",
      "https://api-staging.pirate.sc",
      "https://assistant.pirate.sc",
      "https://assistant-staging.pirate.sc",
      "https://auth.privy.io",
      "wss://relay.walletconnect.com",
      "wss://relay.walletconnect.org",
      "wss://www.walletlink.org",
      "https://*.rpc.privy.systems",
      "https://explorer-api.walletconnect.com",
      "https://api.ethfollow.xyz",
      "https://mainnet.base.org",
      "https://sepolia.base.org",
      "https://eth.merkle.io",
      "https://cloudflare-eth.com",
      "https://11155111.rpc.thirdweb.com",
      "https://mainnet.optimism.io",
      "https://sepolia.optimism.io",
      "https://mainnet.storyrpc.io",
      "https://aeneid.storyrpc.io",
      "https://rpc.moderato.tempo.xyz",
      "https://g.w.lavanet.xyz",
      "https://api.very.org",
      "https://bridge.very.org",
      "https://verify.very.org",
      "https://platform.x.com",
      "https://platform.twitter.com",
      "https://syndication.twitter.com",
      "https://x.com",
      "https://twitter.com",
    ].join(" "),
    "worker-src 'self' blob:",
    "manifest-src 'self'",
  ];

  return directives.join("; ");
}

export function applySecurityHeaders(headers: Headers, nonce: string, mode: SecurityHeadersMode): void {
  if (mode.dev) {
    return;
  }

  applyFrameDenyHeader(headers);
  headers.set(
    mode.reportOnly ? CSP_REPORT_ONLY_HEADER : CSP_HEADER,
    buildContentSecurityPolicy(nonce),
  );
  headers.set("X-Content-Type-Options", "nosniff");
  headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  headers.set("Permissions-Policy", "camera=(), microphone=(), geolocation=()");
}
