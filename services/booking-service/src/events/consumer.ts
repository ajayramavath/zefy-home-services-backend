import { EventConsumer, PartnerBookingRequestedEvent, PartnerEnrouteEvent, PartnerBookingLocationUpdatedEvent, UserPartnerArrivedEvent } from "@zf/common"
import { BookingsEventPublisher } from "./publisher";
import { FastifyInstance } from "fastify";
import { Booking } from "../models/booking.model";
import { Feedback } from "../models/feedback.model";

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

    const feedbacks = await Feedback.find({
      partnerId: partner.id
    });

    const bookings = await Booking.countDocuments({
      'partner.id': partner.id
    })

    booking.partner = {
      id: partner.id,
      name: partner.name,
      photoUrl: partner.photoUrl,
      phoneNumber: partner.phoneNumber,
      bookingsCount: bookings,
      feedbacks
    };
    booking.partnerStatus = 'assigned';
    booking.bookingStatus = 'tracking';

    await booking.save();
    this.fastify.log.info(`Booking assigned: ${bookingId}`);

    await this.bookingEventPublisher.publishPartnerAssigned(booking, partner.userId);
  }

  async consumePartnerStatusUpdated(event: PartnerEnrouteEvent): Promise<void> {
    try {
      this.fastify.log.info(`Processing partner status update: ${event.data.partnerId}`);

      const { bookingId, partnerStatus, partnerId } = event.data;

      this.fastify.log.info(`Partner booking status ${bookingId} updated to ${partnerStatus}`);

      if (!bookingId) {
        this.fastify.log.warn(`No booking ID provided for partner status update`);
        return;
      }

      const booking = await Booking.findById(bookingId);
      if (!booking) {
        this.fastify.log.error(`Booking not found: ${bookingId}`);
        return;
      }

      if (booking.partner?.id?.toString().trim() !== partnerId?.toString().trim()) {
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
      this.fastify.log.error(`Error processing partner status update: ${error.message} `, error);
      throw error;
    }
  }

  async consumePartnerLocationUpdated(event: PartnerBookingLocationUpdatedEvent): Promise<void> {
    try {
      this.fastify.log.info(`Processing partner location update: ${event.data.partnerId} for booking ${event.data.bookingId}`);

      const { partnerId, bookingId, location, timestamp } = event.data;

      const booking = await Booking.findById(bookingId);
      if (!booking) {
        this.fastify.log.error(`Booking not found: ${bookingId} `);
        return;
      }

      if (booking.partner?.id?.toString().trim() !== partnerId?.toString().trim()) {
        this.fastify.log.error(`Partner ${partnerId} not assigned to booking ${bookingId} `);
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

      this.bookingEventPublisher.publishBookingPartnerLocationUpdated(booking, partnerId, location);

      this.fastify.log.info(`Partner ${partnerId} location updated for booking ${bookingId}`);

    } catch (error) {
      this.fastify.log.error(`Error processing partner location update: ${error.message} `, error);
      throw error;
    }
  }

  async consumeUserPartnerArrived(event: UserPartnerArrivedEvent): Promise<void> {
    try {
      this.fastify.log.info(`Processing user partner arrived update: ${event.data.partnerId} for booking ${event.data.bookingId}`);
      const { bookingId } = event.data;
      const booking = await Booking.findById(bookingId);
      if (!booking) {
        this.fastify.log.error(`Booking not found: ${bookingId} `);
        return;
      }
      booking.partnerStatus = 'arrived';
      booking.updatedAt = new Date();
      await booking.save();
      this.fastify.log.info(`Booking ${bookingId} status updated to arrived`);
    } catch (error) {
      this.fastify.log.error(`Error processing partner arrived update: ${error.message} `, error);
      throw error;
    }
  }

  async setUpEventListeners(): Promise<void> {
    try {
      this.on<PartnerBookingRequestedEvent>('PARTNER_BOOKING_REQUESTED', this.consumePartnerBookingRequested.bind(this));
      this.on<PartnerEnrouteEvent>('PARTNER_ENROUTE_EVENT', this.consumePartnerStatusUpdated.bind(this));
      this.on<PartnerBookingLocationUpdatedEvent>('PARTNER_BOOKING_LOCATION_UPDATED', this.consumePartnerLocationUpdated.bind(this));
      this.on<UserPartnerArrivedEvent>('USER_PARTNER_ARRIVED', this.consumeUserPartnerArrived.bind(this));

      await this.startConsuming('booking.events', [
        'partner.booking.accept_requested',
        'partner.*',
        // 'partner.status.updated',
        // 'payment.*',
        'user.*',
        'user.partner.arrived',
        'partner.booking.location.updated',
        'partner.enroute'
      ]);
    } catch (error) {

    }
  }

}