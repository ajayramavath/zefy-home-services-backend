export interface HubAssignedEvent {
  eventType: 'HUB_ASSIGNED';
  data: {
    userId: string;
    hubId: string;
    location: {
      lat: number;
      lng: number;
    };
    timestamp: string;
    serviceArea: string;
  };
}