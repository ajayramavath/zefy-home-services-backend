import { BookingCreatedEvent, BookingReadyForAssignmentEvent, EventConsumer, PartnerAssignedEvent } from "@zf/common";
import { PartnerService } from "../service/partner.service";
import { PartnerEventPublisher } from "./publisher";
import { FastifyInstance } from "fastify";
import { WebSocketManager } from "../ws/websocketManager";

export class PartnerEventConsumer extends EventConsumer {
  private partnerService: PartnerService;
  private partnerEventPublisher: PartnerEventPublisher;
  private webSocketManager: WebSocketManager;

  constructor(
    fastify: FastifyInstance,
    partnerService: PartnerService,
    partnerEventPublisher: PartnerEventPublisher,
    webSocketManager: WebSocketManager
  ) {
    super(fastify);
    this.partnerService = partnerService;
    this.partnerEventPublisher = partnerEventPublisher;
    this.webSocketManager = webSocketManager;
  }

  async consumeBookingCreated(event: BookingCreatedEvent): Promise<void> {
    const eligiblePartners = [
      {
        partnerId: '6899cd47a7086849c63de7cd',
      }
    ]
    this.fastify.log.info(event.data);
    if (eligiblePartners.length > 0) {
      const notificationsSent = await this.webSocketManager.broadcastNewBooking({
        booking: event.data,
        eligiblePartners: eligiblePartners.map((p: any) => p.partnerId)
      });
      this.fastify.log.info(`Booking ${event.data.bookingId} sent to ${notificationsSent} partners`);
    }
  }

  async consumeBookingReadyForAssignment(event: BookingReadyForAssignmentEvent): Promise<void> {
    const eligiblePartners = [
      {
        partnerId: '6899cd47a7086849c63de7cd',
      }
    ]
    this.fastify.log.info(event.data);
    if (eligiblePartners.length > 0) {
      const notificationsSent = await this.webSocketManager.broadcastNewBooking({
        booking: event.data,
        eligiblePartners: eligiblePartners.map((p: any) => p.partnerId)
      });
      this.fastify.log.info(`Booking ${event.data.bookingId} sent to ${notificationsSent} partners`);
    }
  }

  async consumeBookingAssignmentSuccess(event: PartnerAssignedEvent): Promise<void> {
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

    this.webSocketManager.sendToPartner(partnerId, {
      type: 'booking_assigned',
      payload: {
        bookingId,
        userLocation,
        scheduledDateTime,
        serviceIds,
        status: 'assigned',
        assignedAt: new Date().toISOString()
      }
    });
    this.fastify.log.info(`Booking ${bookingAssignment.bookingId} assigned to partner ${partnerId}`);
  }

  async setupEventListeners(): Promise<void> {
    try {
      this.on<BookingCreatedEvent>('BOOKING_CREATED', this.consumeBookingCreated.bind(this));
      this.on<BookingReadyForAssignmentEvent>('BOOKING_READY_FOR_ASSIGNMENT', this.consumeBookingReadyForAssignment.bind(this));
      this.on<PartnerAssignedEvent>('PARTNER_ASSIGNED', this.consumeBookingAssignmentSuccess.bind(this));


      await this.startConsuming('partner.events', [
        'booking.created',
        'booking.assignment.success',
        'booking.assignment.failed',
        'payment.completed',
        'booking.*',
        'booking.ready_for_assignment'
      ]);

      this.fastify.log.info('Booking event consumers initialized successfully');
    } catch (error) {
      this.fastify.log.error('Failed to setup booking event listeners:', error);
      throw error;
    }
  }
}