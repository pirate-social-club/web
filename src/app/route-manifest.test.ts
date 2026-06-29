import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";

import { matchRoute, type AppRoute } from "./router";

type RouteRenderingDomain = "authenticated" | "public" | "dual" | "telegram";

interface RouteManifestEntry {
  kind: AppRoute["kind"];
  domain: RouteRenderingDomain;
  testPaths: ReadonlyArray<{ pathname: string; hostname?: string }>;
  serverRouteExpected: boolean;
}

const ROUTE_MANIFEST: readonly RouteManifestEntry[] = [
  { kind: "home", domain: "authenticated", testPaths: [{ pathname: "/" }], serverRouteExpected: true },
  { kind: "popular", domain: "authenticated", testPaths: [{ pathname: "/popular" }], serverRouteExpected: true },
  { kind: "search", domain: "authenticated", testPaths: [{ pathname: "/search" }], serverRouteExpected: true },
  { kind: "public-profile", domain: "public", testPaths: [{ pathname: "/u/test-handle" }, { pathname: "/", hostname: "test.pirate" }], serverRouteExpected: true },
  { kind: "public-agent", domain: "public", testPaths: [{ pathname: "/a/test-agent" }, { pathname: "/", hostname: "test.clawitzer" }], serverRouteExpected: true },
  { kind: "your-communities", domain: "authenticated", testPaths: [{ pathname: "/your-communities" }], serverRouteExpected: true },
  { kind: "wallet", domain: "authenticated", testPaths: [{ pathname: "/wallet" }, { pathname: "/settings/wallet" }], serverRouteExpected: true },
  { kind: "settings-index", domain: "authenticated", testPaths: [{ pathname: "/settings" }], serverRouteExpected: true },
  { kind: "settings", domain: "authenticated", testPaths: [{ pathname: "/settings/profile" }], serverRouteExpected: true },
  { kind: "create-post", domain: "authenticated", testPaths: [{ pathname: "/c/com_test/submit" }], serverRouteExpected: true },
  { kind: "create-post-global", domain: "authenticated", testPaths: [{ pathname: "/submit" }], serverRouteExpected: true },
  { kind: "community-moderation-index", domain: "authenticated", testPaths: [{ pathname: "/c/com_test/mod" }], serverRouteExpected: true },
  { kind: "community-moderation", domain: "authenticated", testPaths: [{ pathname: "/c/com_test/mod/queue" }], serverRouteExpected: true },
  { kind: "community", domain: "dual", testPaths: [{ pathname: "/c/com_test" }], serverRouteExpected: true },
  { kind: "create-community", domain: "authenticated", testPaths: [{ pathname: "/communities/new" }], serverRouteExpected: true },
  { kind: "post", domain: "dual", testPaths: [{ pathname: "/p/pst_test" }], serverRouteExpected: true },
  { kind: "live-room", domain: "dual", testPaths: [{ pathname: "/p/pst_test/live" }], serverRouteExpected: true },
  { kind: "post-karaoke", domain: "authenticated", testPaths: [{ pathname: "/p/pst_test/karaoke" }], serverRouteExpected: true },
  { kind: "post-study", domain: "authenticated", testPaths: [{ pathname: "/p/pst_test/study" }], serverRouteExpected: true },
  { kind: "crosspost", domain: "authenticated", testPaths: [{ pathname: "/p/pst_test/crosspost" }], serverRouteExpected: true },
  { kind: "inbox", domain: "authenticated", testPaths: [{ pathname: "/inbox" }], serverRouteExpected: true },
  { kind: "chat", domain: "authenticated", testPaths: [{ pathname: "/chat" }], serverRouteExpected: true },
  { kind: "chat-new", domain: "authenticated", testPaths: [{ pathname: "/chat/new" }], serverRouteExpected: true },
  { kind: "chat-conversation", domain: "authenticated", testPaths: [{ pathname: "/chat/c/conv_test" }], serverRouteExpected: true },
  { kind: "chat-target", domain: "authenticated", testPaths: [{ pathname: "/chat/to/target_test" }], serverRouteExpected: true },
  { kind: "advertise", domain: "authenticated", testPaths: [{ pathname: "/advertise" }], serverRouteExpected: true },
  { kind: "me", domain: "authenticated", testPaths: [{ pathname: "/me" }], serverRouteExpected: true },
  { kind: "onboarding", domain: "authenticated", testPaths: [{ pathname: "/onboarding" }], serverRouteExpected: true },
  { kind: "authorize-device", domain: "authenticated", testPaths: [{ pathname: "/authorize-device" }], serverRouteExpected: true },
  { kind: "telegram-mini-app", domain: "telegram", testPaths: [{ pathname: "/tg" }], serverRouteExpected: true },
  { kind: "telegram-exchange", domain: "telegram", testPaths: [{ pathname: "/tg/exchange" }], serverRouteExpected: true },
  { kind: "telegram-self-return", domain: "telegram", testPaths: [{ pathname: "/tg/self-return" }, { pathname: "/tg/self-return/com_test" }], serverRouteExpected: true },
  { kind: "telegram-link-existing", domain: "authenticated", testPaths: [{ pathname: "/tg/link-existing" }], serverRouteExpected: true },
  { kind: "telegram-join", domain: "telegram", testPaths: [{ pathname: "/tg/join/com_test" }], serverRouteExpected: true },
  { kind: "telegram-verify", domain: "telegram", testPaths: [{ pathname: "/tg/verify/com_test" }], serverRouteExpected: true },
  { kind: "telegram-community", domain: "telegram", testPaths: [{ pathname: "/tg/c/com_test" }], serverRouteExpected: true },
  { kind: "telegram-post", domain: "telegram", testPaths: [{ pathname: "/tg/p/pst_test" }], serverRouteExpected: true },
  { kind: "not-found", domain: "authenticated", testPaths: [{ pathname: "/nonexistent-manifest-test" }], serverRouteExpected: false },
];

