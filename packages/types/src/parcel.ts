import { Location } from "./aggregator";

export interface PhoneDetails {
  countryCode: string;
  phoneNumber: string;
}

export interface custDetails {
  name: string;
  mobile: PhoneDetails;
}

export interface QuoteRequest {
  pickUp: Location;
  dropOff: Location;
  customer: custDetails;
}

export interface QuoteResponse {
  vehicles: VehicleList[];
}

export interface VehicleList {}

export interface VehicleDetails {
  type: string;
  eta?: EtaDetails;
  fare: FareDetails;
  capacity?: CapacityDetails;
  size?: SizeDetails;
}

export interface EtaDetails {
  value: number;
  unit: string;
}

export interface CapacityDetails {
  value: number;
  unit: string;
}

export interface SizeDetails {
  value: number;
  unit: string;
}

export interface FareDetails {
  currency: string;
  minorAmount: number;
}
