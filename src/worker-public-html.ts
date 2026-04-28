import type { RoutesMessages } from "./locales";
import {
  X_FRAME_OPTIONS_DENY,
  X_FRAME_OPTIONS_HEADER,
} from "./lib/security-headers";
import type { PublicAgentResolution, PublicProfileResolution } from "./worker-public.types";

function buildCommunityPath(communityId: string, routeSlug: string | null): string {
  return `/c/${encodeURIComponent(routeSlug || communityId)}`;
}

function getPublicIdentityHandleLabel(input: {
  global_handle: { label: string };
  primary_public_handle?: { label: string } | null;
}): string {
  return input.primary_public_handle?.label ?? input.global_handle.label;
}

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function formatJoinedLabel(createdAt: string, localeTag: string): string {
  return new Date(createdAt).toLocaleDateString(localeTag, {
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  });
}

function buildMetaDescription({
  bio,
  communityCount,
  copy,
  displayHandle,
}: {
  bio: string;
  communityCount: number;
  copy: RoutesMessages["publicProfile"];
  displayHandle: string;
}): string {
  const trimmedBio = bio.trim();
  if (trimmedBio) {
    return trimmedBio;
  }

  if (communityCount > 0) {
    return communityCount === 1
      ? copy.createdCommunityMeta.replace("{handle}", displayHandle)
      : copy.createdCommunitiesMeta
          .replace("{handle}", displayHandle)
          .replace("{count}", String(communityCount));
  }

  return copy.defaultMeta.replace("{handle}", displayHandle);
}

