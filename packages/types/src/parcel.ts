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

export interface ContactDetails {
  name: string;
  phone_number: string;
}

export interface Address {
  apartment_address: string;
  street_address1: string;
  street_address2: string;
  landmark: string;
  city: string;
  state: string;
  pincode: string;
  country: string;
  lat: number;
  lng: number;
  contact_details: ContactDetails;
}

export interface OrderRequest {
  // request_id: string | null;
  provider: string;
  delivery_instructions?: {
    instructions_list: Array<{
      type: string;
      description: string;
    }>;
  };
  pickup_details: { address: Address };
  drop_details: { address: Address };
}
