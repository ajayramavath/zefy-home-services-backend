export interface IBooking {
  _id: string;

  schedule: {
    type: 'instant' | 'scheduled';
    date: string;
    time: string;
    scheduledDateTime: Date;
  };

  serviceIds: string[];

  user: {
    id: string;
    name: string;
    phoneNumber: string;
    address: {
      id: string;
      addressString: string;
      coordinates: {
        lat: number;
        lng: number;
      };
      details: {
        bedrooms: number;
        bathrooms: number;
        balconies: number;
      };
    };
  };

  hubId: string;

  amount: {
    baseAmount: number;
    extraAmount: number;
    totalAmount: number;
  };

  bookingStatus: 'created' | 'readyForAssignment' | 'tracking' | 'ongoing' | 'completed' | 'cancelled';
  paymentStatus: 'pending' | 'baseAmountPaid' | 'fullAmountPaid' | 'refunded';
  partnerStatus: 'not_assigned' | 'assigned' | 'enroute' | 'arrived';

  payment: {
    baseAmountPaid: boolean;
    fullAmountPaid: boolean;
    baseAmountPaymentId?: string;
    fullAmountPaymentId?: string;
  }

  partner?: {
    id: string;
    name: string;
    photoUrl: string;
    ratings: number;
    reviewCount: number;
    phoneNumber: string;
    location?: {
      lat: number;
      lng: number;
      lastUpdated: Date;
    };
  };

  serviceDetails?: {
    startTime?: Date;
    endTime?: Date;
    duration?: number;
    startOtp: string;
    endOtp: string;
    isStartOtpVerified: boolean;
    isEndOtpVerified: boolean;
  };

  review?: {
    rating: number;
    comment: string;
    createdAt: Date;
  };

  createdAt: Date;
  updatedAt: Date;
}