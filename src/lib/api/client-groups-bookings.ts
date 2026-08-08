import { buildQueryPath, type ApiRequest } from "./client-internal";
import { parseSlotsResponse } from "./bookings-types";
import type {
  AttachSessionResponse,
  BookingCancellationPreview,
  BookingHold,
  BookingQuote,
  BookingView,
  CancelBookingResponse,
  CompleteBookingResponse,
  ConfirmHoldRequest,
  ConfirmHoldResponse,
  CreateHoldRequest,
  HeartbeatRequest,
  NoShowBookingResponse,
  PendingBookingPaymentIntentsResponse,
  SlotsResponse,
  StartSessionResponse,
} from "./bookings-types";

const c = (id: string) => encodeURIComponent(id);

// Global booking flow. Communities are optional discovery context only.
export function createBookingsApi(request: ApiRequest) {
  return {
    listBookingSlots: (
      hostUserId: string,
      params: { from?: string; to?: string; tz?: string } = {},
    ): Promise<SlotsResponse> =>
      request<unknown>(buildQueryPath(
        `/bookings/hosts/${c(hostUserId)}/slots`,
        { from: params.from, to: params.to, tz: params.tz },
      )).then(parseSlotsResponse),

    createBookingHold: (hostUserId: string, body: CreateHoldRequest): Promise<{ hold: BookingHold }> =>
      request<{ hold: BookingHold }>(`/bookings/hosts/${c(hostUserId)}/holds`, { method: "POST", body: JSON.stringify(body) }),
    quoteBookingHold: (holdId: string): Promise<{ quote: BookingQuote }> =>
      request<{ quote: BookingQuote }>(`/bookings/holds/${c(holdId)}/quote`, { method: "POST" }),
    confirmBookingHold: (holdId: string, body: ConfirmHoldRequest): Promise<ConfirmHoldResponse> =>
      request<ConfirmHoldResponse>(`/bookings/holds/${c(holdId)}/confirm`, { method: "POST", body: JSON.stringify(body) }),
    reportBookingPaymentSubmitted: (
      holdId: string,
      body: { tx_ref: string; wallet_attachment_id: string },
    ): Promise<{ payment_intent_id: string; status: "recorded"; claimed_tx_ref: string }> =>
      request(`/bookings/holds/${c(holdId)}/payment-submitted`, {
        method: "POST",
        body: JSON.stringify(body),
      }),
    listPendingBookingPaymentIntents: (): Promise<PendingBookingPaymentIntentsResponse> =>
      request("/bookings/payment-intents/pending"),

    getBooking: (bookingId: string): Promise<{ booking: BookingView }> =>
      request<{ booking: BookingView }>(`/bookings/${c(bookingId)}`),
    listBookings: (params: { role: "host" | "booker"; status?: string; source_community_id?: string | null }): Promise<{ object: "list"; data: BookingView[]; has_more: boolean }> =>
      request<{ object: "list"; data: BookingView[]; has_more: boolean }>(buildQueryPath(
        "/bookings",
        { role: params.role, status: params.status, source_community_id: params.source_community_id ?? undefined },
      )),

    startBookingSession: (bookingId: string): Promise<StartSessionResponse> =>
      request<StartSessionResponse>(`/bookings/${c(bookingId)}/start`, { method: "POST" }),
    attachBookingSession: (bookingId: string): Promise<AttachSessionResponse> =>
      request<AttachSessionResponse>(`/bookings/${c(bookingId)}/session/attach`, { method: "POST" }),
    heartbeatBookingSession: (bookingId: string, body: HeartbeatRequest): Promise<{ ok: true }> =>
      request<{ ok: true }>(`/bookings/${c(bookingId)}/session/heartbeat`, { method: "POST", body: JSON.stringify(body) }),

    getBookingCancellationPreview: (bookingId: string): Promise<BookingCancellationPreview> =>
      request<BookingCancellationPreview>(`/bookings/${c(bookingId)}/cancellation-preview`),
    cancelBooking: (bookingId: string, expectedRefundCents?: number): Promise<CancelBookingResponse> =>
      request<CancelBookingResponse>(`/bookings/${c(bookingId)}/cancel`, {
        method: "POST",
        ...(expectedRefundCents === undefined
          ? {}
          : { body: JSON.stringify({ expected_refund_cents: expectedRefundCents }) }),
      }),
    completeBooking: (bookingId: string): Promise<CompleteBookingResponse> =>
      request<CompleteBookingResponse>(`/bookings/${c(bookingId)}/complete`, { method: "POST" }),
    noShowBooking: (bookingId: string): Promise<NoShowBookingResponse> =>
      request<NoShowBookingResponse>(`/bookings/${c(bookingId)}/no-show`, { method: "POST" }),
  };
}
