export interface PartnerRegisteredEvent {
  eventType: 'PARTNER_REGISTERED';
  data: {
    partnerId: string;
    userId: string;
    hubId: string;
    services: string[];
    timestamp: string;
  };
}

export interface PartnerOnlineEvent {
  eventType: 'PARTNER_ONLINE';
  data: {
    partnerId: string;
    userId: string;
    hubId?: string;
    timestamp: string;
  };
}

export interface PartnerOfflineEvent {
  eventType: 'PARTNER_OFFLINE';
  data: {
    partnerId: string;
    userId: string;
    timestamp: string;
  };
}

export interface PartnerBookingRequestedEvent {
  eventType: 'PARTNER_BOOKING_REQUESTED';
  data: {
    bookingId: string;
    partner: {
      id: string;
      name: string;
      photoUrl: string;
      ratings: number;
      reviewCount: number;
      phoneNumber: string;
    };
    requestedAt: string;
  };
}

export interface PartnerBookingDeclinedEvent {
  eventType: 'PARTNER_BOOKING_DECLINED';
  data: {
    bookingId: string;
    partnerId: string;
    reason?: string;
    declinedAt: string;
  };
}

export interface PartnerStatusUpdatedEvent {
  eventType: 'PARTNER_STATUS_UPDATED';
  data: {
    bookingId: string;
    partnerId: string;
    partnerStatus: 'enroute' | 'arrived';
    timestamp: string;
  };
}


export interface PartnerLocationUpdatedEvent {
  eventType: 'PARTNER_LOCATION_UPDATED';
  data: {
    bookingId: string;
    partnerId: string;
    location: {
      latitude: number;
      longitude: number;
    };
    timestamp: string;
  };
}
