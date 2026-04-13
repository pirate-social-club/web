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

createRoot(rootElement).render(
  <React.StrictMode>
    <UiLocaleProvider dir="ltr" locale="en">
      <PirateApp initialPath={resolveInitialPath()} />
    </UiLocaleProvider>
  </React.StrictMode>,
);
