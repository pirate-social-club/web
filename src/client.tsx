import { initClient, initClientNavigation } from "rwsdk/client";

import { registerWebMcpTools } from "@/lib/webmcp";
import { registerServiceWorker } from "@/lib/pwa/register-service-worker";
import { logger } from "@/lib/logger";

const { handleResponse, onHydrated } = initClientNavigation();

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
