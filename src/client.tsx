import { initClient, initClientNavigation } from "rwsdk/client";

import { reportContentSecurityPolicyViolations } from "@/lib/security/report-csp-violations";
import { registerWebMcpTools } from "@/lib/webmcp";
import { registerServiceWorker } from "@/lib/pwa/register-service-worker";
import { installCryptoRandomUuidFallback } from "@/lib/crypto-random-uuid";
import { logger } from "@/lib/logger";
import { initSentry } from "@/lib/sentry";

const { handleResponse, onHydrated } = initClientNavigation();

installCryptoRandomUuidFallback();
initSentry();
reportContentSecurityPolicyViolations();
registerWebMcpTools();
registerServiceWorker();

void initClient({
  handleResponse,
  hydrateRootOptions: {
    onCaughtError: (error, errorInfo) => {
      logger.error("[react-root] caught error", {
        componentStack: errorInfo.componentStack,
        error,
        errorBoundary: errorInfo.errorBoundary,
      });
    },
    onUncaughtError: (error, errorInfo) => {
      logger.error("[react-root] uncaught error", {
        componentStack: errorInfo.componentStack,
        error,
      });
    },
  },
  onHydrated,
});
