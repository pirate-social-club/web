export type { PublicAgentResolution, PublicProfileResolution } from "@pirate/api-contracts";

export type Env = {
  BUILD_GIT_REF?: string;
  BUILD_GIT_SHA?: string;
  BUILD_TIMESTAMP?: string;
  HNS_PUBLIC_API_ORIGIN?: string;
  HNS_PUBLIC_APP_ORIGIN?: string;
  NODE_ENV?: string;
};
