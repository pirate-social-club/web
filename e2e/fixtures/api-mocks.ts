import type { Page, Route } from "@playwright/test";

import {
  createMockCommentListItem,
  createMockStoredSession,
  createMockHomeFeedItem,
  createMockPostResponse,
  createMockVinylSongPostResponse,
  mockCommentBody,
  mockCommunityId,
  mockCommunityPreview,
  mockCreatedPostId,
  mockDerivativeSources,
  mockFeedPostId,
  mockJoinEligibility,
  mockOnboarding,
  mockProfile,
  mockUser,
  mockVinylAssetId,
  mockVinylListingId,
  mockVinylPostId,
  mockVinylPurchaseId,
  mockVinylReleaseUrl,
  mockWalletAddress,
} from "./auth-session";
import { installLocalE2eWallet, installStoredSession } from "./session";

const pirateApiPattern = /https?:\/\/(?:api-staging\.pirate\.sc|api\.pirate\.sc|127\.0\.0\.1:8787)\/.*/u;

function jsonResponse(body: unknown, status = 200) {
  return {
    body: JSON.stringify(body),
    contentType: "application/json",
    status,
  };
}

function emptyCursorList() {
  return { items: [], next_cursor: null };
}

function createHomeFeedItems(sort: string | null, timeRange: string | null) {
  const newest = createMockHomeFeedItem({
    commentCount: 0,
    created: Date.parse("2026-05-03T00:00:00.000Z"),
    downvoteCount: 0,
    id: "pst_e2e_newest",
    title: "E2E newest post",
    upvoteCount: 0,
  });
  const top = createMockHomeFeedItem({
    commentCount: 4,
    created: Date.parse("2026-05-01T00:00:00.000Z"),
    downvoteCount: 0,
    id: mockFeedPostId,
    title: "E2E feed post",
    upvoteCount: 8,
  });
  const middle = createMockHomeFeedItem({
    commentCount: 1,
    created: Date.parse("2026-05-02T00:00:00.000Z"),
    downvoteCount: 0,
    id: "pst_e2e_middle",
    title: "E2E middle post",
    upvoteCount: 1,
  });

  if (sort === "new") return [newest, middle, top];
  if (sort === "top" && timeRange === "all") return [top, middle, newest];
  return [top, middle, newest];
}

function createVinylListing() {
  return {
    id: mockVinylListingId,
    object: "community_listing",
    community: mockCommunityId,
    asset: mockVinylAssetId,
    live_room: null,
    listing_mode: "fixed_price",
    status: "active",
    price_cents: 700,
    regional_pricing_enabled: false,
    donation_partner: null,
    donation_share_bps: null,
    vinyl_release_available: true,
    vinyl_release_provider: "elasticstage",
    created_by_user: "usr_e2e_artist",
    created: Date.parse("2026-05-02T00:00:00.000Z"),
  };
}

function createVinylPurchase() {
  return {
    id: mockVinylPurchaseId,
    object: "community_purchase",
    community: mockCommunityId,
    listing: mockVinylListingId,
    asset: mockVinylAssetId,
    live_room: null,
    buyer_user: mockUser.id,
    settlement_wallet_attachment: mockUser.primary_wallet_attachment,
    purchase_price_cents: 700,
    pricing_tier: null,
    settlement_mode: "delivery_only_story_settlement",
    settlement_chain: { chain_namespace: "eip155", chain_id: 1315, display_name: "Story Aeneid" },
    settlement_token: "IP",
    settlement_tx_ref: "0xe2e",
    allocations: [],
    donation_partner: null,
    donation_share_bps: null,
    donation_amount_cents: null,
    vinyl_release_provider: "elasticstage",
    vinyl_release_url: mockVinylReleaseUrl,
    purchase_entitlement: "pe_e2e_vinyl_song",
    entitlement_kind: "asset_access",
    entitlement_target_ref: mockVinylAssetId,
    created: Date.parse("2026-05-02T00:01:00.000Z"),
  };
}

