export interface IService {
  _id?: string;
  serviceId: string;
  name: string;
  category: 'cleaning' | 'laundry' | 'car_care';
  type: 'house_cleaning' | 'dishwashing' | 'car_cleaning' | 'laundry' | 'bathroom_cleaning';
  description: string;
  icon?: string;
  basePrice: number;
  ratePerMinute: number;
  minimumDuration: number;
  maximumDuration: number;
  availablePackages: {
    type: 'one-time' | 'daily' | 'weekly';
    minDays?: number;
  }[];
  tasks: {
    id: string;
    name: string;
    description?: string;
    isDefault: boolean;
  }[];
  addOns: {
    id: string;
    name: string;
    price: number;
    description?: string;
  }[];
  isActive: boolean;
  createdAt?: Date;
  updatedAt?: Date;
}
