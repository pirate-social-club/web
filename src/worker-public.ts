import {
  renderPublicAgentPage,
  renderPublicProfileErrorPage,
  renderPublicProfilePage,
} from "./worker-public-html";
import { resolveLocaleLanguageTag, resolveRequestLocale } from "./lib/ui-locale-core";
import { getLocaleMessages } from "./locales";
import {
  X_FRAME_OPTIONS_DENY,
  X_FRAME_OPTIONS_HEADER,
} from "./lib/security-headers";
import type {
  Env,
  PublicAgentResolution,
  PublicProfileResolution,
} from "./worker-public.types";

type PublicProfileRequestTarget =
  | { kind: "host"; handleLabel: string; hostSuffix: string; identityKind: "profile" | "agent" }
  | { kind: "path"; handleLabel: string };

const RESERVED_PUBLIC_PROFILE_HOSTS = new Set([
  "www",
  "api",
  "api-staging",
  "spaces",
  "app",
  "admin",
  "assets",
  "static",
  "cdn",
  "dev",
  "staging",
]);

const PUBLIC_PROFILE_HOST_SUFFIXES = ["pirate", "clawitzer", "localhost"];

function extractPublicProfileHost(
  hostname: string,
): { handleLabel: string; hostSuffix: string; identityKind: "profile" | "agent" } | null {
  const normalizedHostname = hostname.trim().toLowerCase().replace(/\.+$/u, "");
  if (!normalizedHostname || normalizedHostname === "localhost") {
    return null;
  }

  for (const hostSuffix of PUBLIC_PROFILE_HOST_SUFFIXES) {
    if (!normalizedHostname.endsWith(`.${hostSuffix}`)) {
      continue;
    }

    const subdomain = normalizedHostname.slice(0, -(hostSuffix.length + 1));
    if (!subdomain || subdomain.includes(".") || RESERVED_PUBLIC_PROFILE_HOSTS.has(subdomain)) {
      return null;
    }

    return {
      handleLabel: subdomain,
      hostSuffix,
      identityKind: hostSuffix === "clawitzer" ? "agent" : "profile",
    };
  }

  return null;
}

function extractPathPublicProfile(url: URL): { handleLabel: string } | null {
  const normalizedHostname = url.hostname.trim().toLowerCase().replace(/\.+$/u, "");
  const supportedHosts = new Set(["pirate.sc", "staging.pirate.sc", "localhost"]);

  if (!supportedHosts.has(normalizedHostname)) {
    return null;
  }

  const segments = url.pathname.split("/").filter(Boolean);
  if (segments.length !== 2 || segments[0] !== "u") {
    return null;
  }

  const handleLabel = decodeURIComponent(segments[1]).trim();
  if (!handleLabel) {
    return null;
  }

  return { handleLabel };
}

function extractPublicProfileRequestTarget(url: URL): PublicProfileRequestTarget | null {
  const hostTarget = extractPublicProfileHost(url.hostname);
  if (hostTarget) {
    return {
      kind: "host",
      handleLabel: hostTarget.handleLabel,
      hostSuffix: hostTarget.hostSuffix,
      identityKind: hostTarget.identityKind,
    };
  }

  const pathTarget = extractPathPublicProfile(url);
  if (pathTarget) {
    return {
      kind: "path",
      handleLabel: pathTarget.handleLabel,
    };
  }

  return null;
}

function resolveApiOrigin(env: Env, hostSuffix: string): string {
  if (env.HNS_PUBLIC_API_ORIGIN) {
    return env.HNS_PUBLIC_API_ORIGIN;
  }

  if (hostSuffix === "localhost") {
    return "http://127.0.0.1:8787";
  }

  return "https://api.pirate.sc";
}

function resolveAppOrigin(env: Env, url: URL, hostSuffix: string): string {
  if (env.HNS_PUBLIC_APP_ORIGIN) {
    return env.HNS_PUBLIC_APP_ORIGIN;
  }

  if (hostSuffix === "localhost") {
    return `${url.protocol}//localhost${url.port ? `:${url.port}` : ""}`;
  }

  return "https://pirate.sc";
}

async function handleRequest(request: Request, env: Env): Promise<Response> {
  const url = new URL(request.url);
  const locale = resolveRequestLocale(request.headers.get("accept-language"));
  const localeTag = resolveLocaleLanguageTag(locale);
  const copy = getLocaleMessages(locale, "routes").publicProfile;
  const target = extractPublicProfileRequestTarget(url);

  if (!target) {
    return renderPublicProfileErrorPage(
      copy.notFoundTitle,
      copy.notFoundDescription.replace("{path}", url.hostname),
      404,
    );
  }

  const hostSuffix =
    target.kind === "host"
      ? target.hostSuffix
      : url.hostname === "localhost"
        ? "localhost"
        : "pirate.sc";
  const apiOrigin = resolveApiOrigin(env, hostSuffix);
  const appOrigin = resolveAppOrigin(env, url, hostSuffix);
  const publicLookupPath = target.kind === "host" && target.identityKind === "agent"
    ? "public-agents"
    : "public-profiles";
  const response = await fetch(
    `${apiOrigin}/${publicLookupPath}/${encodeURIComponent(target.handleLabel)}`,
    {
      headers: { accept: "application/json" },
      redirect: "manual",
    },
  );

  if (response.status === 404) {
    return renderPublicProfileErrorPage(
      copy.notFoundTitle,
      copy.notFoundDescription.replace("{path}", url.hostname),
      404,
    );
  }

  if (!response.ok) {
    return renderPublicProfileErrorPage(
      copy.errorTitle,
      copy.errorDescription,
      502,
    );
  }

  if (target.kind === "host" && target.identityKind === "agent") {
    const resolution = await response.json() as PublicAgentResolution;
    if (!resolution.is_canonical) {
      const nextUrl = new URL(request.url);
      nextUrl.hostname = `${resolution.resolved_handle_label.replace(/\.clawitzer$/i, "")}.${target.hostSuffix}`;
      return Response.redirect(nextUrl.toString(), 302);
    }

    return renderPublicAgentPage({
      agentResolution: resolution,
      appOrigin,
      canonicalUrl: url.toString(),
      host: url.hostname,
    });
  }

  const resolution = await response.json() as PublicProfileResolution;
  if (!resolution.is_canonical) {
    const nextUrl = new URL(request.url);

    if (target.kind === "host") {
      nextUrl.hostname = `${resolution.resolved_handle_label.replace(/\.pirate$/i, "")}.${target.hostSuffix}`;
    } else {
      nextUrl.pathname = `/u/${encodeURIComponent(resolution.resolved_handle_label)}`;
    }

    return Response.redirect(nextUrl.toString(), 302);
  }

  const html = renderPublicProfilePage({
    appOrigin,
    canonicalHandle: resolution.profile.global_handle.label,
    canonicalUrl: url.toString(),
    communities: resolution.created_communities,
    copy,
    displayHandle:
      resolution.profile.primary_public_handle?.label ?? resolution.profile.global_handle.label,
    host: url.hostname,
    localeTag,
    profile: resolution.profile,
  });

  return new Response(html, {
    headers: {
      "cache-control": "public, max-age=60, s-maxage=300",
      "content-type": "text/html; charset=utf-8",
      [X_FRAME_OPTIONS_HEADER]: X_FRAME_OPTIONS_DENY,
    },
  });
}

export default {
  fetch(request: Request, env: Env) {
    return handleRequest(request, env);
  },
};
