export interface UserCreatedEvent {
  eventType: 'USER_CREATED';
  data: {
    userId: string;
    phoneNumber: string;
    timestamp: string;
  };
}

