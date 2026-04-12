import * as React from "react";
import { createRoot } from "react-dom/client";

import { readPublicRuntimeEnv } from "@/lib/public-runtime-env";
import { UiLocaleProvider } from "@/lib/ui-locale";
import "@/styles/tokens.css";

type PirateAppModule = typeof import("@/app");

function LocalStandaloneApp({ PirateApp }: { PirateApp: PirateAppModule["PirateApp"] }) {
  return (
    <UiLocaleProvider dir="ltr" locale="en">
      <PirateApp />
    </UiLocaleProvider>
  );
}

const rootElement = document.getElementById("root");

if (!rootElement) {
  throw new Error("Missing #root element");
}

globalThis.process = globalThis.process ?? {};
globalThis.process.env = globalThis.process.env ?? {};
globalThis.__PIRATE_ENV__ = readPublicRuntimeEnv();
Object.assign(globalThis.process.env, globalThis.__PIRATE_ENV__, {
  PRIVY_APP_ID: globalThis.__PIRATE_ENV__.VITE_PRIVY_APP_ID,
});

const { PirateApp } = await import("@/app");

createRoot(rootElement).render(
  <React.StrictMode>
    <LocalStandaloneApp PirateApp={PirateApp} />
  </React.StrictMode>,
);
