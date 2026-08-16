import { Title } from "@solidjs/meta";
import { createRouter } from "@solidjs/router";
import { fileRoutes } from "@solidjs/router/fs";
import { QueryClientProvider } from "@tanstack/solid-query";
import { pageRoutes } from "virtual:file-routes";
import { HostContextProvider, readHostContext } from "./lib/host-context";
import { createAppQueryClient } from "./lib/query-client";
import { readInitialUiLocale, UiLocaleProvider } from "./lib/ui-locale";
import "./index.css";

const Router = createRouter({ routes: fileRoutes(pageRoutes) });

export default function App() {
  const hostContext = readHostContext();
  const queryClient = createAppQueryClient();
  const uiLocale = readInitialUiLocale();
  const diagnosticsWindow = typeof window === "undefined" ? undefined : window as Window & {
    __solidHydrationDiagnostics?: boolean;
    __solidQueryClient?: {
      getQueryCache: () => unknown;
    };
  };
  if (diagnosticsWindow?.__solidHydrationDiagnostics) {
    diagnosticsWindow.__solidQueryClient = queryClient;
  }

  return (
    <UiLocaleProvider locale={uiLocale}>
      <HostContextProvider value={hostContext}>
        <QueryClientProvider client={queryClient}>
          <Title>Pirate Web</Title>
          <Router>{props => props.children}</Router>
        </QueryClientProvider>
      </HostContextProvider>
    </UiLocaleProvider>
  );
}
