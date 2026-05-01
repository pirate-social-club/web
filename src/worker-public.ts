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
import { buildVersionResponse } from "./lib/build-version";
import { extractPublicProfileHost } from "./lib/public-host";
import type {
  Env,
  PublicAgentResolution,
  PublicProfileResolution,
} from "./worker-public.types";

type PublicProfileRequestTarget =
  { kind: "host"; handleLabel: string; hostSuffix: string; identityKind: "profile" | "agent" };

function getPublicIdentityHandleLabel(input: {
  global_handle: { label: string };
  primary_public_handle?: { label: string } | null;
}): string {
  return input.primary_public_handle?.label ?? input.global_handle.label;
}

function extractPublicProfileRequestTarget(url: URL): PublicProfileRequestTarget | null {
  const hostTarget = extractPublicProfileHost(url.hostname);
  if (hostTarget) {
    return {
      kind: "host",
      handleLabel: hostTarget.handleLabel,
      hostSuffix: hostTarget.hostSuffix,
      identityKind: hostTarget.hostSuffix === "clawitzer" ? "agent" : "profile",
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
  if (url.pathname === "/__version") {
    return buildVersionResponse("web-public", env);
  }

  const locale = resolveRequestLocale(request.headers.get("accept-language"));
  const localeTag = resolveLocaleLanguageTag(locale);
  const copy = getLocaleMessages(locale, "routes").publicProfile;
  const target = extractPublicProfileRequestTarget(url);

  if (!target) {
    return renderPublicProfileErrorPage(
      copy.notFoundTitle,
      copy.notFoundDescription.replace("{path}", url.hostname),
      404,
      localeTag,
    );
  }

  const hostSuffix = target.hostSuffix;
  const apiOrigin = resolveApiOrigin(env, hostSuffix);
  const appOrigin = resolveAppOrigin(env, url, hostSuffix);
  const publicLookupPath = target.identityKind === "agent"
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
      localeTag,
    );
  }

  if (!response.ok) {
    return renderPublicProfileErrorPage(
      copy.errorTitle,
      copy.errorDescription,
      502,
      localeTag,
    );
  }

  if (target.identityKind === "agent") {
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
      localeTag,
    });
  }

  const resolution = await response.json() as PublicProfileResolution;
  if (!resolution.is_canonical) {
    const nextUrl = new URL(request.url);

    if (resolution.resolved_handle_label.toLowerCase().endsWith(".pirate")) {
      nextUrl.hostname = `${resolution.resolved_handle_label.replace(/\.pirate$/i, "")}.${target.hostSuffix}`;
    } else {
      nextUrl.pathname = `/u/${encodeURIComponent(resolution.resolved_handle_label)}`;
    }

    return Response.redirect(nextUrl.toString(), 302);
  }

  const html = renderPublicProfilePage({
    appOrigin,
    canonicalUrl: url.toString(),
    communities: resolution.created_communities,
    copy,
    displayHandle: getPublicIdentityHandleLabel(resolution.profile),
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
