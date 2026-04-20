export type ResourceLinkId = "blog" | "terms-of-service" | "privacy-policy";

export function resolveResourceHref(id: string): string | null {
  switch (id as ResourceLinkId) {
    case "blog":
      return "https://blog.pirate.sc";
    case "terms-of-service":
      return "/terms";
    case "privacy-policy":
      return "/privacy";
    default:
      return null;
  }
}
