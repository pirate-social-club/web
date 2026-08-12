import { buildCommunityPath } from "@/lib/community-routing";

export function resolveSovereignApexRedirect(input: {
  communityId: string | null;
  communityRoute?: string | null;
  effectiveUrl: string;
}): string | null {
  if (!input.communityId) return null;

  const source = new URL(input.effectiveUrl);
  const labels = source.hostname.split(".").filter(Boolean);
  if (labels.length !== 1) return null;

  const target = new URL(source);
  target.hostname = `app.${source.hostname}`;
  target.port = "";
  if (target.pathname === "/") {
    target.pathname = `${buildCommunityPath(input.communityId, input.communityRoute)}/threads`;
  }
  return target.toString();
}
