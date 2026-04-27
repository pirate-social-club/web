import { initClient, initClientNavigation } from "rwsdk/client";

import { registerWebMcpTools } from "@/lib/webmcp";
import { registerServiceWorker } from "@/lib/pwa/register-service-worker";

const { handleResponse, onHydrated } = initClientNavigation();

registerWebMcpTools();
registerServiceWorker();

void initClient({
  handleResponse,
  onHydrated,
});
