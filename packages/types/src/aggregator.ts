export interface Coordinates {
  latitude: number;
  longitude: number;
}

export interface Location {
  address: string;
  name?: string;
  coordinates: Coordinates;
  /** Only for airport legs */
  isAirport?: 1;
}

export interface Route {
  startDate: string; // “YYYY-MM-DD”
  startTime: string; // “HH:MM:SS”
  source: Location;
  destination: Location;
}

/**
 * - tripType:
 *    ‘outstation’ | ‘airport’ | ‘urban’ | ‘rental’
 *
 * - subType:
 *    • if tripType === ‘outstation’:  ‘oneWay’ | ‘roundTrip’
 *    • if tripType === ‘airport’:    ‘pickup’   | ‘dropOff’
 *    • otherwise undefined
 */
export type TripType =
  | "outstation"
  | "airport"
  | "urban"
  | "dayRental4"
  | "dayRental8"
  | "dayRental12";
export type OutstationSubType = "oneWay" | "roundTrip";
export type AirportSubType = "pickup" | "dropOff";

export interface FareRequest {
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

  vehicleType: "hatchback" | "sedan" | "suv" | "all";

  passengers?: number;
}

export interface FareResponse {
  aggregator: string;
  price: number;
  currency: string;
  estimatedTimeMinutes: number;
  vehicleType: string;
  vehicleCode: number | string;
  rawVehicleType: string;
  raw?: any;
}

export interface Credentials {
  apiKey?: string;
  // [key: string]: unknown;
}

export interface BookingDetailsBody {
  universalBookingId: string;
  userId?: string;
}
