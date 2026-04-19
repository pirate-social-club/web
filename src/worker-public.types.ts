export type PublicProfileResolution = {
  is_canonical: boolean;
  profile: {
    user_id: string;
    display_name: string | null;
    bio: string | null;
    avatar_ref: string | null;
    cover_ref: string | null;
    created_at: string;
    global_handle: {
      label: string;
    };
    primary_public_handle?: {
      label: string;
    } | null;
  };
  created_communities: Array<{
    community_id: string;
    display_name: string;
    route_slug: string | null;
    created_at: string;
  }>;
  requested_handle_label: string;
  resolved_handle_label: string;
};

export type Env = {
  HNS_PUBLIC_API_ORIGIN?: string;
  HNS_PUBLIC_APP_ORIGIN?: string;
};
