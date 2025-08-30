export interface IAddress {
  _id?: string;
  userId: string;
  hubId: string;
  label: string;

  lat: number;
  lng: number;

  googleMapsShortAddress: string;
  googleMapsLongAddress: string;

  house_number: string;
  road: string;
  landmark: string;

  bedrooms: number;
  bathrooms: number;
  balconies: number;

  contact_phone_number: string;
  contact_name: string;

  createdAt?: Date;
  updatedAt?: Date;
}