export interface IAvailability {
  _id?: string;
  partnerId: string;
  isOnline: boolean;
  status: 'OFFLINE' | 'IDLE' | 'ASSIGNED' | 'ENROUTE' | 'ARRIVED' | 'BUSY' | 'BREAK';
  location?: {
    coordinates: number[];
    updatedAt: Date;
  },
  workingSchedule: {
    workingDays: number[];
    workingHours: {
      start: string;
      end: string;
    };
    unavailableDates?: Date[];
  },
  todayStats: {
    completedJobs: string[]; // booking IDs
    scheduledJobs: string[]; // booking IDs
  },
  serviceIDs: string[]; // Array of service IDs
  operationalHubId: string;
}