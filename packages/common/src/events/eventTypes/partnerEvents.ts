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
  data: PartnerBookingAcceptedData;
}

export interface PartnerBookingDeclinedEvent {
  eventType: 'PARTNER_BOOKING_DECLINED';
  data: PartnerBookingDeclinedData;
}

export interface PartnerBookingAcceptedData {
  bookingId: string;
  partner: {
    id: string;
    userId: string;
    name: string;
    photoUrl: string;
    ratings: number;
    reviewCount: number;
    phoneNumber: string;
  };
  requestedAt: string;
}

export interface PartnerBookingDeclinedData {
  bookingId: string;
  partnerId: string;
  reason?: string;
  declinedAt: string;
}

export interface PartnerEnrouteEvent {
  eventType: 'PARTNER_ENROUTE_EVENT';
  data: PartnerEnrouteData
}

export interface PartnerEnrouteData {
  bookingId: string;
  partnerId: string;
  partnerStatus: 'enroute';
  timestamp: string;
}


export interface PartnerLocationUpdatedEvent {
  eventType: 'PARTNER_LOCATION_UPDATED';
  data: PartnerLocationUpdatedData;
}

export interface PartnerLocationUpdatedData {
  partnerId: string;
  location: {
    latitude: number;
    longitude: number;
  };
  timestamp: string;
}

export interface PartnerBookingLocationUpdatedEvent {
  eventType: 'PARTNER_BOOKING_LOCATION_UPDATED';
  data: PartnerBookingLocationUpdatedData;
}

export interface PartnerBookingLocationUpdatedData {
  bookingId: string;
  partnerId: string;
  location: {
    latitude: number;
    longitude: number;
  };
  timestamp: string;
}

export interface PartnerArrivedEvent {
  eventType: 'PARTNER_ARRIVED';
  data: PartnerArrivedData
}

export interface PartnerArrivedData {
  partnerId: string;
  partner_userId: string;
  bookingId: string;
}

export interface PartnerUpdateAvailabilityEvent {
  eventType: 'PARTNER_UPDATE_AVAILABILITY';
  data: PartnerUpdateAvailabilityData;
}

export interface PartnerUpdateAvailabilityData {
  partnerId: string;
  isOnline: boolean;
}