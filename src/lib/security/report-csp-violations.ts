import { logger } from "@/lib/logger";

// Several third-party SDKs (e.g. the Self QR flow) swallow transport errors,
// so a missing connect-src entry hangs the integration with no surfaced
// error. The securitypolicyviolation event is the only browser-side channel
// that reports a CSP-blocked request — log every enforced violation so a
// missing allowlist entry self-reports (logger.error reaches Sentry) instead
// of hiding the way the 2026-07 Self verification outage did.

let installed = false;
const reportedViolations = new Set<string>();

// Drop the query string: same-origin blocks report the full URL, and a token
// or session id in a query must never reach the error tracker. blockedURI is
// sometimes a non-URL literal ("inline", "eval"), which is kept as-is.
function sanitizeBlockedUri(blockedURI: string): string {
  try {
    const url = new URL(blockedURI);
    if (url.origin === "null") {
      return url.protocol;
    }
    return `${url.origin}${url.pathname}`;
  } catch {
    return blockedURI;
  }
}

export function reportContentSecurityPolicyViolations(): void {
  if (installed || typeof document === "undefined") {
    return;
  }
  installed = true;
  document.addEventListener("securitypolicyviolation", (event) => {
    if (event.disposition && event.disposition !== "enforce") {
      return;
    }
    const directive = event.effectiveDirective || event.violatedDirective || "unknown";
    const blockedURI = sanitizeBlockedUri(event.blockedURI || "");
    let host = blockedURI;
    try {
      host = new URL(blockedURI).host;
    } catch {
      // Non-URL literal; dedupe on the literal itself.
    }
    // A per-resource violation (e.g. img-src on a feed) fires once per
    // resource; log each unique directive+host once per session so a flood
    // of identical blocks cannot exhaust the error budget.
    const dedupeKey = `${directive} ${host}`;
    if (reportedViolations.has(dedupeKey)) {
      return;
    }
    reportedViolations.add(dedupeKey);
    const payload = {
      blockedURI,
      effectiveDirective: directive,
      sourceFile: event.sourceFile,
      violatedDirective: event.violatedDirective,
    };
    // connect-src blocks break flows (verification, rewards); the rest are
    // usually cosmetic and should not page ops at error severity.
    if (directive.startsWith("connect-src")) {
      logger.error("[csp] blocked request", payload);
    } else {
      logger.warn("[csp] blocked request", payload);
    }
  });
}
