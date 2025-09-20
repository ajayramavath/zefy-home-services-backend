import { IFeedback } from "./feedback";

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

  bookingStatus: 'created' | 'readyForAssignment' | 'tracking' | 'ongoing' | 'completed' | 'cancelled_with_refund' | 'cancelled_without_refund';
  paymentStatus: 'pending' | 'baseAmountPaid' | 'fullAmountPaid' | 'refunded';
  partnerStatus: 'not_assigned' | 'assigned' | 'enroute' | 'arrived';

  payment: {
    baseAmountPaid: boolean;
    fullAmountPaid: boolean;
    baseAmountPayment: {
      razorpayOrderId?: string;
      razorpayPaymentId?: string;
    };
    fullAmountPayment: {
      razorpayOrderId?: string;
      razorpayPaymentId?: string;
    }
  };

  refund?: {
    razorpayRefundId: string;
    amount: number;
    status: 'initiated' | 'processed' | 'failed';
    initiatedAt: string;
    processedAt?: string;
    failureReason?: string;
  };
  partner?: {
    id: string;
    name: string;
    photoUrl: string;
    bookingsCount: number;
    feedbacks: IFeedback[];
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

  feedback?: string

  metadata: {
    isRecurring: boolean;
    isTemplate: boolean;
    parentRecurringId?: string;
  }

  createdAt: Date;
  updatedAt: Date;
}