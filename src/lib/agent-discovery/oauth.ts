import { absoluteUrl, getDiscoveryContext, jsonResponse } from "./shared";

export function buildApiCatalogResponse(input: URL | string): Response {
  const ctx = getDiscoveryContext(input);

  return jsonResponse({
    linkset: [
      {
        anchor: `${ctx.apiOrigin}/`,
        "service-desc": [
          {
            href: absoluteUrl(ctx.appOrigin, "/openapi.json"),
            type: "application/vnd.oai.openapi+json",
          },
        ],
        "service-doc": [
          {
            href: absoluteUrl(ctx.appOrigin, "/docs/api"),
            type: "text/html",
          },
        ],
        status: [
          {
            href: `${ctx.apiOrigin}/health`,
            type: "application/json",
          },
        ],
        "oauth-authorization-server": [
          {
            href: absoluteUrl(ctx.appOrigin, "/.well-known/oauth-authorization-server"),
            type: "application/json",
          },
        ],
        "oauth-protected-resource": [
          {
            href: absoluteUrl(ctx.appOrigin, "/.well-known/oauth-protected-resource"),
            type: "application/json",
          },
        ],
      },
    ],
  }, "application/linkset+json");
}

export function buildOAuthProtectedResourceResponse(input: URL | string): Response {
  const ctx = getDiscoveryContext(input);

  return jsonResponse({
    resource: ctx.appOrigin,
    authorization_servers: [ctx.appOrigin],
    jwks_uri: `${ctx.apiOrigin}/.well-known/jwks.json`,
    bearer_methods_supported: ["header"],
    scopes_supported: ["pirate_app_session"],
    resource_documentation: absoluteUrl(ctx.appOrigin, "/docs/api"),
  });
}

export function buildOAuthAuthorizationServerResponse(input: URL | string): Response {
  const ctx = getDiscoveryContext(input);

  return jsonResponse({
    issuer: ctx.appOrigin,
    authorization_endpoint: `${ctx.apiOrigin}/auth/session/exchange`,
    token_endpoint: `${ctx.apiOrigin}/auth/session/exchange`,
    jwks_uri: `${ctx.apiOrigin}/.well-known/jwks.json`,
    grant_types_supported: ["urn:pirate:params:oauth:grant-type:session-exchange"],
    response_types_supported: [],
    scopes_supported: ["pirate_app_session"],
    token_endpoint_auth_methods_supported: ["none"],
    bearer_methods_supported: ["header"],
    protected_resources: [ctx.apiOrigin],
    service_documentation: absoluteUrl(ctx.appOrigin, "/docs/api"),
  });
}

export function buildOpenIdConfigurationResponse(input: URL | string): Response {
  const ctx = getDiscoveryContext(input);

  return jsonResponse({
    issuer: ctx.appOrigin,
    authorization_endpoint: `${ctx.apiOrigin}/auth/session/exchange`,
    token_endpoint: `${ctx.apiOrigin}/auth/session/exchange`,
    jwks_uri: `${ctx.apiOrigin}/.well-known/jwks.json`,
    response_types_supported: [],
    subject_types_supported: ["public"],
    id_token_signing_alg_values_supported: ["RS256"],
    scopes_supported: ["pirate_app_session"],
    service_documentation: absoluteUrl(ctx.appOrigin, "/docs/api"),
  });
}
