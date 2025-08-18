export interface IService {
  _id?: string;
  serviceId: string;
  version: IServiceVersion;
  name: string;
  description: string;
  type: 'SWEEPING_MOPPING' | 'KITCHEN_UTENSILS' | 'CAR_CLEANING' | 'LAUNDRY' | 'BATHROOM' | 'KITCHEN_PREP' | 'DAILY_ESSENTIALS';
  icon?: string;
  isPackage: boolean;
  basePrice: number;
  ratePerMinute: number;
  estimatedDuration: number;
  tasksIncluded: Array<string>;
  tasksExcluded: Array<string>;
  isAvailable: boolean;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface IServiceVersion {
  version: string;
};