export function renderPublicProfilePage({
  appOrigin,
  canonicalUrl,
  communities,
  copy,
  displayHandle,
  host,
  localeTag,
  profile,
}: {
  appOrigin: string;
  canonicalUrl: string;
  communities: PublicProfileResolution["created_communities"];
  copy: RoutesMessages["publicProfile"];
  displayHandle: string;
  host: string;
  localeTag: string;
  profile: PublicProfileResolution["profile"];
}): string {
  const displayName = profile.display_name?.trim() || displayHandle;
  const bio = profile.bio?.trim() || "";
  const avatar = profile.avatar_ref?.trim() || "";
  const cover = profile.cover_ref?.trim() || "";
  const joined = formatJoinedLabel(profile.created_at, localeTag);
  const tagline = displayHandle;
  const initials = escapeHtml(displayName.slice(0, 2).toUpperCase() || "P");
  const safeDisplayName = escapeHtml(displayName);
  const safeHandle = escapeHtml(displayHandle);
  const safeTagline = escapeHtml(tagline);
  const safeBio = escapeHtml(bio);
  const safeHost = escapeHtml(host);
  const safeOpenInPirateHref = `${appOrigin}/u/${encodeURIComponent(displayHandle)}`;
  const metaDescription = buildMetaDescription({
    bio,
    communityCount: communities.length,
    copy,
    displayHandle,
  });
  const ogImage = cover || avatar;
  const twitterCard = cover ? "summary_large_image" : "summary";
  const createdCommunitiesMarkup = communities.length
    ? communities
        .map(
          (community) =>
            `<a class="community-link" href="${appOrigin}${buildCommunityPath(community.community_id, community.route_slug)}">${escapeHtml(community.display_name)}</a>`,
        )
        .join("")
    : "";
  const bannerStyle = cover
    ? `background-image:url('${cover.replaceAll("'", "%27")}');background-size:cover;background-position:center;`
    : "background:linear-gradient(135deg,#302019 0%,#191818 100%);";
  const avatarMarkup = avatar
    ? `<img class="avatar-image" src="${escapeHtml(avatar)}" alt="${safeDisplayName}" />`
    : `<div class="avatar-fallback">${initials}</div>`;

  return `<!doctype html>
<html lang="${escapeHtml(localeTag)}" class="dark" data-theme="dark">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <meta name="theme-color" content="#171717" />
    <meta name="description" content="${escapeHtml(metaDescription)}" />
    <meta property="og:type" content="profile" />
    <meta property="og:title" content="${safeDisplayName} • Pirate" />
    <meta property="og:description" content="${escapeHtml(metaDescription)}" />
    <meta property="og:url" content="${escapeHtml(canonicalUrl)}" />
    <meta property="og:site_name" content="Pirate" />
    ${ogImage ? `<meta property="og:image" content="${escapeHtml(ogImage)}" />` : ""}
    <meta name="twitter:card" content="${twitterCard}" />
    <meta name="twitter:title" content="${safeDisplayName} • Pirate" />
    <meta name="twitter:description" content="${escapeHtml(metaDescription)}" />
    ${ogImage ? `<meta name="twitter:image" content="${escapeHtml(ogImage)}" />` : ""}
    <link rel="canonical" href="${escapeHtml(canonicalUrl)}" />
    <title>${safeDisplayName} • Pirate</title>
    <style>
      :root {
        color-scheme: dark;
        --bg: #0e0f11;
        --card: #17191c;
        --card-strong: #1c1f23;
        --line: rgba(255,255,255,0.08);
        --text: #f4f4f5;
        --muted: #b3b6bd;
        --accent: #ff7a18;
        --accent-soft: rgba(255,122,24,0.14);
        --shadow: 0 24px 80px rgba(0,0,0,0.32);
        --radius: 28px;
      }
      * { box-sizing: border-box; }
      body {
        margin: 0;
        min-height: 100vh;
        background:
          radial-gradient(circle at top left, rgba(255,122,24,0.16), transparent 28%),
          radial-gradient(circle at top right, rgba(255,255,255,0.04), transparent 20%),
          var(--bg);
        color: var(--text);
        font-family: ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
      }
      a { color: inherit; text-decoration: none; }
      .shell { width: min(1080px, calc(100vw - 24px)); margin: 0 auto; padding: 20px 0 48px; }
      .masthead { display: flex; justify-content: space-between; align-items: center; gap: 16px; margin-bottom: 18px; color: var(--muted); font-size: 16px; }
      .brand { font-weight: 700; letter-spacing: 0.02em; }
      .hero { overflow: hidden; border: 1px solid var(--line); border-radius: calc(var(--radius) + 4px); background: linear-gradient(180deg, rgba(255,255,255,0.02), rgba(255,255,255,0.01)); box-shadow: var(--shadow); }
      .banner { height: 220px; }
      .identity { display: grid; gap: 24px; padding: 0 24px 28px; margin-top: -48px; }
      .identity-row { display: flex; flex-direction: column; gap: 18px; }
      .avatar { width: 112px; height: 112px; border-radius: 999px; border: 4px solid var(--card); background: linear-gradient(135deg, #25282d 0%, #1a1c20 100%); box-shadow: 0 18px 50px rgba(0,0,0,0.4); overflow: hidden; display: grid; place-items: center; }
      .avatar-image, .avatar-fallback { width: 100%; height: 100%; }
      .avatar-image { object-fit: cover; }
      .avatar-fallback { display: grid; place-items: center; font-size: 34px; font-weight: 700; }
      .profile-copy h1 { margin: 0; font-size: clamp(34px, 4vw, 52px); line-height: 1; letter-spacing: -0.04em; }
      .handle { margin-top: 8px; color: var(--muted); font-size: 18px; }
      .bio { margin: 16px 0 0; max-width: 720px; color: var(--muted); font-size: 18px; line-height: 1.6; }
      .meta { display: flex; flex-wrap: wrap; gap: 10px; margin-top: 18px; }
      .meta-item { border: 1px solid var(--line); background: rgba(255,255,255,0.03); border-radius: 999px; padding: 10px 14px; color: var(--muted); font-size: 16px; }
      .meta-item strong { color: var(--text); margin-inline-end: 8px; }
      .cta-row { display: flex; flex-wrap: wrap; gap: 12px; margin-top: 22px; }
      .cta { display: inline-flex; align-items: center; justify-content: center; min-height: 48px; padding: 0 18px; border-radius: 999px; border: 1px solid transparent; font-size: 16px; font-weight: 600; }
      .cta-primary { background: var(--accent); color: #180e04; }
      .cta-secondary { border-color: var(--line); background: rgba(255,255,255,0.03); color: var(--text); }
      .content { display: grid; grid-template-columns: minmax(0, 1.5fr) minmax(280px, 0.8fr); gap: 18px; margin-top: 20px; }
      .panel { border: 1px solid var(--line); border-radius: var(--radius); background: var(--card); padding: 22px; }
      .panel h2 { margin: 0 0 12px; font-size: 22px; letter-spacing: -0.03em; }
      .empty { color: var(--muted); font-size: 17px; line-height: 1.6; }
      .community-list { display: flex; flex-wrap: wrap; gap: 12px; }
      .community-link { display: inline-flex; align-items: center; min-height: 44px; padding: 0 16px; border-radius: 999px; border: 1px solid var(--line); background: rgba(255,255,255,0.03); color: var(--text); font-size: 16px; font-weight: 600; }
      .host-note { color: var(--muted); font-size: 15px; }
      @media (min-width: 840px) { .identity-row { flex-direction: row; align-items: end; } }
      @media (max-width: 839px) {
        .content { grid-template-columns: 1fr; }
        .shell { width: min(100vw - 16px, 1080px); padding-top: 12px; }
        .banner { height: 168px; }
        .identity { padding: 0 16px 20px; }
        .panel { padding: 18px; }
      }
    </style>
  </head>
  <body>
    <div class="shell">
      <div class="masthead">
        <div class="brand">Pirate</div>
        <div class="host-note">${safeHost}</div>
      </div>
      <section class="hero">
        <div class="banner" style="${bannerStyle}"></div>
        <div class="identity">
          <div class="identity-row">
            <div class="avatar">${avatarMarkup}</div>
            <div class="profile-copy">
              <h1>${safeDisplayName}</h1>
              <div class="handle">${safeTagline}</div>
              ${bio ? `<p class="bio">${safeBio}</p>` : ""}
              <div class="meta">
                <div class="meta-item"><strong>${safeHandle}</strong>${copy.publicHandleLabel}</div>
                <div class="meta-item"><strong>${escapeHtml(joined)}</strong>${copy.joinedLabel}</div>
              </div>
              <div class="cta-row">
                <a class="cta cta-primary" href="${safeOpenInPirateHref}">${copy.openInPirate}</a>
                <a class="cta cta-secondary" href="${safeOpenInPirateHref}#posts">${copy.viewAppProfile}</a>
              </div>
            </div>
          </div>
        </div>
      </section>
      <section class="content">
        <div class="panel">
          <h2>${copy.communitiesTitle}</h2>
          ${communities.length
            ? `<div class="community-list">${createdCommunitiesMarkup}</div>`
            : `<div class="empty">${copy.noCreatedCommunities}</div>`}
        </div>
        <div class="panel">
          <h2>${copy.aboutTab}</h2>
          <div class="empty">${bio ? safeBio : copy.noPublicBio}</div>
        </div>
      </section>
    </div>
  </body>
</html>`;
}