const _KIND_COVERAGE: { [K in AppRoute["kind"]]: true } = {
  home: true,
  popular: true,
  search: true,
  "public-profile": true,
  "public-agent": true,
  "your-communities": true,
  wallet: true,
  "settings-index": true,
  settings: true,
  "create-post": true,
  "create-post-global": true,
  "community-moderation-index": true,
  "community-moderation": true,
  community: true,
  "create-community": true,
  post: true,
  "live-room": true,
  "post-karaoke": true,
  "post-study": true,
  crosspost: true,
  inbox: true,
  chat: true,
  "chat-new": true,
  "chat-conversation": true,
  "chat-target": true,
  advertise: true,
  me: true,
  onboarding: true,
  "authorize-device": true,
  "telegram-mini-app": true,
  "telegram-exchange": true,
  "telegram-self-return": true,
  "telegram-link-existing": true,
  "telegram-join": true,
  "telegram-verify": true,
  "telegram-community": true,
  "telegram-post": true,
  "not-found": true,
};
void _KIND_COVERAGE;

const EXPECTED_DOMAIN_KINDS: Record<RouteRenderingDomain, readonly AppRoute["kind"][]> = {
  authenticated: [
    "home",
    "popular",
    "search",
    "your-communities",
    "wallet",
    "settings-index",
    "settings",
    "create-post",
    "create-post-global",
    "community-moderation-index",
    "community-moderation",
    "create-community",
    "post-karaoke",
    "post-study",
    "crosspost",
    "inbox",
    "chat",
    "chat-new",
    "chat-conversation",
    "chat-target",
    "advertise",
    "me",
    "onboarding",
    "authorize-device",
    "telegram-link-existing",
    "not-found",
  ],
  public: [
    "public-profile",
    "public-agent",
  ],
  dual: [
    "community",
    "post",
    "live-room",
  ],
  telegram: [
    "telegram-mini-app",
    "telegram-exchange",
    "telegram-self-return",
    "telegram-join",
    "telegram-verify",
    "telegram-community",
    "telegram-post",
  ],
};

