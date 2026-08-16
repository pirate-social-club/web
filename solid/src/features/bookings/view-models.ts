export type IanaTz = string;
export type IsoInstant = string;

export type BookingState =
  | "hold"
  | "quoted"
  | "pending_payment"
  | "confirmed"
  | "live"
  | "completed"
  | "settled"
  | "expired_hold"
  | "cancelled_before_payment"
  | "cancelled_by_host"
  | "cancelled_by_booker"
  | "no_show_host"
  | "no_show_booker"
  | "refunded"
  | "disputed";

export interface ResolvedSlot {
  startUtc: IsoInstant;
  endUtc: IsoInstant;
  priceCents: number;
  available: boolean;
}
