export interface IPartnerStats {
  _id?: string;
  partnerId: string;
  hubId: string;
  date: Date; // ISO start of the day

  bookingsAssigned: string[]; // booking IDs
  bookingsCompleted: string[];

  metrics: {
    onlineTime: number;
    idleTime: number;
    breakTime: number;
    activeTime: number;
  }

  curruntBookingId: string | null;

  createdAt?: Date;
  updatedAt?: Date;
}