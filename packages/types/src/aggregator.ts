export interface Coordinates {
  lat: number;
  lon: number;
}

export interface FareRequest {
  from: Coordinates;
  to: Coordinates;
  passengers?: number;
  type?: string;
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
