"use client";

import * as React from "react";

import type { AppRoute } from "@/app/router";
import { PublicProfileRoutePage } from "@/app/public-profile-route";

export function renderPublicRoute(
  route: Extract<AppRoute, { kind: "public-profile" }>,
): React.ReactNode {
  return (
    <PublicProfileRoutePage
      appOrigin={route.hostSuffix == null
        ? typeof window !== "undefined"
          ? `${window.location.protocol}//${window.location.host}`
          : "https://pirate.sc"
        : route.hostSuffix === "localhost"
          ? typeof window !== "undefined"
            ? `${window.location.protocol}//localhost${window.location.port ? `:${window.location.port}` : ""}`
            : "http://localhost:5173"
          : "https://pirate.sc"}
      handleLabel={route.handleLabel}
      hostSuffix={route.hostSuffix}
    />
  );
}
