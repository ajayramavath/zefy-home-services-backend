export interface UserCreatedEvent {
  eventType: 'USER_CREATED';
  data: {
    userId: string;
    phoneNumber: string;
    timestamp: string;
  };
}

export interface UserPartnerArrivedEvent {
  eventType: 'USER_PARTNER_ARRIVED';
  data: UserPartnerArrivedData
}

export interface UserPartnerArrivedData {
  userId: string;
  partnerId: string;
  bookingId: string;
  timestamp: string;
}

