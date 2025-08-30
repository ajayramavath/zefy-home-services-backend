export * from './eventTypes/hubEvents';
export * from './eventTypes/userEvents';
export * from './eventTypes/partnerEvents';
export * from './eventTypes/bookingEvents';
export * from './eventTypes/webSocketEvents';

import { HubAssignedEvent } from './eventTypes/hubEvents';

import {
  PartnerRegisteredEvent,
  PartnerOnlineEvent,
  PartnerOfflineEvent,
  PartnerBookingRequestedEvent,
  PartnerBookingDeclinedEvent,
  PartnerEnrouteEvent,
  PartnerLocationUpdatedEvent,
  PartnerBookingLocationUpdatedEvent,
  PartnerArrivedEvent,
  PartnerUpdateAvailabilityEvent
} from './eventTypes/partnerEvents';

import {
  BookingCreatedEvent,
  BookingReadyForAssignmentEvent,
  BookingStatusUpdatedEvent,
  BookingPartnerAssignedEvent,
  ServiceStartedEvent,
  ServiceCompletedEvent,
  BookingCancelledEvent,
  ReviewSubmittedEvent,
  PaymentStatusUpdatedEvent,
  BookingScheduledEvent,
  HubManagerNotificationEvent,
  BookingErrorEvent,
  BookingPartnerLocationUpdatedEvent,
} from './eventTypes/bookingEvents';

import { UserCreatedEvent, UserPartnerArrivedEvent } from './eventTypes/userEvents';

export type AppEvent =
  // Hub Events
  | HubAssignedEvent

  // User Events
  | UserCreatedEvent
  | UserPartnerArrivedEvent

  // Partner Service Events
  | PartnerRegisteredEvent
  | PartnerOnlineEvent
  | PartnerOfflineEvent
  | PartnerBookingRequestedEvent
  | PartnerBookingDeclinedEvent
  | PartnerEnrouteEvent
  | PartnerLocationUpdatedEvent
  | PartnerBookingLocationUpdatedEvent
  | PartnerArrivedEvent
  | PartnerUpdateAvailabilityEvent

  // Booking Events
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

export const EVENT_TYPES = {
  // Hub Events
  HUB_ASSIGNED: 'HUB_ASSIGNED',

  // User Events
  USER_CREATED: 'USER_CREATED',
  USER_PARTNER_ARRIVED: 'USER_PARTNER_ARRIVED',

  // Partner Service Events
  PARTNER_REGISTERED: 'PARTNER_REGISTERED',
  PARTNER_ONLINE: 'PARTNER_ONLINE',
  PARTNER_OFFLINE: 'PARTNER_OFFLINE',
  PARTNER_BOOKING_REQUESTED: 'PARTNER_BOOKING_REQUESTED',
  PARTNER_BOOKING_DECLINED: 'PARTNER_BOOKING_DECLINED',
  PARTNER_ENROUTE: 'PARTNER_ENROUTE',
  PARTNER_SERVICE_STATUS_UPDATED: 'PARTNER_STATUS_UPDATED', // From partner service
  PARTNER_LOCATION_UPDATED: 'PARTNER_LOCATION_UPDATED',
  PARTNER_BOOKING_LOCATION_UPDATED: 'PARTNER_BOOKING_LOCATION_UPDATED',
  PARTNER_ARRIVED: 'PARTNER_ARRIVED',

  // Booking Events
  BOOKING_CREATED: 'BOOKING_CREATED',
  BOOKING_READY_FOR_ASSIGNMENT: 'BOOKING_READY_FOR_ASSIGNMENT',
  BOOKING_STATUS_UPDATED: 'BOOKING_STATUS_UPDATED',
  PARTNER_ASSIGNED: 'PARTNER_ASSIGNED',
  SERVICE_STARTED: 'SERVICE_STARTED',
  SERVICE_COMPLETED: 'SERVICE_COMPLETED',
  BOOKING_PARTNER_LOCATION_UPDATED: 'BOOKING_PARTNER_LOCATION_UPDATED', // From booking service
  BOOKING_CANCELLED: 'BOOKING_CANCELLED',
  REVIEW_SUBMITTED: 'REVIEW_SUBMITTED',
  BOOKING_PARTNER_STATUS_UPDATED: 'PARTNER_STATUS_UPDATED', // From booking service
  PAYMENT_STATUS_UPDATED: 'PAYMENT_STATUS_UPDATED',
  BOOKING_SCHEDULED: 'BOOKING_SCHEDULED',
  HUB_MANAGER_NOTIFICATION: 'HUB_MANAGER_NOTIFICATION',
  BOOKING_ERROR: 'BOOKING_ERROR',

  // Legacy Events (deprecated)
  BOOKING_ASSIGNMENT_SUCCESS: 'BOOKING_ASSIGNMENT_SUCCESS',
  BOOKING_ASSIGNMENT_FAILED: 'BOOKING_ASSIGNMENT_FAILED'
} as const;

export const QUEUES = {
  HUB_EVENTS: 'hub.events',
  USER_EVENTS: 'user.events',
  PARTNER_EVENTS: 'partner.events',
  BOOKING_EVENTS: 'booking.events',
  NOTIFICATION_EVENTS: 'notification.events',
  PAYMENT_EVENTS: 'payment.events'
} as const;

