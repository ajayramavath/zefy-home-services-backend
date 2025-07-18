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
  operationalHours: {
    start: string;
    end: string;
  };
  services: string[]; // Service IDs available at this hub
  partnerCount: number;
  managers: {
    name: string;
    phone: string;
    email?: string;
  }[];
  isActive: boolean;
  createdAt?: Date;
  updatedAt?: Date;
}