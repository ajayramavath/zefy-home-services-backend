export interface IBooking {
  _id?: string;
  bookingId: string; // Unique booking reference
  userId: string;
  partnerId?: string;
  hubId: string;

  service: {
    serviceId: string;
    serviceName: string;
    serviceType: 'one-time' | 'daily' | 'weekly';
    tasks: string[]; // ['sweeping', 'mopping', 'dusting']
    addOns?: string[];
  };

  schedule: {
    bookingType: 'instant' | 'scheduled';
    scheduledDate: Date;
    scheduledTime: string; // "14:30"
    duration: number; // in minutes
    recurringDays?: number[]; // For daily/weekly packages
  };

  address: {
    street: string;
    city: string;
    state: string;
    pincode: string;
    coordinates: {
      lat: number;
      lng: number;
    };
    propertyDetails: {
      bedrooms: number;
      bathrooms: number;
      balconies: number;
      kitchens: number;
      livingRooms: number;
    };
  };

  pricing: {
    basePrice: number;
    ratePerMinute: number;
    estimatedTotal: number;
    finalTotal?: number;
    discount?: number;
    taxes: number;
  };

  payment: {
    method: 'prepaid' | 'cod';
    status: 'pending' | 'completed' | 'failed' | 'refunded';
    transactionId?: string;
    paidAt?: Date;
  };

  otp: {
    startOtp?: string;
    endOtp?: string;
    startOtpGeneratedAt?: Date;
    endOtpGeneratedAt?: Date;
  };

  timeline: {
    bookedAt: Date;
    confirmedAt?: Date;
    partnerAssignedAt?: Date;
    partnerArrivedAt?: Date;
    startedAt?: Date;
    completedAt?: Date;
    cancelledAt?: Date;
  };

  status:
  | 'pending_payment'
  | 'confirmed'
  | 'partner_assigned'
  | 'partner_enroute'
  | 'partner_arrived'
  | 'in_progress'
  | 'completed'
  | 'cancelled'
  | 'failed';

  cancellation?: {
    reason: string;
    cancelledBy: 'user' | 'partner' | 'system';
    refundAmount?: number;
  };

  rating?: {
    score: number;
    review?: string;
    ratedAt: Date;
  };

  createdAt?: Date;
  updatedAt?: Date;
}
