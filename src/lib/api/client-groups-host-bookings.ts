import type { ApiRequest } from "./client-internal";
import type {
  AvailabilityException,
  AvailabilityRule,
  BookingListResponse,
  BookingProfileResponse,
  CreateAvailabilityExceptionRequest,
  CreateAvailabilityRuleRequest,
  DeletedResponse,
  UpdateBookingProfileRequest,
} from "./bookings-types";

// Host-facing booking configuration (control-plane scoped, "me" = authenticated host).
export function createHostBookingsApi(request: ApiRequest) {
  return {
    getBookingProfile: (): Promise<BookingProfileResponse> =>
      request<BookingProfileResponse>("/host-bookings/me/profile"),
    updateBookingProfile: (body: UpdateBookingProfileRequest): Promise<BookingProfileResponse> =>
      request<BookingProfileResponse>("/host-bookings/me/profile", { method: "POST", body: JSON.stringify(body) }),
    publishBookingProfile: (): Promise<BookingProfileResponse> =>
      request<BookingProfileResponse>("/host-bookings/me/profile/publish", { method: "POST" }),
    unpublishBookingProfile: (): Promise<BookingProfileResponse> =>
      request<BookingProfileResponse>("/host-bookings/me/profile/unpublish", { method: "POST" }),

    listAvailabilityRules: (): Promise<BookingListResponse<AvailabilityRule>> =>
      request<BookingListResponse<AvailabilityRule>>("/host-bookings/me/availability-rules"),
    createAvailabilityRule: (body: CreateAvailabilityRuleRequest): Promise<AvailabilityRule> =>
      request<AvailabilityRule>("/host-bookings/me/availability-rules", { method: "POST", body: JSON.stringify(body) }),
    updateAvailabilityRule: (ruleId: string, body: Partial<CreateAvailabilityRuleRequest>): Promise<AvailabilityRule> =>
      request<AvailabilityRule>(`/host-bookings/me/availability-rules/${encodeURIComponent(ruleId)}`, { method: "POST", body: JSON.stringify(body) }),
    deleteAvailabilityRule: (ruleId: string): Promise<DeletedResponse> =>
      request<DeletedResponse>(`/host-bookings/me/availability-rules/${encodeURIComponent(ruleId)}`, { method: "DELETE" }),

    listAvailabilityExceptions: (): Promise<BookingListResponse<AvailabilityException>> =>
      request<BookingListResponse<AvailabilityException>>("/host-bookings/me/availability-exceptions"),
    createAvailabilityException: (body: CreateAvailabilityExceptionRequest): Promise<AvailabilityException> =>
      request<AvailabilityException>("/host-bookings/me/availability-exceptions", { method: "POST", body: JSON.stringify(body) }),
    deleteAvailabilityException: (exceptionId: string): Promise<DeletedResponse> =>
      request<DeletedResponse>(`/host-bookings/me/availability-exceptions/${encodeURIComponent(exceptionId)}`, { method: "DELETE" }),
  };
}
