import * as React from "react";
import { createRoot } from "react-dom/client";

import { PirateApp } from "@/app";
import { UiLocaleProvider } from "@/lib/ui-locale";
import "@/styles/tokens.css";

const rootElement = document.getElementById("root");

if (!rootElement) {
  throw new Error("Desktop root element was not found");
}

function resolveInitialPath(): string {
  if (typeof window === "undefined") return "/";
  if (window.location.protocol === "file:") return "/";
  if (window.location.pathname === "/desktop.html") return "/";
  return window.location.pathname || "/";
}

function resolveInitialHost(): string | undefined {
  if (typeof window === "undefined") return undefined;
  if (window.location.protocol === "file:") return undefined;
  return window.location.hostname || undefined;
}

createRoot(rootElement).render(
  <React.StrictMode>
    <UiLocaleProvider dir="ltr" locale="en">
      <PirateApp initialHost={resolveInitialHost()} initialPath={resolveInitialPath()} />
    </UiLocaleProvider>
  </React.StrictMode>,
);
