// Local TS types for the booking domain.
// Shapes mirror the global /bookings and /host-bookings response builders.

export interface BookingProfile {
  object: "booking_profile";
  host: string;
  display_headline: string | null;
  bio: string | null;
  topics: string[];
  intro_video_ref: string | null;
  host_timezone: string;
  base_price_cents: number;
  default_slot_duration_seconds: number;
  platform_fee_bps: number;
  payout_wallet_address: string | null;
  is_published: boolean;
  created: number;
  updated: number;
}
interface BookingProfileEmpty {
  object: "booking_profile";
  exists: false;
  host: string;
}
export type BookingProfileResponse = BookingProfile | BookingProfileEmpty;

export interface UpdateBookingProfileRequest {
  host_timezone?: string;
  base_price_cents?: number;
  default_slot_duration_seconds?: number;
  display_headline?: string | null;
  bio?: string | null;
  topics?: string[] | null;
  intro_video_ref?: string | null;
  platform_fee_bps?: number;
  payout_wallet_address?: string | null;
}

export interface AvailabilityRule {
  object: "availability_rule";
  id: string;
  by_weekday: number[];
  start_local: string;
  end_local: string;
  slot_duration_seconds: number;
  effective_from: number | null;
  effective_until: number | null;
  created: number;
  updated: number;
}
export interface CreateAvailabilityRuleRequest {
  by_weekday: number[];
  start_local: string;
  end_local: string;
  slot_duration_seconds: number;
  effective_from_utc?: string;
  effective_until_utc?: string;
}
export type UpdateAvailabilityRuleRequest = Partial<CreateAvailabilityRuleRequest>;

export interface AvailabilityException {
  object: "availability_exception";
  id: string;
  kind: "block" | "open";
  start: number;
  end: number;
  created: number;
}
export interface CreateAvailabilityExceptionRequest {
  kind: "block" | "open";
  start_utc: string;
  end_utc: string;
}
export type UpdateAvailabilityExceptionRequest = Partial<CreateAvailabilityExceptionRequest>;

export interface PriceRule {
  object: "price_rule";
  id: string;
  match_weekday: number[] | null;
  match_local_start: string | null;
  match_local_end: string | null;
  match_duration_seconds: number | null;
  price_cents: number;
  priority: number;
  created: number;
  updated: number;
}
export interface CreatePriceRuleRequest {
  match_weekday?: number[] | null;
  match_local_start?: string | null;
  match_local_end?: string | null;
  match_duration_seconds?: number | null;
  price_cents: number;
  priority?: number;
}
export type UpdatePriceRuleRequest = Partial<CreatePriceRuleRequest>;

export interface BookingListResponse<T> {
  object: "list";
  data: T[];
  has_more: boolean;
}
export interface DeletedResponse {
  id: string;
  object: string;
  deleted: true;
}

// --- Discovery + checkout (global; community is optional discovery context) ---
export interface ResolvedSlot {
  startUtc: string;
  endUtc: string;
  priceCents: number;
  available: boolean;
}
export interface SlotsResponse {
  host_timezone: string;
  viewer_timezone: string;
  slots: ResolvedSlot[];
}

export interface BookingHold {
  hold_id: string;
  source_community_id: string | null;
  host_user_id: string;
  booker_user_id: string;
  slot_start_utc: string;
  slot_end_utc: string;
  price_cents: number;
  status: "active";
  expires_at_utc: string;
}
export interface CreateHoldRequest {
  slot_start_utc: string;
  slot_end_utc: string;
  source_community_id?: string | null;
}
interface PaymentInstructions {
  payment_intent_id: string;
  version: number;
  chain_id: number;
  token_address: string;
  token_decimals: number;
  token_symbol: string;
  recipient_address: string;
  amount_atomic: string;
  gross_cents: number;
  quote_expires_at: string;
  hold_expires_at: string;
  wallet_attachment_required: boolean;
}
export interface BookingQuote {
  hold_id: string;
  gross_cents: number;
  platform_fee_bps: number;
  platform_fee_cents: number;
  host_payout_cents: number;
  expires_at_utc: string;
  payment: PaymentInstructions;
}
export interface ConfirmHoldRequest {
  funding_tx_ref: string;
  wallet_attachment_id: string;
}

