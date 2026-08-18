import http from "node:http";

const canonicalProfile = {
  profile: {
    id: "usr_fixture",
    object: "profile",
    display_name: 'Captain <img src=x onerror="alert(1)">',
    avatar_ref: "javascript:alert(1)",
    avatar_source: "upload",
    cover_ref: null,
    cover_source: "none",
    bio: `A public bio with hostile <script>alert(1)</script> text ${"x".repeat(230)}`,
    bio_source: "manual",
    preferred_locale: "en",
    global_handle: {
      id: "gh_fixture",
      object: "global_handle",
      label: "captain.pirate",
      status: "active",
    },
    created: 1,
  },
  requested_handle_label: "captain.pirate",
  resolved_handle_label: "captain.pirate",
  is_canonical: true,
  created_communities: [
    {
      community: "community-fixture",
      display_name: "Crew <b>One</b>",
      created: 2,
      route_slug: null,
    },
  ],
};

const aliases = new Set(["oldcaptain.pirate"]);
const requests = [];

export function profileFixtureRequests() {
  return requests;
}

export function createProfileFixtureServer(port = 8787) {
  const server = http.createServer((request, response) => {
    const url = new URL(request.url ?? "/", `http://${request.headers.host ?? "127.0.0.1"}`);
    requests.push({
      authorization: request.headers.authorization ?? null,
      cookie: request.headers.cookie ?? null,
      path: url.pathname,
    });
    response.setHeader("access-control-allow-origin", "*");
    if (request.method !== "GET" || !url.pathname.startsWith("/public-profiles/")) {
      response.writeHead(404, { "content-type": "application/json" });
      response.end(JSON.stringify({ code: "not_found", message: "fixture route not found", retryable: false }));
      return;
    }

    const encodedHandle = url.pathname.slice("/public-profiles/".length);
    let handle;
    try {
      handle = decodeURIComponent(encodedHandle);
    } catch {
      response.writeHead(400, { "content-type": "application/json" });
      response.end(JSON.stringify({ code: "bad_request", message: "invalid handle", retryable: false }));
      return;
    }

    if (handle === "upstream.pirate") {
      response.writeHead(500, { "content-type": "application/json" });
      response.end(JSON.stringify({ code: "internal_error", message: "fixture upstream failure", retryable: false }));
      return;
    }
    if (handle === "invalid.pirate") {
      response.writeHead(400, { "content-type": "application/json" });
      response.end(JSON.stringify({ code: "bad_request", message: "fixture invalid handle", retryable: false }));
      return;
    }
    if (handle === "missing.pirate") {
      response.writeHead(404, { "content-type": "application/json" });
      response.end(JSON.stringify({ code: "not_found", message: "fixture profile missing", retryable: false }));
      return;
    }

    response.writeHead(200, { "content-type": "application/json" });
    response.end(JSON.stringify({
      ...canonicalProfile,
      requested_handle_label: handle,
      resolved_handle_label: "captain.pirate",
      is_canonical: !aliases.has(handle),
    }));
  });
  return {
    server,
    async listen() {
      await new Promise((resolve, reject) => {
        server.once("error", reject);
        server.listen(port, "127.0.0.1", resolve);
      });
    },
    async close() {
      if (!server.listening) return;
      await new Promise((resolve, reject) => server.close(error => error ? reject(error) : resolve()));
    },
  };
}