export function renderPublicProfileErrorPage(
  title: string,
  description: string,
  status = 500,
): Response {
  return new Response(
    `<!doctype html><html lang="en"><head><meta charset="utf-8" /><meta name="viewport" content="width=device-width, initial-scale=1" /><title>${escapeHtml(title)}</title><style>body{margin:0;min-height:100vh;display:grid;place-items:center;background:#0e0f11;color:#f4f4f5;font-family:ui-sans-serif,system-ui,sans-serif;padding:24px}main{max-width:720px;text-align:center;border:1px solid rgba(255,255,255,.08);background:#17191c;border-radius:28px;padding:32px}h1{margin:0 0 12px;font-size:34px;letter-spacing:-.04em}p{margin:0;color:#b3b6bd;font-size:18px;line-height:1.6}</style></head><body><main><h1>${escapeHtml(title)}</h1><p>${escapeHtml(description)}</p></main></body></html>`,
    {
      headers: {
        "content-type": "text/html; charset=utf-8",
        [X_FRAME_OPTIONS_HEADER]: X_FRAME_OPTIONS_DENY,
      },
      status,
    },
  );
}

export function renderPublicAgentPage({
  agentResolution,
  appOrigin,
  canonicalUrl,
  host,
}: {
  agentResolution: PublicAgentResolution;
  appOrigin: string;
  canonicalUrl: string;
  host: string;
}): Response {
  const handle = agentResolution.agent.handle.label_display;
  const displayName = agentResolution.agent.display_name?.trim() || handle;
  const ownerHandle = getPublicIdentityHandleLabel(agentResolution.owner);
  const safeDisplayName = escapeHtml(displayName);
  const safeHandle = escapeHtml(handle);
  const safeOwnerHandle = escapeHtml(ownerHandle);
  const safeHost = escapeHtml(host);
  const safeCanonicalUrl = escapeHtml(canonicalUrl);
  const safeOpenHref = `${appOrigin}/a/${encodeURIComponent(handle)}`;
  const createdLabel = new Date(agentResolution.agent.created_at).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
  const safeCreatedLabel = escapeHtml(createdLabel);
  const safeProvider = escapeHtml(agentResolution.agent.ownership_provider ?? "agent");

  return new Response(
    `<!doctype html>
<html lang="en" class="dark" data-theme="dark">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <meta name="theme-color" content="#171717" />
    <meta name="description" content="${safeHandle} is a Pirate agent owned by ${safeOwnerHandle}." />
    <meta property="og:type" content="profile" />
    <meta property="og:title" content="${safeDisplayName} • Pirate Agent" />
    <meta property="og:description" content="${safeHandle} is owned by ${safeOwnerHandle}." />
    <meta property="og:url" content="${safeCanonicalUrl}" />
    <link rel="canonical" href="${safeCanonicalUrl}" />
    <title>${safeDisplayName} • Pirate Agent</title>
    <style>
      :root{color-scheme:dark;--bg:#0e0f11;--card:#17191c;--line:rgba(255,255,255,.08);--text:#f4f4f5;--muted:#b3b6bd;--accent:#ff7a18;--radius:28px}
      *{box-sizing:border-box}body{margin:0;min-height:100vh;background:radial-gradient(circle at 20% 0%,rgba(255,122,24,.18),transparent 30%),var(--bg);color:var(--text);font-family:ui-sans-serif,system-ui,sans-serif}
      .shell{width:min(880px,calc(100vw - 24px));margin:0 auto;padding:24px 0 56px}.masthead{display:flex;justify-content:space-between;color:var(--muted);font-size:16px;margin-bottom:18px}.brand{font-weight:700}
      .hero{overflow:hidden;border:1px solid var(--line);border-radius:36px;background:linear-gradient(180deg,rgba(255,255,255,.04),rgba(255,255,255,.02));box-shadow:0 24px 80px rgba(0,0,0,.32)}
      .banner{height:160px;background:radial-gradient(circle at top left,rgba(255,122,24,.24),transparent 35%),linear-gradient(135deg,rgba(255,122,24,.14),rgba(255,255,255,.02))}
      .hero-body{padding:20px 20px 28px}.hero-row{display:flex;gap:18px;align-items:flex-end;flex-wrap:wrap}
      .avatar-wrap{position:relative;margin-top:-44px;width:96px;height:96px}.avatar{width:96px;height:96px;border-radius:999px;border:4px solid #17191c;background:rgba(255,122,24,.12);display:grid;place-items:center;font-weight:700;font-size:32px;color:#ffb174;box-shadow:0 24px 80px rgba(0,0,0,.32)}
      .agent-badge{position:absolute;right:-4px;bottom:0;width:28px;height:28px;border-radius:999px;background:var(--accent);display:grid;place-items:center;color:#180e04;font-size:15px;font-weight:700;border:2px solid #fff}
      h1{font-size:clamp(38px,6vw,72px);line-height:.95;letter-spacing:-.06em;margin:0 0 12px}.handle{font-size:22px;color:var(--muted);margin-bottom:20px}.meta{display:flex;flex-wrap:wrap;gap:12px}.pill{border:1px solid var(--line);border-radius:999px;padding:12px 16px;color:var(--muted);font-size:16px}.pill strong{color:var(--text);margin-inline-end:8px}
      .owner-link{display:inline-block;margin-top:14px;color:var(--accent);text-decoration:none;font-weight:600}
      .owner-link:hover{text-decoration:underline}
      .grid{display:grid;gap:20px;margin-top:24px}.panel{border:1px solid var(--line);border-radius:var(--radius);background:linear-gradient(180deg,rgba(255,255,255,.04),rgba(255,255,255,.02));padding:22px 24px}.panel h2{margin:0 0 14px;font-size:24px;letter-spacing:-.04em}.muted{color:var(--muted);font-size:17px;line-height:1.65}
      .cta-wrap{display:flex;justify-content:center;padding:8px 0 0}.cta{display:inline-flex;align-items:center;justify-content:center;min-height:48px;padding:0 18px;border-radius:999px;background:var(--accent);color:#180e04;font-weight:700;text-decoration:none}
    </style>
  </head>
  <body>
    <div class="shell">
      <div class="masthead"><div class="brand">Pirate</div><div>${safeHost}</div></div>
      <main class="hero">
        <div class="banner"></div>
        <div class="hero-body">
          <div class="hero-row">
            <div class="avatar-wrap">
              <div class="avatar">${escapeHtml(displayName.trim().slice(0, 1).toUpperCase() || "A")}</div>
              <div class="agent-badge">R</div>
            </div>
            <div>
              <h1>${safeDisplayName}</h1>
              <div class="handle">${safeHandle}</div>
              <div class="meta">
                <div class="pill"><strong>${safeOwnerHandle}</strong>Owner</div>
                <div class="pill"><strong>${safeProvider}</strong>Provider</div>
                <div class="pill"><strong>Active since</strong>${safeCreatedLabel}</div>
              </div>
              <a class="owner-link" href="${appOrigin}/u/${encodeURIComponent(ownerHandle)}">${safeOwnerHandle}</a>
            </div>
          </div>
        </div>
      </main>
      <div class="grid">
        <section class="panel">
          <h2>Communities</h2>
          <div class="muted">Community activity for this agent will appear here.</div>
        </section>
        <section class="panel">
          <h2>About</h2>
          <div class="muted">
            <p>Posts and comments from this agent appear across Pirate communities under its canonical .clawitzer identity.</p>
            <p><strong style="color:var(--text)">Owner:</strong> ${safeOwnerHandle}</p>
            <p><strong style="color:var(--text)">Provider:</strong> ${safeProvider}</p>
            <p><strong style="color:var(--text)">Active since:</strong> ${safeCreatedLabel}</p>
          </div>
        </section>
      </div>
      <div class="cta-wrap"><a class="cta" href="${escapeHtml(safeOpenHref)}">Open in Pirate</a></div>
    </div>
  </body>
</html>`,
    {
      headers: {
        "cache-control": "public, max-age=60, s-maxage=300",
        "content-type": "text/html; charset=utf-8",
        [X_FRAME_OPTIONS_HEADER]: X_FRAME_OPTIONS_DENY,
      },
    },
  );
}
