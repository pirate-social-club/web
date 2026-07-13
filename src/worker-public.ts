import {
  buildPublicHtmlHeaders,
  renderPublicAgentPage,
  renderPublicProfileErrorPage,
  renderPublicProfilePage,
} from "./worker-public-html";
import { resolveLocaleLanguageTag, resolveRequestLocale } from "./lib/ui-locale-core";
import { getLocaleMessages } from "./locales";
import { buildVersionResponse } from "./lib/build-version";
import { extractPublicProfileHost } from "./lib/public-host";
import { getPublicIdentityHandleLabel } from "./lib/public-identity";
import type {
  Env,
  PublicAgentResolution,
  PublicProfileResolution,
} from "./worker-public.types";

type PublicProfileRequestTarget =
  { kind: "host"; handleLabel: string; hostSuffix: string; identityKind: "profile" | "agent" };

const PUBLIC_LOOKUP_TIMEOUT_MS = 5_000;

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
      signal: AbortSignal.timeout(PUBLIC_LOOKUP_TIMEOUT_MS),
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
    headers: buildPublicHtmlHeaders("public, max-age=60, s-maxage=300"),
  });
}

export default {
  async fetch(request: Request, env: Env) {
    try {
      return await handleRequest(request, env);
    } catch (error) {
      const locale = resolveRequestLocale(request.headers.get("accept-language"));
      const copy = getLocaleMessages(locale, "routes").publicProfile;
      console.error(JSON.stringify({
        message: "public profile rendering failed",
        error: error instanceof Error ? error.message : String(error),
        host: new URL(request.url).hostname,
      }));
      return renderPublicProfileErrorPage(
        copy.errorTitle,
        copy.errorDescription,
        502,
        resolveLocaleLanguageTag(locale),
      );
    }
  },
};
