import { expect, type Page } from "@playwright/test";

export const browserErrorPattern = /Application error|Something went wrong|Root error|Pirate didn't load|didn't load/u;

export function resolveApiBaseURL(appBaseURL: string): string {
  const hostname = new URL(appBaseURL).hostname;
  if (hostname === "staging.pirate.sc" || hostname.endsWith(".staging.pirate.sc")) {
    return "https://api-staging.pirate.sc";
  }
  if (hostname === "pirate.sc" || hostname === "www.pirate.sc" || hostname.endsWith(".pirate.sc")) {
    return "https://api.pirate.sc";
  }
  return "http://127.0.0.1:8787";
}

export function pathSegment(value: string): string {
  return encodeURIComponent(value).replace(/%2F/giu, "%252F");
}

export function firstString(...values: unknown[]): string | undefined {
  for (const value of values) {
    if (typeof value === "string" && value.trim()) return value.trim();
  }
  return undefined;
}

export async function expectNoBrowserError(page: Page): Promise<void> {
  await expect(page.locator("body")).not.toContainText(browserErrorPattern);
}
