import {
  renderPublicProfileErrorPage,
  renderPublicProfilePage,
} from "./worker-public-html";
import type {
  Env,
  PublicProfileResolution,
} from "./worker-public.types";

type PublicProfileRequestTarget =
  | { kind: "host"; handleLabel: string; hostSuffix: string }
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

const PUBLIC_PROFILE_HOST_SUFFIXES = ["pirate", "localhost"];

function extractPublicProfileHost(
  hostname: string,
): { handleLabel: string; hostSuffix: string } | null {
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

    return { handleLabel: subdomain, hostSuffix };
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
  const target = extractPublicProfileRequestTarget(url);

  if (!target) {
    return renderPublicProfileErrorPage(
      "Public profile",
      `The host ${url.hostname} does not map to a public Pirate profile.`,
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
  const response = await fetch(
    `${apiOrigin}/public-profiles/${encodeURIComponent(target.handleLabel)}`,
    {
      headers: { accept: "application/json" },
      redirect: "manual",
    },
  );

  if (response.status === 404) {
    return renderPublicProfileErrorPage(
      "Profile not found",
      `We could not find a public Pirate profile for ${url.hostname}.`,
      404,
    );
  }

  if (!response.ok) {
    return renderPublicProfileErrorPage(
      "Public profile",
      "This public profile could not be loaded right now.",
      502,
    );
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
    displayHandle:
      resolution.profile.primary_public_handle?.label ?? resolution.profile.global_handle.label,
    host: url.hostname,
    profile: resolution.profile,
  });

  return new Response(html, {
    headers: {
      "cache-control": "public, max-age=60, s-maxage=300",
      "content-type": "text/html; charset=utf-8",
    },
  });
}

export default {
  fetch(request: Request, env: Env) {
    return handleRequest(request, env);
  },
};
