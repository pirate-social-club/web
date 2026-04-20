import { initClient, initClientNavigation } from "rwsdk/client";

import { registerWebMcpTools } from "@/lib/webmcp";

const { handleResponse, onHydrated } = initClientNavigation();

registerWebMcpTools();

void initClient({
  handleResponse,
  onHydrated,
});
