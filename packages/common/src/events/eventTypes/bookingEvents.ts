export interface BookingCreatedEvent {
  eventType: 'BOOKING_CREATED';
  data: {
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
  };
}

export interface BookingReadyForAssignmentEvent {
  eventType: 'BOOKING_READY_FOR_ASSIGNMENT';
  data: {
    supervisorIds: string[];
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
  };
}

export interface BookingStatusUpdatedEvent {
  eventType: 'BOOKING_STATUS_UPDATED';
  data: {
    bookingId: string;
    userId: string;
    partnerId?: string;
    previousStatus: string;
    newStatus: 'created' | 'readyForAssignment' | 'tracking' | 'ongoing' | 'completed' | 'cancelled';
    partnerStatus: 'not_assigned' | 'assigned' | 'enroute' | 'arrived';
    paymentStatus: 'pending' | 'baseAmountPaid' | 'fullAmountPaid' | 'refunded';
    timestamp: string;
  };
}

export interface BookingPartnerLocationUpdatedEvent {
  eventType: 'BOOKING_PARTNER_LOCATION_UPDATED';
  data: {
    bookingId: string;
    userId: string;
    partnerId?: string;
    location: {
      latitude: number;
      longitude: number;
    }
  }
}

export interface BookingPartnerAssignedEvent {
  eventType: 'BOOKING_PARTNER_ASSIGNED';
  data: {
    bookingId: string;
    userId: string;
    partnerId: string;
    partnerUserId: string;
    partnerDetails: {
      id: string;
      name: string;
      phoneNumber: string;
      photoUrl: string;
      ratings: number;
      reviewCount: number;
    };
    userLocation: {
      latitude: number;
      longitude: number;
      address: string;
    };
    scheduledDateTime: string;
    serviceIds: string[];
    timestamp: string;
  };
}

export interface ServiceStartedEvent {
  eventType: 'SERVICE_STARTED';
  data: {
    bookingId: string;
    userId: string;
    partnerId: string;
    startTime: string;
    location?: {
      latitude: number;
      longitude: number;
    };
    serviceIds: string[];
    timestamp: string;
  };
}

export interface ServiceCompletedEvent {
  eventType: 'SERVICE_COMPLETED';
  data: {
    bookingId: string;
    userId: string;
    partnerId: string;
    startTime: string;
    endTime: string;
    duration: number; // in minutes
    finalAmount: {
      baseAmount: number;
      extraAmount: number;
      totalAmount: number;
    };
    serviceIds: string[];
    timestamp: string;
  };
}


export interface BookingCancelledEvent {
  eventType: 'BOOKING_CANCELLED';
  data: {
    bookingId: string;
    userId: string;
    partnerId?: string;
    reason: string;
    cancelledAt: string;
    refundAmount: number;
    timestamp: string;
  };
}

export interface ReviewSubmittedEvent {
  eventType: 'REVIEW_SUBMITTED';
  data: {
    bookingId: string;
    userId: string;
    partnerId: string;
    review: {
      rating: number;
      comment: string;
      createdAt: string;
    };
    serviceIds: string[];
    timestamp: string;
  };
}

// Legacy events - keeping for backward compatibility but marking as deprecated
/**
 * @deprecated Use PartnerAssignedEvent instead
 */
export interface BookingAssignmentSuccessEvent {
  eventType: 'BOOKING_ASSIGNMENT_SUCCESS';
  data: {
    bookingId: string;
    partnerId: string;
    userId: string;
    userDetails: {
      name: string;
      phone: string;
      address: string;
    };
    partnerDetails: {
      name: string;
      phone: string;
      rating: {
        average: number;
        count: number;
      };
    };
    assignedAt: string;
  };
}

/**
 * @deprecated Use specific error handling in PartnerAssignedEvent or separate error events
 */
export interface BookingAssignmentFailedEvent {
  eventType: 'BOOKING_ASSIGNMENT_FAILED';
  data: {
    bookingId: string;
    partnerId: string;
    userId: string;
    reason: string;
    failedAt: string;
  };
}

// Additional events for better system integration

export interface PaymentStatusUpdatedEvent {
  eventType: 'PAYMENT_STATUS_UPDATED';
  data: {
    bookingId: string;
    userId: string;
    previousStatus: string;
    newStatus: 'pending' | 'baseAmountPaid' | 'fullAmountPaid' | 'refunded';
    amount: number;
    paymentMethod?: string;
    timestamp: string;
  };
}

export interface BookingScheduledEvent {
  eventType: 'BOOKING_SCHEDULED';
  data: {
    bookingId: string;
    userId: string;
    scheduledDateTime: string;
    serviceIds: string[];
    reminderTime: string; // When to send reminder
    timestamp: string;
  };
}

// Hub Manager specific events
export interface HubManagerNotificationEvent {
  eventType: 'HUB_MANAGER_NOTIFICATION';
  data: {
    hubId: string;
    notificationType: 'booking_ready_for_assignment' | 'partner_not_available' | 'booking_overdue';
    bookingId: string;
    priority: 'high' | 'medium' | 'low';
    message: string;
    timestamp: string;
  };
}

// Error and retry events
export interface BookingErrorEvent {
  eventType: 'BOOKING_ERROR';
  data: {
    bookingId: string;
    errorType: 'assignment_timeout' | 'partner_unavailable' | 'payment_failed' | 'service_incomplete';
    errorMessage: string;
    retryCount: number;
    nextRetryAt?: string;
    timestamp: string;
  };
}

// Union type for all booking events
export type BookingEvent =
  | BookingCreatedEvent
  | BookingReadyForAssignmentEvent
  | BookingStatusUpdatedEvent
  | BookingPartnerAssignedEvent
  | ServiceStartedEvent
  | ServiceCompletedEvent
  | BookingCancelledEvent
  | ReviewSubmittedEvent
  | PaymentStatusUpdatedEvent
  | BookingScheduledEvent
  | HubManagerNotificationEvent
  | BookingErrorEvent
  | BookingPartnerLocationUpdatedEvent


export const BookingEventRouting = {
  BOOKING_CREATED: 'booking.created',
  BOOKING_READY_FOR_ASSIGNMENT: 'booking.ready_for_assignment',
  BOOKING_STATUS_UPDATED: 'booking.status.updated',
  BOOKING_PARTNER_ASSIGNED: 'booking.partner.assigned',
  SERVICE_STARTED: 'service.started',
  SERVICE_COMPLETED: 'service.completed',
  PARTNER_LOCATION_UPDATED: 'partner.location.updated',
  BOOKING_CANCELLED: 'booking.cancelled',
  REVIEW_SUBMITTED: 'review.submitted',
  PARTNER_STATUS_UPDATED: 'partner.status.updated',
  PAYMENT_STATUS_UPDATED: 'payment.status.updated',
  BOOKING_SCHEDULED: 'booking.scheduled',
  HUB_MANAGER_NOTIFICATION: 'hub.manager.notification',
  BOOKING_ERROR: 'booking.error',
  BOOKING_PARTNER_LOCATION_UPDATED: 'booking.partner.location.updated'
} as const;