export type CommunityBranding = {
  accent_color: string | null;
  header_style: "standard" | "compact" | "immersive";
  tagline: string | null;
  theme: "system" | "light" | "dark";
};

type CommunityBrandingPatch = Partial<CommunityBranding>;

export type CommunityPresentation = {
  branding: CommunityBranding;
  community: string;
  default_surface: "threads" | "videos";
  id: string;
  object: "community_presentation";
  video_feed_enabled: boolean;
};

export type CommunityPresentationPatch = {
  branding?: CommunityBrandingPatch;
  default_surface?: "threads" | "videos";
  video_feed_enabled?: boolean;
};

const DEFAULT_COMMUNITY_BRANDING: CommunityBranding = {
  accent_color: null,
  header_style: "standard",
  tagline: null,
  theme: "system",
};

type PresentationCarrier = {
  branding?: CommunityBranding;
  default_surface?: "threads" | "videos";
  video_feed_enabled?: boolean;
};

export function readCommunityPresentation(value: unknown): {
  branding: CommunityBranding;
  default_surface: "threads" | "videos";
  video_feed_enabled: boolean;
} {
  const carrier = value && typeof value === "object" ? value as PresentationCarrier : {};
  return {
    branding: carrier.branding ?? DEFAULT_COMMUNITY_BRANDING,
    default_surface: carrier.default_surface === "videos" ? "videos" : "threads",
    video_feed_enabled: carrier.video_feed_enabled !== false,
  };
}
