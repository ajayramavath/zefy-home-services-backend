export interface IService {
  _id?: string;
  serviceId: string;
  name: string;
  description: string;
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