type BookingStatus =
  | "confirmed" | "live" | "completed" | "settled" | "refunded"
  | "no_show_host" | "no_show_booker" | "cancelled_by_host" | "cancelled_by_booker"
  | "cancelled_before_payment" | "expired_hold" | "disputed";

type BookingOutcome =
  | "completed" | "no_show_host" | "no_show_booker"
  | "cancelled_by_host" | "cancelled_by_booker";
type BookingSettlementStatus = "pending" | "live" | "settling" | "settled" | "refunded" | "disputed";

interface BookingCounterparty {
  user_id: string;
  public_handle: string | null;
  display_name: string | null;
  avatar_ref: string | null;
}

interface Booking {
  booking_id: string;
  source_community_id: string | null;
  hold_id: string;
  host_user_id: string;
  booker_user_id: string;
  slot_start_utc: string;
  slot_end_utc: string;
  gross_cents: number;
  platform_fee_bps: number;
  platform_fee_cents: number;
  host_payout_cents: number;
  status: BookingStatus;
  funding_tx_ref: string | null;
  funding_wallet_address: string | null;
  host_payout_wallet_address: string | null;
  live_room_id: string | null;
  confirmed_at: number | null;
  created_at: number;
  updated_at: number;
}
export interface ConfirmHoldResponse { booking: Booking; already_confirmed: boolean }

// Lifecycle action responses share a compact booking snapshot.
interface BookingSnapshot {
  booking_id: string;
  status: BookingStatus;
  outcome: BookingOutcome | null;
  refund_cents: number;
  refund_tx_ref: string | null;
  payout_tx_ref: string | null;
}
export interface StartSessionResponse { booking: BookingSnapshot; already_live: boolean }
export interface CancelBookingResponse { booking: BookingSnapshot; cancelled_by: "host" | "booker"; already_cancelled: boolean }
export interface CompleteBookingResponse { booking: BookingSnapshot; already_settled: boolean }
export interface NoShowBookingResponse { booking: BookingSnapshot; already_resolved: boolean }

// Party-facing booking view (GET endpoints). Mirrors api booking-read-service.BookingView — omits
// wallet snapshots + internal commerce refs.
export interface BookingView {
  object: "booking";
  booking_id: string;
  source_community_id: string | null;
  host_user_id: string;
  booker_user_id: string;
  slot_start_utc: string;
  slot_end_utc: string;
  gross_cents: number;
  platform_fee_cents: number;
  host_payout_cents: number;
  refund_cents: number | null;
  status: BookingStatus;
  outcome: BookingOutcome | null;
  settlement_status: BookingSettlementStatus;
  counterparty?: BookingCounterparty;
  funding_tx_ref: string | null;
  payout_tx_ref: string | null;
  refund_tx_ref: string | null;
  live_room_id: string | null;
  confirmed_at: string | null;
  completed_at: string | null;
  settled_at: string | null;
  cancelled_at: string | null;
  created_at: string;
  updated_at: string;
  viewer_role: "host" | "booker";
}

interface AgoraBlock {
  app_id: string;
  channel: string;
  uid: number;
  token: string;
  token_expires_in_seconds: number;
}
export interface AttachSessionResponse {
  session_id: string;
  party: "host" | "booker";
  channel: string;
  agora: AgoraBlock;
}
export interface HeartbeatRequest { session_id: string }

export interface BookingCancellationPreview {
  object: "booking_cancellation_preview";
  booking_id: string;
  cancelled_by: "host" | "booker";
  gross_cents: number;
  refund_cents: number;
  host_payout_cents: number;
  platform_fee_cents: number;
  previewed_at: string;
  policy_cutoff_at: string | null;
}
