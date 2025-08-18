export interface IHub {
  _id?: string;
  hubId: string;
  name: string;
  address: {
    street: string;
    city: string;
    state: string;
    pincode: string;
    coordinates: {
      lat: number;
      lng: number;
    };
  };
  serviceArea: {
    type: 'Polygon';
    coordinates: number[][][]; // GeoJSON Polygon
  };
  partnerCount: number;
  managers: {
    name: string;
    phone: string;
    email?: string;
  }[];
  isActive: boolean;
  hubServices?: any[];
  availableServices?: any[];

  createdAt?: Date;
  updatedAt?: Date;
}