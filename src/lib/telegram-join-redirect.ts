const DEFAULT_STAGING_TELEGRAM_BOT_USERNAME = "Pirate_dev_bot";
const TELEGRAM_START_PARAMETER_PATTERN = /^[A-Za-z0-9_-]{1,512}$/u;
const TELEGRAM_JOIN_IDENTIFIER_MAX_LENGTH = 512;
const TELEGRAM_JOIN_REDIRECT_HEADERS = {
  "cache-control": "no-store",
} as const;

type CommunityTelegramBotUsernameResponse = {
  active_telegram_bot_username?: unknown;
};

type PublicCommunityLookupResponse = {
  id?: unknown;
};

type CommunityTelegramBotUsernameLookup =
  | { kind: "ok"; username: string | null }
  | { kind: "not_found" }
  | { kind: "error" };

function normalizeTelegramBotUsername(value: string | null | undefined): string | null {
  const normalized = value?.trim().replace(/^@/u, "") ?? "";
  return /^[A-Za-z0-9_]{5,32}$/u.test(normalized) ? normalized : null;
}

function isStagingHostname(hostname: string): boolean {
  return hostname === "staging.pirate.sc" || hostname.endsWith(".staging.pirate.sc");
}

function resolveTelegramPlatformBotUsername(input: {
  effectiveUrl: string;
}): string | null {
  const explicit = normalizeTelegramBotUsername(import.meta.env.VITE_TELEGRAM_BOT_USERNAME);
  if (explicit) return explicit;

  const appEnv = String(import.meta.env.VITE_PIRATE_APP_ENV ?? "").toLowerCase();
  const hostname = new URL(input.effectiveUrl).hostname.toLowerCase();
  if (
    import.meta.env.DEV
    || appEnv === "dev"
    || appEnv === "development"
    || appEnv === "staging"
    || isStagingHostname(hostname)
  ) {
    return DEFAULT_STAGING_TELEGRAM_BOT_USERNAME;
  }

  return null;
}

function buildTelegramBotStartHref(input: {
  botUsername: string | null | undefined;
  startParam: string;
}): string | null {
  const botUsername = normalizeTelegramBotUsername(input.botUsername);
  if (!botUsername || !TELEGRAM_START_PARAMETER_PATTERN.test(input.startParam)) {
    return null;
  }

  const url = new URL(`https://t.me/${botUsername}`);
  url.searchParams.set("start", input.startParam);
  return url.toString();
}

function validJoinIdentifier(value: string): boolean {
  return value.length > 0
    && value.length <= TELEGRAM_JOIN_IDENTIFIER_MAX_LENGTH
    && !/[\/\\\u0000-\u001F\u007F]/u.test(value);
}

async function fetchCommunityTelegramBotUsername(input: {
  apiOrigin: string;
  communityId: string;
}): Promise<CommunityTelegramBotUsernameLookup> {
  const url = new URL(
    `/communities/${encodeURIComponent(input.communityId)}/telegram-bot-username`,
    input.apiOrigin,
  );
  let response: Response;
  try {
    response = await fetch(url.toString(), {
      headers: { accept: "application/json" },
      redirect: "manual",
    });
  } catch {
    return { kind: "error" };
  }

  if (response.status === 404) {
    return { kind: "not_found" };
  }
  if (!response.ok) {
    return { kind: "error" };
  }

  const body = await response.json().catch(() => null) as CommunityTelegramBotUsernameResponse | null;
  if (!body || typeof body !== "object") {
    return { kind: "error" };
  }
  const rawUsername = body?.active_telegram_bot_username;
  if (rawUsername == null) {
    return { kind: "ok", username: null };
  }
  if (typeof rawUsername !== "string") {
    return { kind: "error" };
  }

  const username = normalizeTelegramBotUsername(rawUsername);
  return username ? { kind: "ok", username } : { kind: "error" };
}

async function fetchCanonicalCommunityId(input: {
  apiOrigin: string;
  communityId: string;
}): Promise<string | null> {
  if (TELEGRAM_START_PARAMETER_PATTERN.test(input.communityId)) {
    return input.communityId;
  }

  const url = new URL(
    `/public-communities/${encodeURIComponent(input.communityId)}`,
    input.apiOrigin,
  );
  let response: Response;
  try {
    response = await fetch(url.toString(), {
      headers: { accept: "application/json" },
      redirect: "manual",
    });
  } catch {
    return null;
  }
  if (!response.ok) {
    return null;
  }

  const body = await response.json().catch(() => null) as PublicCommunityLookupResponse | null;
  const communityId = typeof body?.id === "string" ? body.id.trim() : "";
  return TELEGRAM_START_PARAMETER_PATTERN.test(communityId) ? communityId : null;
}

function telegramJoinStatusResponse(input: {
  description: string;
  status: number;
  title: string;
}): Response {
  return new Response(
    `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${input.title}</title></head><body><main style="box-sizing:border-box;max-width:36rem;margin:0 auto;padding:3rem 1.25rem;font-family:system-ui,-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;line-height:1.5"><h1 style="margin:0 0 0.75rem;font-size:1.75rem">${input.title}</h1><p style="margin:0;color:#475569">${input.description}</p></main></body></html>`,
    {
      headers: {
        ...TELEGRAM_JOIN_REDIRECT_HEADERS,
        "content-type": "text/html; charset=utf-8",
      },
      status: input.status,
    },
  );
}

export async function telegramCommunityJoinRedirect(input: {
  apiOrigin: string;
  communityId: string;
  effectiveUrl: string;
}): Promise<Response> {
  const communityIdentifier = input.communityId.trim();
  if (!validJoinIdentifier(communityIdentifier)) {
    return telegramJoinStatusResponse({
      description: "This Telegram join link is not valid.",
      status: 400,
      title: "Invalid Telegram join link",
    });
  }

  const lookup = await fetchCommunityTelegramBotUsername({
    apiOrigin: input.apiOrigin,
    communityId: communityIdentifier,
  });
  if (lookup.kind === "not_found") {
    return telegramJoinStatusResponse({
      description: "This community could not be found.",
      status: 404,
      title: "Community not found",
    });
  }
  if (lookup.kind === "error") {
    return telegramJoinStatusResponse({
      description: "Telegram join links are temporarily unavailable.",
      status: 502,
      title: "Telegram unavailable",
    });
  }

  const canonicalCommunityId = await fetchCanonicalCommunityId({
    apiOrigin: input.apiOrigin,
    communityId: communityIdentifier,
  });
  if (!canonicalCommunityId) {
    return telegramJoinStatusResponse({
      description: "Telegram join links are temporarily unavailable.",
      status: 502,
      title: "Telegram unavailable",
    });
  }

  const botUsername = lookup.username ?? resolveTelegramPlatformBotUsername({
    effectiveUrl: input.effectiveUrl,
  });
  const startParam = lookup.username ? `join_${canonicalCommunityId}` : `c_${canonicalCommunityId}`;
  const targetHref = buildTelegramBotStartHref({ botUsername, startParam });
  if (!targetHref) {
    return telegramJoinStatusResponse({
      description: "Telegram is not configured for this community yet.",
      status: 503,
      title: "Telegram not configured",
    });
  }

  return new Response(null, {
    headers: {
      ...TELEGRAM_JOIN_REDIRECT_HEADERS,
      location: targetHref,
    },
    status: 302,
  });
}
