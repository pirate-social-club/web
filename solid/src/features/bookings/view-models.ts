export type IanaTz = string;
export type IsoInstant = string;

export interface ResolvedSlot {
  startUtc: IsoInstant;
  endUtc: IsoInstant;
  priceCents: number;
  available: boolean;
}
