import * as React from "react";
import { createRoot } from "react-dom/client";

import "@pirate-web/styles/tokens.css";

import { PirateApp } from "./app";

export function bootstrapDesktopStandalone(): void {
  const container = document.getElementById("root");
  if (!container) {
    throw new Error("Missing #root container");
  }

  createRoot(container).render(
    <React.StrictMode>
      <PirateApp />
    </React.StrictMode>,
  );
}

bootstrapDesktopStandalone();
