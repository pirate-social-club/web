export type {
  DiscoveryContext,
  WebBotAuthEnv,
} from "./agent-discovery/types";

export {
  absoluteUrl,
  applyDiscoveryHeaders,
  buildCanonicalUrl,
  buildCommunityPath,
  getDiscoveryContext,
  resolveApiOriginFromHostname,
  resolveAppOrigin,
} from "./agent-discovery/shared";
export {
  buildAgentSkillResponse,
  buildAgentSkillsIndexResponse,
} from "./agent-discovery/agent-skills";
export {
  buildApiCatalogResponse,
  buildOAuthAuthorizationServerResponse,
  buildOAuthProtectedResourceResponse,
  buildOpenIdConfigurationResponse,
} from "./agent-discovery/oauth";
export {
  buildApiDocsResponse,
  buildMarkdownForPage,
  buildMarkdownResponse,
  markdownRequested,
} from "./agent-discovery/markdown";
export {
  buildOpenApiDocument,
  buildOpenApiResponse,
} from "./agent-discovery/openapi";
export {
  buildRobotsResponse,
  buildSitemapResponse,
} from "./agent-discovery/sitemap";
export { buildMcpServerCardResponse } from "./agent-discovery/webmcp";
export { buildWebBotAuthDirectoryResponse } from "./agent-discovery/web-bot-auth";
