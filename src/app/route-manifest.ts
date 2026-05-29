import type { AppRoute } from "./router";

export type RouteRenderingDomain = "authenticated" | "public" | "dual" | "telegram";

export interface RouteManifestEntry {
  kind: AppRoute["kind"];
  domain: RouteRenderingDomain;
  testPaths: ReadonlyArray<{ pathname: string; hostname?: string }>;
  serverRouteExpected: boolean;
}

export const ROUTE_MANIFEST: readonly RouteManifestEntry[] = [
  { kind: "home", domain: "authenticated", testPaths: [{ pathname: "/" }], serverRouteExpected: true },
  { kind: "popular", domain: "authenticated", testPaths: [{ pathname: "/popular" }], serverRouteExpected: true },
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
  { kind: "telegram-join", domain: "telegram", testPaths: [{ pathname: "/tg/join/com_test" }], serverRouteExpected: true },
  { kind: "telegram-verify", domain: "telegram", testPaths: [{ pathname: "/tg/verify/com_test" }], serverRouteExpected: true },
  { kind: "telegram-community", domain: "telegram", testPaths: [{ pathname: "/tg/c/com_test" }], serverRouteExpected: true },
  { kind: "telegram-post", domain: "telegram", testPaths: [{ pathname: "/tg/p/pst_test" }], serverRouteExpected: true },
  { kind: "not-found", domain: "authenticated", testPaths: [{ pathname: "/nonexistent-manifest-test" }], serverRouteExpected: false },
];

const _KIND_COVERAGE: { [K in AppRoute["kind"]]: true } = {
  home: true,
  popular: true,
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
  "telegram-join": true,
  "telegram-verify": true,
  "telegram-community": true,
  "telegram-post": true,
  "not-found": true,
};
void _KIND_COVERAGE;
