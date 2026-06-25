import { buildQueryPath, type ApiRequest } from "./client-internal";
import type {
  AttachSessionResponse,
  BookingHold,
  BookingQuote,
  CancelBookingResponse,
  CompleteBookingResponse,
  ConfirmHoldRequest,
  ConfirmHoldResponse,
  CreateHoldRequest,
  HeartbeatRequest,
  NoShowBookingResponse,
  SlotsResponse,
  StartSessionResponse,
} from "./bookings-types";

const c = (id: string) => encodeURIComponent(id);

// Per-community booking flow (discovery → checkout → session → management).
export function createCommunityBookingsApi(request: ApiRequest) {
  return {
    listBookingSlots: (
      communityId: string,
      hostUserId: string,
      params: { from?: string; to?: string; tz?: string } = {},
    ): Promise<SlotsResponse> =>
      request<SlotsResponse>(buildQueryPath(
        `/communities/${c(communityId)}/booking-hosts/${c(hostUserId)}/slots`,
        { from: params.from, to: params.to, tz: params.tz },
      )),

    createBookingHold: (communityId: string, hostUserId: string, body: CreateHoldRequest): Promise<{ hold: BookingHold }> =>
      request<{ hold: BookingHold }>(`/communities/${c(communityId)}/booking-hosts/${c(hostUserId)}/holds`, { method: "POST", body: JSON.stringify(body) }),
    quoteBookingHold: (communityId: string, holdId: string): Promise<{ quote: BookingQuote }> =>
      request<{ quote: BookingQuote }>(`/communities/${c(communityId)}/booking-holds/${c(holdId)}/quote`, { method: "POST" }),
    confirmBookingHold: (communityId: string, holdId: string, body: ConfirmHoldRequest): Promise<ConfirmHoldResponse> =>
      request<ConfirmHoldResponse>(`/communities/${c(communityId)}/booking-holds/${c(holdId)}/confirm`, { method: "POST", body: JSON.stringify(body) }),

    startBookingSession: (communityId: string, bookingId: string): Promise<StartSessionResponse> =>
      request<StartSessionResponse>(`/communities/${c(communityId)}/bookings/${c(bookingId)}/start`, { method: "POST" }),
    attachBookingSession: (communityId: string, bookingId: string): Promise<AttachSessionResponse> =>
      request<AttachSessionResponse>(`/communities/${c(communityId)}/bookings/${c(bookingId)}/session/attach`, { method: "POST" }),
    heartbeatBookingSession: (communityId: string, bookingId: string, body: HeartbeatRequest): Promise<{ ok: true }> =>
      request<{ ok: true }>(`/communities/${c(communityId)}/bookings/${c(bookingId)}/session/heartbeat`, { method: "POST", body: JSON.stringify(body) }),

    cancelBooking: (communityId: string, bookingId: string): Promise<CancelBookingResponse> =>
      request<CancelBookingResponse>(`/communities/${c(communityId)}/bookings/${c(bookingId)}/cancel`, { method: "POST" }),
    completeBooking: (communityId: string, bookingId: string): Promise<CompleteBookingResponse> =>
      request<CompleteBookingResponse>(`/communities/${c(communityId)}/bookings/${c(bookingId)}/complete`, { method: "POST" }),
    noShowBooking: (communityId: string, bookingId: string): Promise<NoShowBookingResponse> =>
      request<NoShowBookingResponse>(`/communities/${c(communityId)}/bookings/${c(bookingId)}/no-show`, { method: "POST" }),
  };
}
