export interface Coordinates {
  lat: number;
  lon: number;
}

export interface FareRequest {
  /**
   * The kind of trip: e.g. 'outstation', 'local', 'airport', etc.
   * If 'outstation', you must also include a 'subType' of 'oneway' or 'roundtrip'.
   */
  tripType: string;

  /**
   * Only required when tripType === 'outstation'.
   * Must be 'oneway' or 'roundtrip'.
   */
  subType?: string;

  /** Pickup address string (freeform) */
  fromAddress: string;

  /** Dropoff address string (freeform) */
  toAddress: string;

  /** ISO date: 'YYYY-MM-DD' */
  startDate: string;

  /** Time: 'HH:MM:SS' */
  startTime: string;

  /**
   * Vehicle category:
   * - 'hatchback'
   * - 'sedan'
   * - 'suv'
   * - 'all'  (means any available Gozo model)
   */
  vehicleType: 'hatchback' | 'sedan' | 'suv' | 'all';

  /** Pickup latitude */
  fromLat: number;

  /** Pickup longitude */
  fromLng: number;

  /** Dropoff latitude */
  toLat: number;

  /** Dropoff longitude */
  toLng: number;

  /** Optional passenger count */
  passengers?: number;
}

export interface FareResponse {
  aggregator: string;
  price: number;
  currency: string;
  estimatedTimeMinutes: number;
  vehicleType: string;
  raw?: unknown;
}

export interface Credentials {
  apiKey?: string;
  clientId?: string;
  clientSecret?: string;
  accessToken?: string;
  refreshToken?: string;
  [key: string]: unknown;
}