const DOCUMENTED_NO_SERVER_ROUTE_KINDS: readonly AppRoute["kind"][] = [
  "not-found",
];

function extractWorkerAppRoutePatterns(): string[] {
  const workerSource = readFileSync(join(import.meta.dir, "../worker.tsx"), "utf8");
  const appRoutePattern = /route\(\s*(["`])([^"`]+)\1\s*,/g;
  const patterns: string[] = [];
  let match: RegExpExecArray | null;
  while ((match = appRoutePattern.exec(workerSource)) !== null) {
    patterns.push(match[2]);
  }
  return patterns;
}

function serverPatternMatchesPath(pattern: string, pathname: string): boolean {
  if (pattern === "/" || pathname === "/") {
    return pattern === pathname;
  }

  const patternSegments = pattern.split("/").filter(Boolean);
  const pathSegments = pathname.split("/").filter(Boolean);
  if (patternSegments.length !== pathSegments.length) {
    return false;
  }

  return patternSegments.every((patternSegment, index) => {
    return patternSegment.startsWith(":")
      || (patternSegment.startsWith("${") && patternSegment.endsWith("}"))
      || patternSegment === pathSegments[index];
  });
}

describe("route manifest", () => {
  test("matchRoute resolves every documented test path to its declared kind", () => {
    for (const entry of ROUTE_MANIFEST) {
      for (const { hostname, pathname } of entry.testPaths) {
        expect(matchRoute(pathname, hostname).kind).toBe(entry.kind);
      }
    }
  });

  test("only documented exceptions lack server routes", () => {
    const kindsWithoutServerRoutes = ROUTE_MANIFEST
      .filter((entry) => !entry.serverRouteExpected)
      .map((entry) => entry.kind)
      .sort();

    expect(kindsWithoutServerRoutes).toEqual([...DOCUMENTED_NO_SERVER_ROUTE_KINDS].sort());
  });

  test("server route expectations match worker registrations", () => {
    const workerPatterns = extractWorkerAppRoutePatterns();

    for (const entry of ROUTE_MANIFEST) {
      if (entry.serverRouteExpected) {
        expect(entry.testPaths.length).toBeGreaterThan(0);
      }

      for (const { pathname } of entry.testPaths) {
        const hasWorkerRoute = workerPatterns.some((pattern) =>
          serverPatternMatchesPath(pattern, pathname)
        );
        expect(hasWorkerRoute).toBe(entry.serverRouteExpected);
      }
    }
  });

  test("rendering domains partition route kinds", () => {
    const expectedDomainByKind = new Map<AppRoute["kind"], RouteRenderingDomain>();
    for (const [domain, kinds] of Object.entries(EXPECTED_DOMAIN_KINDS) as Array<[RouteRenderingDomain, readonly AppRoute["kind"][]]>) {
      for (const kind of kinds) {
        expect(expectedDomainByKind.has(kind)).toBe(false);
        expectedDomainByKind.set(kind, domain);
      }
    }

    const manifestKinds = ROUTE_MANIFEST.map((entry) => entry.kind).sort();
    expect(manifestKinds).toEqual([...expectedDomainByKind.keys()].sort());

    for (const entry of ROUTE_MANIFEST) {
      expect(entry.domain).toBe(expectedDomainByKind.get(entry.kind));
    }
  });

  test("has no duplicate kind entries", () => {
    const seen = new Set<AppRoute["kind"]>();
    const duplicates: AppRoute["kind"][] = [];

    for (const { kind } of ROUTE_MANIFEST) {
      if (seen.has(kind)) {
        duplicates.push(kind);
      }
      seen.add(kind);
    }

    expect(duplicates).toEqual([]);
  });
});
