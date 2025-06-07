import { FareRequest, FareResponse, Credentials, TripType, OutstationSubType, AirportSubType } from "@zf/types";

export interface CreateBookingRequest {
  aggregator: string;
  price: number;
  currency: string;
  estimatedTimeMinutes: number;
  userId: string;
  tripType: TripType;

  /** only if tripType === ‘outstation’ */
  subType?: OutstationSubType | AirportSubType;

  /** only if tripType === ‘roundTrip’ (inside outstation) */
  returnDate?: string; // “YYYY-MM-DD HH:MM:SS”

  fromAddress: string;
  fromLat: number;
  fromLng: number;

  toAddress: string;
  toLat: number;
  toLng: number;

  startDate: string; // “YYYY-MM-DD”
  startTime: string; // “HH:MM:SS”

  vehicleType: string;
  vehicleCode: number;
  passengers?: number;
}

export interface BookingResult {
  // Adapt this to whatever you want to return after confirm succeeds.
  bookingId: string; //  Final “confirmed” bookingId
  referenceId: string; // ReferenceId (same as we passed)
  statusDesc: string; // e.g. "Confirmed"
  statusCode: number; // e.g. 200
}


export interface BookingDetailsResult {
  userId: string;
  universalBookingId: string;
  tripType: string;
  subType?: string | null;
  // plus any fields returned by Gozo's detail API
  [key: string]: any;
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
  abstract getBookingDetails(
    creds: Credentials,
    universalBookingId: string,
    userId: string
  ): Promise<BookingDetailsResult>;
}
