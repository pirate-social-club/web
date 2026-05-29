import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";

import { ROUTE_MANIFEST, type RouteRenderingDomain } from "./route-manifest";
import { matchRoute, type AppRoute } from "./router";

const EXPECTED_DOMAIN_KINDS: Record<RouteRenderingDomain, readonly AppRoute["kind"][]> = {
  authenticated: [
    "home",
    "popular",
    "your-communities",
    "wallet",
    "settings-index",
    "settings",
    "create-post",
    "create-post-global",
    "community-moderation-index",
    "community-moderation",
    "create-community",
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
    "community-verification",
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
