"use client";

import * as React from "react";

import { resolveApiBaseUrl } from "@/lib/api/base-url";

interface VersionInfo {
  git_sha?: string | null;
}

async function fetchVersion(url: string): Promise<VersionInfo | null> {
  try {
    const response = await fetch(url, {
      headers: { accept: "application/json" },
      cache: "no-store",
    });
    if (!response.ok) return null;
    const body = (await response.json()) as VersionInfo;
    return body;
  } catch {
    return null;
  }
}

export function VersionBadge() {
  const [webSha, setWebSha] = React.useState<string | null>(null);
  const [apiSha, setApiSha] = React.useState<string | null>(null);

  React.useEffect(() => {
    void fetchVersion("/__version").then((v) => {
      setWebSha(v?.git_sha ?? null);
    });

    const apiBase = resolveApiBaseUrl();
    void fetchVersion(`${apiBase}/__version`).then((v) => {
      setApiSha(v?.git_sha ?? null);
    });
  }, []);

  return (
    <div className="group-data-[collapsible=icon]:hidden select-text text-[10px] leading-tight text-sidebar-foreground/45">
      <div>web {webSha ?? "-"}</div>
      <div>api {apiSha ?? "-"}</div>
    </div>
  );
}