async function fulfillPirateApiRoute(route: Route, state: { commentCreated: boolean; vinylPurchased: boolean }): Promise<void> {
  const request = route.request();
  const url = new URL(request.url());
  const method = request.method().toUpperCase();
  const path = url.pathname;

  if (method === "GET" && path === "/users/me") {
    await route.fulfill(jsonResponse(mockUser));
    return;
  }

  if (method === "GET" && path === "/profiles/me") {
    await route.fulfill(jsonResponse(mockProfile));
    return;
  }

  if (method === "POST" && path === "/profiles/me/sync-linked-handles") {
    await route.fulfill(jsonResponse(mockProfile));
    return;
  }

  if (method === "POST" && path === "/profiles/me") {
    const body = request.postDataJSON() as { bio?: string; display_name?: string; preferred_locale?: string } | null;
    await route.fulfill(jsonResponse({
      ...mockProfile,
      bio: body?.bio ?? mockProfile.bio,
      display_name: body?.display_name ?? mockProfile.display_name,
      preferred_locale: body?.preferred_locale ?? mockProfile.preferred_locale,
    }));
    return;
  }

  if (method === "GET" && path === "/onboarding/status") {
    await route.fulfill(jsonResponse(mockOnboarding));
    return;
  }

  if (method === "GET" && (path === "/feed/home" || path === "/feed/home/public")) {
    await route.fulfill(jsonResponse({
      items: createHomeFeedItems(url.searchParams.get("sort"), url.searchParams.get("time_range")),
      top_communities: [],
    }));
    return;
  }

  if (method === "GET" && path === `/profiles/${encodeURIComponent(mockUser.id)}`) {
    await route.fulfill(jsonResponse(mockProfile));
    return;
  }

  if (method === "GET" && path === "/profiles/usr_e2e_artist") {
    await route.fulfill(jsonResponse({
      ...mockProfile,
      id: "usr_e2e_artist",
      display_name: "E2E Artist",
      global_handle: {
        ...mockProfile.global_handle,
        id: "gh_e2e_artist",
        label: "e2e-artist.pirate",
      },
      primary_wallet_address: "0x2222222222222222222222222222222222222222",
    }));
    return;
  }

  if (method === "POST" && path === `/posts/${encodeURIComponent(mockFeedPostId)}/vote`) {
    await route.fulfill(jsonResponse({ post: mockFeedPostId, value: 1 }));
    return;
  }

  if (method === "GET" && path === `/posts/${encodeURIComponent(mockFeedPostId)}`) {
    await route.fulfill(jsonResponse(createMockPostResponse()));
    return;
  }

  if (method === "GET" && path === `/posts/${encodeURIComponent(mockVinylPostId)}`) {
    await route.fulfill(jsonResponse(createMockVinylSongPostResponse()));
    return;
  }

  if (method === "GET" && path === "/notifications/summary") {
    await route.fulfill(jsonResponse({
      has_unread: false,
      open_task_count: 0,
      unread_activity_count: 0,
    }));
    return;
  }

  if (method === "GET" && (path === "/notifications/tasks" || path === "/notifications/feed")) {
    await route.fulfill(jsonResponse(emptyCursorList()));
    return;
  }

  if (method === "POST" && path === "/notifications/mark-read") {
    await route.fulfill(jsonResponse({ ok: true }));
    return;
  }

  if (method === "GET" && path === "/agents") {
    await route.fulfill(jsonResponse({ items: [] }));
    return;
  }

  if (
    method === "GET"
    && (
      path === `/communities/${encodeURIComponent(mockCommunityId)}`
      || path === `/communities/${encodeURIComponent(mockCommunityId)}/preview`
    )
  ) {
    await route.fulfill(jsonResponse({
      ...mockCommunityPreview,
      object: path.endsWith("/preview") ? "community_preview" : "community",
      created_by_user: "usr_owner",
      gate_rules: [],
      governance_mode: "centralized",
    }));
    return;
  }

  if (method === "GET" && path === `/communities/${encodeURIComponent(mockCommunityId)}/join-eligibility`) {
    await route.fulfill(jsonResponse(mockJoinEligibility));
    return;
  }

  if (method === "GET" && path === `/communities/${encodeURIComponent(mockCommunityId)}/pricing-policy`) {
    await route.fulfill(jsonResponse({
      id: "cpp_e2e",
      object: "community_pricing_policy",
      policy_origin: "community",
      pricing_policy_version: "v1",
      regional_pricing_enabled: false,
      verification_provider_requirement: null,
      default_tier_key: null,
      tiers: [],
      country_assignments: [],
      source_template: null,
      source_template_version: null,
    }));
    return;
  }

  if (method === "GET" && path === `/communities/${encodeURIComponent(mockCommunityId)}/assets/${encodeURIComponent(mockVinylAssetId)}`) {
    await route.fulfill(jsonResponse({
      id: mockVinylAssetId,
      object: "asset",
      community: mockCommunityId,
      source_post: mockVinylPostId,
      display_title: "E2E Vinyl Song",
      song_artifact_bundle: "sab_e2e_vinyl_song",
      creator_user: "usr_e2e_artist",
      asset_kind: "song_audio",
      rights_basis: "original",
      access_mode: "locked",
      license_preset: "commercial-use",
      commercial_rev_share_pct: null,
      primary_content_ref: `locked:${mockVinylAssetId}`,
      primary_content_hash: null,
      publication_status: "story_published",
      story_status: "none",
      story_error: null,
      story_ip: null,
      story_ip_nft_contract: null,
      story_ip_nft_token: null,
      story_publish_model: "pirate_v1",
      story_license_terms: null,
      story_license_template: null,
      story_royalty_policy: null,
      story_derivative_parent_ip_ids: null,
      story_derivative_registered_at: null,
      story_revenue_token: null,
      story_royalty_registration_status: "none",
      story_publish_tx_ref: null,
      story_asset_version: null,
      story_cdr_vault_uuid: null,
      story_namespace: null,
      story_entitlement_token: null,
      story_read_condition: null,
      story_write_condition: null,
      locked_delivery_status: "ready",
      locked_delivery_ref: "/e2e/song-full.mp3",
      locked_delivery_error: null,
      created: Date.parse("2026-05-02T00:00:00.000Z"),
    }));
    return;
  }

  if (method === "GET" && path === `/communities/${encodeURIComponent(mockCommunityId)}/listings`) {
    await route.fulfill(jsonResponse({ items: [createVinylListing()], next_cursor: null }));
    return;
  }

  if (method === "GET" && path === `/communities/${encodeURIComponent(mockCommunityId)}/purchases`) {
    await route.fulfill(jsonResponse({
      items: state.vinylPurchased ? [createVinylPurchase()] : [],
      next_cursor: null,
    }));
    return;
  }

  if (method === "POST" && path === `/communities/${encodeURIComponent(mockCommunityId)}/purchase-quote-preflight`) {
    await route.fulfill(jsonResponse({
      community: mockCommunityId,
      eligible: true,
      funding_mode: "routed",
      policy_origin: "explicit",
      funding_preference: "USDC",
      funding_asset: { asset_symbol: "USDC", chain_namespace: "eip155", chain_id: 84532, display_name: "USDC" },
      source_chain: { chain_namespace: "eip155", chain_id: 84532, display_name: "Base Sepolia" },
      route_provider: "pirate_checkout",
      destination_settlement_chain: { chain_namespace: "eip155", chain_id: 1315, display_name: "Story Aeneid" },
      destination_settlement_token: "IP",
      treasury_denomination: null,
      max_slippage_bps: 0,
      quote_ttl_seconds: 60,
      route_required: true,
      route_status_policy: "fail",
      route_hop_tolerance: 0,
      base_price_cents: 700,
      viewer_price_cents: 700,
      best_verified_price_cents: null,
      max_self_discount_bps: null,
      verification_required_provider: null,
      quoted_at: Date.parse("2026-05-02T00:00:30.000Z"),
      expires_at: Date.parse("2026-05-02T00:01:30.000Z"),
    }));
    return;
  }

  if (method === "POST" && path === `/communities/${encodeURIComponent(mockCommunityId)}/purchase-quotes`) {
    await route.fulfill(jsonResponse({
      id: "pq_e2e_vinyl_song",
      object: "community_purchase_quote",
      community: mockCommunityId,
      listing: mockVinylListingId,
      buyer_user: mockUser.id,
      asset: mockVinylAssetId,
      live_room: null,
      base_price_cents: 700,
      pricing_tier: null,
      final_price_cents: 700,
      settlement_mode: "delivery_only_story_settlement",
      allocation_snapshot: [],
      funding_mode: "routed",
      funding_asset: { asset_symbol: "USDC", chain_namespace: "eip155", chain_id: 84532, display_name: "USDC" },
      source_chain: { chain_namespace: "eip155", chain_id: 84532, display_name: "Base Sepolia" },
      route_provider: "pirate_checkout",
      route_policy_compliant: true,
      route_live_available: true,
      policy_origin: "explicit",
      destination_settlement_chain: { chain_namespace: "eip155", chain_id: 1315, display_name: "Story Aeneid" },
      destination_settlement_token: "IP",
      destination_settlement_amount_atomic: "7000000000000000000",
      destination_settlement_decimals: 18,
      funding_destination_address: "0x3333333333333333333333333333333333333333",
      treasury_denomination: null,
      quote_ttl_seconds: 60,
      route_required: true,
      route_status_policy: "fail",
      route_hop_tolerance: 0,
      verification_snapshot_ref: null,
      pricing_policy_version: null,
      quoted_at: Date.parse("2026-05-02T00:00:30.000Z"),
      expires_at: Date.parse("2026-05-02T00:01:30.000Z"),
    }));
    return;
  }

  if (method === "POST" && path === `/communities/${encodeURIComponent(mockCommunityId)}/purchase-settlements`) {
    const body = request.postDataJSON() as { funding_tx_ref?: string; quote?: string } | null;
    state.vinylPurchased = true;
    await route.fulfill(jsonResponse({
      ...createVinylPurchase(),
      object: "community_purchase_settlement",
      quote: body?.quote ?? "pq_e2e_vinyl_song",
      settlement_chain_ref: "eip155:1315",
      settlement_tx_ref: body?.funding_tx_ref ?? "0xe2e",
      settled_at: Date.parse("2026-05-02T00:01:00.000Z"),
    }));
    return;
  }

  if (method === "POST" && path === `/communities/${encodeURIComponent(mockCommunityId)}/fail-purchase-settlement`) {
    await route.fulfill(jsonResponse({
      id: "psf_e2e_vinyl_song",
      object: "community_purchase_settlement_failure",
      quote: "pq_e2e_vinyl_song",
      community: mockCommunityId,
      status: "failed",
      failed_at: Date.parse("2026-05-02T00:01:00.000Z"),
      expires_at: Date.parse("2026-05-02T00:01:30.000Z"),
    }));
    return;
  }

  if (method === "GET" && path === `/communities/${encodeURIComponent(mockCommunityId)}/derivative-sources`) {
    await route.fulfill(jsonResponse({ items: mockDerivativeSources, next_cursor: null }));
    return;
  }

  if (method === "POST" && path === `/communities/${encodeURIComponent(mockCommunityId)}/posts`) {
    const body = request.postDataJSON() as { body?: string; title?: string } | null;
    await route.fulfill(jsonResponse({
      ...createMockPostResponse({
        body: body?.body ?? null,
        id: mockCreatedPostId,
        title: body?.title ?? "Created E2E post",
      }).post,
      id: mockCreatedPostId,
      post: mockCreatedPostId,
    }));
    return;
  }

  if (
    method === "GET"
    && (
      path === `/communities/${encodeURIComponent(mockCommunityId)}/posts/${encodeURIComponent(mockFeedPostId)}/comments`
      || path === `/communities/${encodeURIComponent(mockCommunityId)}/posts/${encodeURIComponent(mockVinylPostId)}/comments`
    )
  ) {
    await route.fulfill(jsonResponse({
      items: path.includes(mockFeedPostId) && state.commentCreated ? [createMockCommentListItem({ body: mockCommentBody })] : [],
      next_cursor: null,
    }));
    return;
  }

  if (method === "POST" && path === `/communities/${encodeURIComponent(mockCommunityId)}/posts/${encodeURIComponent(mockFeedPostId)}/comments`) {
    state.commentCreated = true;
    await route.fulfill({ status: 204 });
    return;
  }

  if (method === "GET" && path === "/onboarding/reddit-imports/latest") {
    await route.fulfill(jsonResponse({
      coverage_note: null,
      imported_reddit_score: null,
      reddit_username: "e2etest",
    }));
    return;
  }

  await route.fulfill(jsonResponse({
    code: "e2e_unhandled_api_route",
    message: `Unhandled E2E API fixture for ${method} ${path}`,
  }, 501));
}

export async function installMockSession(page: Page): Promise<void> {
  const session = createMockStoredSession();
  await installStoredSession(page, session);
}

export async function installMockWallet(page: Page): Promise<void> {
  await installLocalE2eWallet(page, {
    address: mockWalletAddress,
    checkoutTxRef: "0xe2e",
  });
}

export async function installAuthenticatedApiMocks(page: Page): Promise<void> {
  const state = { commentCreated: false, vinylPurchased: false };
  await page.route(pirateApiPattern, (route) => fulfillPirateApiRoute(route, state));
}
