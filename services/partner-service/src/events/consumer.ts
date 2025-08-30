import { EventConsumer, BookingPartnerAssignedEvent, PartnerEnrouteEvent, PartnerLocationUpdatedEvent, UserPartnerArrivedEvent, PartnerUpdateAvailabilityEvent } from "@zf/common";
import { PartnerService } from "../service/partner.service";
import { PartnerEventPublisher } from "./publisher";
import { FastifyInstance } from "fastify";
import { Partner } from "../models/partner.model";
import { Availability } from "../models/availability.model";

export class PartnerEventConsumer extends EventConsumer {
  private partnerService: PartnerService;
  private partnerEventPublisher: PartnerEventPublisher;

  constructor(
    fastify: FastifyInstance,
    partnerService: PartnerService,
    partnerEventPublisher: PartnerEventPublisher,
  ) {
    super(fastify);
    this.partnerService = partnerService;
    this.partnerEventPublisher = partnerEventPublisher;
  }

  async consumePartnerEnroute(event: PartnerEnrouteEvent): Promise<void> {
    const { partnerId } = event.data;
    const availability = await Availability.findOne({ partnerId: partnerId });
    if (!availability) {
      this.fastify.log.error(`Availability not found: ${partnerId}`);
      return;
    }
    availability.status = 'ENROUTE';
    await availability.save();
    this.fastify.log.info(`Partner ${partnerId} status updated to enroute`);
  }

  async consumePartnerLocationUpdated(event: PartnerLocationUpdatedEvent): Promise<void> {
    const { partnerId, location } = event.data;
    const availability = await Availability.findOne({ partnerId: partnerId });
    if (!availability) {
      this.fastify.log.error(`Availability not found: ${partnerId}`);
    }
    availability.location = {
      coordinates: [location.latitude, location.longitude],
      updatedAt: new Date()
    }
    this.fastify.log.info(`--------------------------------- ${availability.currentBookingId}`);
    if (availability.currentBookingId) {
      await this.partnerEventPublisher.publishPartnerBookingLocationUpdated(partnerId, location, availability.currentBookingId);
    }
    await availability.save();
  }

  async consumeBookingAssignmentSuccess(event: BookingPartnerAssignedEvent): Promise<void> {
    const {
      bookingId,
      partnerId,
      userLocation,
      scheduledDateTime,
      serviceIds
    } = event.data;

    const bookingAssignment = {
      bookingId,
      userLocation,
      scheduledDateTime,
      serviceIds,
      status: 'assigned',
      assignedAt: new Date().toISOString()
    };

    await this.partnerService.assignBooking(partnerId, bookingAssignment);
    this.fastify.log.info(`Booking ${bookingAssignment.bookingId} assigned to partner ${partnerId}`);
  }

  async consumeUserPartnerArrived(event: UserPartnerArrivedEvent): Promise<void> {
    try {
      this.fastify.log.info(`Processing user partner arrived update: ${event.data.partnerId} for booking ${event.data.bookingId}`);
      const partner = await Partner.findOne({ _id: event.data.partnerId });
      const availability = await Availability.findOne({ partnerId: event.data.partnerId });
      if (!availability) {
        this.fastify.log.error(`Availability not found: ${event.data.partnerId}`);
      }
      availability.status = 'ARRIVED';
      await availability.save();
      this.fastify.log.info(`Partner ${event.data.partnerId} status updated to arrived`);
      await this.partnerEventPublisher.publishPartnerArrived(event.data.partnerId, event.data.bookingId, partner.userId);
    } catch (error) {
      this.fastify.log.error(`Error processing user partner arrived update: ${error.message}`, error);
      throw error;
    }
  }

  async consumePartnerUpdateAvailability(event: PartnerUpdateAvailabilityEvent): Promise<void> {
    try {
      this.fastify.log.info(`Processing partner availability update: ${event.data.partnerId}`);
      const availability = await Availability.findOne({ partnerId: event.data.partnerId });
      if (!availability) {
        this.fastify.log.error(`Availability not found: ${event.data.partnerId}`);
        return;
      }
      availability.isOnline = event.data.isOnline;
      if (event.data.isOnline) {
        availability.status = 'IDLE';
      } else {
        availability.status = 'OFFLINE';
      }
      await availability.save();
    } catch (error) {
      this.fastify.log.error(`Error updating partner availability`, error);
      throw error;
    }
  }

  async setupEventListeners(): Promise<void> {
    try {
      this.on<BookingPartnerAssignedEvent>('BOOKING_PARTNER_ASSIGNED', this.consumeBookingAssignmentSuccess.bind(this));
      this.on<UserPartnerArrivedEvent>('USER_PARTNER_ARRIVED', this.consumeUserPartnerArrived.bind(this));
      this.on<PartnerUpdateAvailabilityEvent>('PARTNER_UPDATE_AVAILABILITY', this.consumePartnerUpdateAvailability.bind(this));
      this.on<PartnerLocationUpdatedEvent>('PARTNER_LOCATION_UPDATED', this.consumePartnerLocationUpdated.bind(this));


      await this.startConsuming('partner.events', [
        'booking.created',
        'booking.assignment.success',
        'booking.assignment.failed',
        'booking.partner.assigned',
        'payment.completed',
        'booking.*',
        'booking.ready_for_assignment',
        'user.*',
        'user.partner.arrived',
        'partner.availability.updated',
        'partner.location.updated'
      ]);

      this.fastify.log.info('Booking event consumers initialized successfully');
    } catch (error) {
      this.fastify.log.error('Failed to setup booking event listeners:', error);
      throw error;
    }
  }
}