import { EventConsumer, PartnerBookingRequestedEvent, PartnerLocationUpdatedEvent, PartnerStatusUpdatedEvent } from "@zf/common"
import { BookingsEventPublisher } from "./publisher";
import { FastifyInstance } from "fastify";
import { Booking } from "../models/booking.model";

export class BookingEventConsumer extends EventConsumer {
  private bookingEventPublisher: BookingsEventPublisher;

  constructor(fastify: FastifyInstance, bookingEventPublisher: BookingsEventPublisher) {
    super(fastify);
    this.bookingEventPublisher = bookingEventPublisher;
  }

  async consumePartnerBookingRequested(event: PartnerBookingRequestedEvent): Promise<void> {
    this.fastify.log.info(`Processing partner booking request: ${event.data.bookingId}`);

    const { partner, bookingId } = event.data;

    const booking = await Booking.findById(bookingId);
    if (!booking) {
      this.fastify.log.error(`Booking not found: ${bookingId}`);
      return;
    }
    if (booking.partnerStatus !== 'not_assigned') {
      this.fastify.log.info(`Booking already assigned: ${bookingId}`);
      return;
    }

    booking.partner = partner;
    booking.partnerStatus = 'assigned';
    booking.bookingStatus = 'tracking';

    await booking.save();
    this.fastify.log.info(`Booking assigned: ${bookingId}`);

    await this.bookingEventPublisher.publishPartnerAssigned(booking);
  }

  async consumePartnerStatusUpdated(event: PartnerStatusUpdatedEvent): Promise<void> {
    try {
      this.fastify.log.info(`Processing partner status update: ${event.data.partnerId}`);

      const { partnerId, bookingId, partnerStatus } = event.data;

      this.fastify.log.info(`Partner ${partnerId} booking status ${bookingId} updated to ${partnerStatus}`);

      if (!bookingId) {
        this.fastify.log.warn(`No booking ID provided for partner status update: ${partnerId}`);
        return;
      }

      const booking = await Booking.findById(bookingId);
      if (!booking) {
        this.fastify.log.error(`Booking not found: ${bookingId}`);
        return;
      }
      this.fastify.log.error('Partner ID from request:', JSON.stringify(partnerId));
      this.fastify.log.error('Partner ID from booking:', JSON.stringify(booking.partner?.id));
      this.fastify.log.error('Are they equal?', booking.partner?.id === partnerId);
      this.fastify.log.error('Types:', typeof booking.partner?.id, typeof partnerId);

      if (booking.partner?.id?.toString().trim() !== partnerId?.toString().trim()) {
        this.fastify.log.error(`Partner ${partnerId} not equal to  ${booking.partner?.id}`);
        this.fastify.log.error(`Partner ${partnerId} not assigned to booking ${bookingId}`);
        return;
      }

      const previousStatus = booking.partnerStatus;
      booking.partnerStatus = partnerStatus;
      booking.updatedAt = new Date();
      await booking.save();

      this.fastify.log.info(`Partner ${partnerId} status updated to ${booking.partnerStatus} for booking ${bookingId}`);

      await this.bookingEventPublisher.publishBookingStatusUpdated(booking, previousStatus);

      this.fastify.log.info(`Partner ${partnerId} status updated to ${partnerStatus} for booking ${bookingId}`);

    } catch (error) {
      this.fastify.log.error(`Error processing partner status update: ${error.message}`, error);
      throw error;
    }
  }

  async consumePartnerLocationUpdated(event: PartnerLocationUpdatedEvent): Promise<void> {
    try {
      this.fastify.log.info(`Processing partner location update: ${event.data.partnerId} for booking ${event.data.bookingId}`);

      const { partnerId, bookingId, location, timestamp } = event.data;

      // Find the booking
      const booking = await Booking.findById(bookingId);
      if (!booking) {
        this.fastify.log.error(`Booking not found: ${bookingId}`);
        return;
      }

      this.fastify.log.error('Partner ID from request:', JSON.stringify(partnerId));
      this.fastify.log.error('Partner ID from booking:', JSON.stringify(booking.partner?.id));
      this.fastify.log.error('Are they equal?', booking.partner?.id === partnerId);
      this.fastify.log.error('Types:', typeof booking.partner?.id, typeof partnerId);

      if (booking.partner?.id?.toString().trim() !== partnerId?.toString().trim()) {
        this.fastify.log.error(`Partner ${partnerId} not assigned to booking ${bookingId}`);
        return;
      }

      if (booking.partner) {
        booking.partner.location = {
          lat: location.latitude,
          lng: location.longitude,
          lastUpdated: new Date(timestamp)
        };
      }

      booking.updatedAt = new Date();
      await booking.save();

      this.fastify.log.info(`Partner ${partnerId} location updated for booking ${bookingId}`);

    } catch (error) {
      this.fastify.log.error(`Error processing partner location update: ${error.message}`, error);
      throw error;
    }
  }

  async setUpEventListeners(): Promise<void> {
    try {
      this.on<PartnerBookingRequestedEvent>('PARTNER_BOOKING_REQUESTED', this.consumePartnerBookingRequested.bind(this));
      this.on<PartnerStatusUpdatedEvent>('PARTNER_STATUS_UPDATED', this.consumePartnerStatusUpdated.bind(this));
      this.on<PartnerLocationUpdatedEvent>('PARTNER_LOCATION_UPDATED', this.consumePartnerLocationUpdated.bind(this));

      await this.startConsuming('booking.events', [
        'partner.booking.accept_requested',
        'partner.*',
        'partner.location.updated',
        'partner.status.updated',
        'payment.*',
      ]);
    } catch (error) {

    }
  }

}