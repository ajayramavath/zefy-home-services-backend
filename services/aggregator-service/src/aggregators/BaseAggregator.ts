import { FareRequest, FareResponse, Credentials } from "@zf/types";

export interface CreateBookingRequest extends FareRequest {
  aggregator: string;
  price: number;
  currency: string;
  estimatedTimeMinutes: number;
  userId: string;
}

export interface BookingResult {
  // Adapt this to whatever you want to return after confirm succeeds.
  bookingId: string; //  Final “confirmed” bookingId
  referenceId: string; // ReferenceId (same as we passed)
  statusDesc: string; // e.g. "Confirmed"
  statusCode: number; // e.g. 200
}

export abstract class BaseAggregator {
  abstract name: string;
  abstract linkAccount(creds: unknown): Promise<Credentials>;
  abstract getFares(
    creds: Credentials,
    req: FareRequest
  ): Promise<FareResponse[]>;
  abstract createBooking(
    creds: Credentials,
    req: CreateBookingRequest
  ): Promise<BookingResult>;
}
