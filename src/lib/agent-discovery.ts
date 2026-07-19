export type {

  WebBotAuthEnv,
} from "./agent-discovery/types";

export {

  applyDiscoveryHeaders,


  getDiscoveryContext,
  resolveApiOriginFromHostname,

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

  buildOpenApiResponse,
} from "./agent-discovery/openapi";
export {
  buildRobotsResponse,
  buildSitemapResponse,
} from "./agent-discovery/sitemap";
export { buildMcpServerCardResponse } from "./agent-discovery/webmcp";
export { buildWebBotAuthDirectoryResponse } from "./agent-discovery/web-bot-auth";
