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
    completedJobs: string[];
    scheduledJobs: string[];
  },
  currentBookingId: string | null;
  serviceIDs: string[];
  operationalHubId: string;
}