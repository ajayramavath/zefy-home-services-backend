export interface AdminJobRequestedEvent {
  eventType: 'ADMIN_JOB_REQUESTED';
  data: {
    partner_userIds: string[];
    booking: {
      bookingId: string;
      userId: string;
      hubId: string;
      serviceDetails: Array<{
        serviceId: string;
        serviceName: string;
        serviceType: string;
        price: number;
      }>;
      addressDetails: {
        fullAddress: string;
        coordinates: {
          latitude: number;
          longitude: number;
        };
        houseDetails: {
          bedrooms: number;
          bathrooms: number;
          balconies: number;
        };
        hubId: string;
      };
      schedulingInfo: {
        type: 'instant' | 'scheduled';
        scheduledDate: string;
        timeSlot?: {
          start: string;
          end: string;
        };
      };
      amount: {
        baseAmount: number;
        totalAmount: number;
      };
      specialInstructions?: string;
      timestamp: string;
    }
  }
}

export interface AdminJobRequestBroadcastData {
  partner_userIds: string[];
  booking: {
    bookingId: string;
    userId: string;
    hubId: string;
    serviceDetails: Array<{
      serviceId: string;
      serviceName: string;
      serviceType: string;
      price: number;
    }>;
    addressDetails: {
      fullAddress: string;
      coordinates: {
        latitude: number;
        longitude: number;
      };
      houseDetails: {
        bedrooms: number;
        bathrooms: number;
        balconies: number;
      };
      hubId: string;
    };
    schedulingInfo: {
      type: 'instant' | 'scheduled';
      scheduledDate: string;
      timeSlot?: {
        start: string;
        end: string;
      };
    };
    amount: {
      baseAmount: number;
      totalAmount: number;
    };
    specialInstructions?: string;
    timestamp: string;
  }
}