export const EXCHANGES = {
  ZEFY_EVENTS: 'zefy.events'
} as const;

// Event routing patterns for RabbitMQ
export const EVENT_ROUTING = {
  // Hub Events
  HUB_ASSIGNED: 'hub.assigned',

  // User Events
  USER_CREATED: 'user.created',
  USER_PARTNER_ARRIVED: 'user.partner.arrived',

  // Partner Service Events
  PARTNER_REGISTERED: 'partner.registered',
  PARTNER_ONLINE: 'partner.online',
  PARTNER_OFFLINE: 'partner.offline',
  PARTNER_BOOKING_REQUESTED: 'partner.booking.requested',
  PARTNER_BOOKING_DECLINED: 'partner.booking.declined',
  PARTNER_ENROUTE: 'partner.enroute',
  PARTNER_SERVICE_STATUS_UPDATED: 'partner.service.status.updated',
  PARTNER_LOCATION_UPDATED: 'partner.location.updated',
  PARTNER_BOOKING_LOCATION_UPDATED: 'partner.booking.location.updated',

  // Booking Events
  BOOKING_CREATED: 'booking.created',
  BOOKING_READY_FOR_ASSIGNMENT: 'booking.ready_for_assignment',
  BOOKING_STATUS_UPDATED: 'booking.status.updated',
  BOOKING_PARTNER_ASSIGNED: 'booking.partner.assigned',
  SERVICE_STARTED: 'booking.service.started',
  SERVICE_COMPLETED: 'booking.service.completed',
  BOOKING_PARTNER_LOCATION_UPDATED: 'booking.partner.location.updated',
  BOOKING_CANCELLED: 'booking.cancelled',
  REVIEW_SUBMITTED: 'booking.review.submitted',
  BOOKING_PARTNER_STATUS_UPDATED: 'booking.partner.status.updated',
  PAYMENT_STATUS_UPDATED: 'booking.payment.status.updated',
  BOOKING_SCHEDULED: 'booking.scheduled',
  HUB_MANAGER_NOTIFICATION: 'hub.manager.notification',
  BOOKING_ERROR: 'booking.error',

  // Legacy Events
  BOOKING_ASSIGNMENT_SUCCESS: 'booking.assignment.success',
  BOOKING_ASSIGNMENT_FAILED: 'booking.assignment.failed'
} as const;

export const SERVICE_SUBSCRIPTIONS = {
  USER_SERVICE: [
    EVENT_ROUTING.USER_CREATED,
    EVENT_ROUTING.BOOKING_CREATED,
    EVENT_ROUTING.BOOKING_STATUS_UPDATED,
    EVENT_ROUTING.SERVICE_STARTED,
    EVENT_ROUTING.SERVICE_COMPLETED,
    EVENT_ROUTING.BOOKING_CANCELLED
  ],

  PARTNER_SERVICE: [
    EVENT_ROUTING.PARTNER_REGISTERED,
    EVENT_ROUTING.BOOKING_STATUS_UPDATED,
    EVENT_ROUTING.SERVICE_STARTED,
    EVENT_ROUTING.SERVICE_COMPLETED,
    EVENT_ROUTING.BOOKING_CANCELLED,
    EVENT_ROUTING.REVIEW_SUBMITTED,
    EVENT_ROUTING.BOOKING_PARTNER_ASSIGNED,
  ],

  BOOKING_SERVICE: [
    EVENT_ROUTING.PARTNER_SERVICE_STATUS_UPDATED,
    EVENT_ROUTING.PARTNER_LOCATION_UPDATED,
    EVENT_ROUTING.PAYMENT_STATUS_UPDATED,
    EVENT_ROUTING.BOOKING_PARTNER_LOCATION_UPDATED,
    EVENT_ROUTING.PARTNER_BOOKING_LOCATION_UPDATED,
  ],

  NOTIFICATION_SERVICE: [
    EVENT_ROUTING.BOOKING_CREATED,
    EVENT_ROUTING.BOOKING_READY_FOR_ASSIGNMENT,
    EVENT_ROUTING.BOOKING_PARTNER_ASSIGNED,
    EVENT_ROUTING.SERVICE_STARTED,
    EVENT_ROUTING.SERVICE_COMPLETED,
    EVENT_ROUTING.BOOKING_CANCELLED,
    EVENT_ROUTING.HUB_MANAGER_NOTIFICATION,
    EVENT_ROUTING.BOOKING_ERROR
  ],

  HUB_SERVICE: [
    EVENT_ROUTING.HUB_ASSIGNED,
    EVENT_ROUTING.BOOKING_READY_FOR_ASSIGNMENT,
    EVENT_ROUTING.HUB_MANAGER_NOTIFICATION,
    EVENT_ROUTING.BOOKING_PARTNER_ASSIGNED
  ]
} as const;
export const EVENT_PRIORITIES = {
  CRITICAL: ['SERVICE_STARTED', 'SERVICE_COMPLETED', 'BOOKING_ERROR'],
  HIGH: ['BOOKING_CREATED', 'PARTNER_ASSIGNED', 'BOOKING_CANCELLED'],
  MEDIUM: ['BOOKING_STATUS_UPDATED', 'PARTNER_STATUS_UPDATED'],
  LOW: ['REVIEW_SUBMITTED', 'BOOKING_PARTNER_LOCATION_UPDATED']
} as const;