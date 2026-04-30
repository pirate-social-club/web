export type PublicProfileResolution = {
  is_canonical: boolean;
  profile: {
    user: string;
    display_name: string | null;
    bio: string | null;
    avatar_ref: string | null;
    cover_ref: string | null;
    created: string;
    global_handle: {
      label: string;
    };
    primary_public_handle: {
      label: string;
    } | null;
  };
  created_communities: Array<{
    community: string;
    display_name: string;
    route_slug: string | null;
    created: string;
  }>;
  requested_handle_label: string;
  resolved_handle_label: string;
};

export type PublicAgentResolution = {
  is_canonical: boolean;
  requested_handle_label: string;
  resolved_handle_label: string;
  agent: {
    agent_id: string;
    display_name?: string | null;
    handle: {
      label_display: string;
    };
    ownership_provider?: string | null;
    created: string;
    updated: string;
  };
  owner: {
    user: string;
    display_name?: string | null;
    global_handle: {
      label: string;
    };
    primary_public_handle: {
      label: string;
    } | null;
  };
};

export type Env = {
  HNS_PUBLIC_API_ORIGIN?: string;
  HNS_PUBLIC_APP_ORIGIN?: string;
};
