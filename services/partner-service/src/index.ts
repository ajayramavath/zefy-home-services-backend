import Fastify, { FastifyInstance } from 'fastify';
import cors from '@fastify/cors';
import "dotenv/config";
import { mongoosePlugin, redisPlugin, rabbitmqPlugin, sessionPlugin, EventConsumer, QUEUES } from '@zf/common';
import partnerPlugin from './plugins/partnerPlugin';

import { partnerRoutes } from './routes/partner.route';
import { WebSocketManager } from './ws/websocketManager';
import { PartnerEventPublisher } from './events/publisher';
import { BookingAssignmentFailedEvent, BookingAssignmentSuccessEvent, BookingCreatedEvent, BookingReadyForAssignmentEvent, PartnerAssignedEvent } from '@zf/common/dist/events/eventTypes/bookingEvents';
import { PartnerEventConsumer } from './events/consumer';
import { PartnerService } from './service/partner.service';
import { S3Client } from '@aws-sdk/client-s3';

const fastify = Fastify({
  logger: {
    level: 'info',
  }
});

let websocketManager: WebSocketManager;
let eventConsumer: EventConsumer;
let eventPublisher: PartnerEventPublisher;

export const s3 = new S3Client({
  region: process.env.AWS_REGION!,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!
  }
});

async function start() {
  try {
    await fastify.register(cors, {
      origin: true
    });
    await fastify.register(mongoosePlugin, { uri: process.env.MONGO_URI! });

    fastify.register(redisPlugin, { url: process.env.REDIS_URL! });
    fastify.register(rabbitmqPlugin, { url: process.env.AMQP_URL! });
    fastify.register(sessionPlugin, {
      ttlSeconds: 180 * 24 * 3600,
      allowMultipleSessions: false,
    });

    fastify.get('/partners/health', async () => {
      return {
        status: 'OK',
        service: 'partner-service'
      };
    });

    eventConsumer = new EventConsumer(fastify);
    eventPublisher = new PartnerEventPublisher(fastify);

    fastify.get('/partners/ws-simple', (connection, request) => {
      // connection.send(JSON.stringify({
      //   type: 'connected',
      //   message: 'Simple connection works'
      // }));
    });

    websocketManager = new WebSocketManager(fastify);

    // fastify.get('/partners/ws', { websocket: true }, (connection, request) => {
    //   fastify.log.info('🔌 Actual WebSocket connection received');
    //   if (websocketManager) {
    //     websocketManager.handleConnection(connection, request);
    //   } else {
    //     fastify.log.error('❌ WebSocketManager not available');
    //     // connection.close(1011, 'WebSocket manager not available');
    //   }
    // });

    await websocketManager.setupWebSocketServer();

    fastify.decorate('websocketManager', websocketManager);
    fastify.decorate('eventPublisher', eventPublisher);

    fastify.register(partnerPlugin);

    const partnerService = new PartnerService(fastify);
    const partnerEventPublisher = new PartnerEventPublisher(fastify);

    const partnerEventConsumer = new PartnerEventConsumer(fastify, partnerService, partnerEventPublisher, websocketManager);
    await partnerEventConsumer.setupEventListeners();

    await fastify.register(partnerRoutes, { prefix: '/partners' });

    const port = Number(process.env.PORT) || 3003;

    await fastify.listen({ port });

    fastify.log.info(`🚀 Partner Service running on http://0.0.0.0:${port}`);
    fastify.log.info(`📚 API Documentation: http://localhost:${port}/docs`);

  } catch (error) {
    fastify.log.error(error);
    process.exit(1);
  }
}

process.on('SIGINT', async () => {
  fastify.log.info('Received SIGINT, shutting down gracefully...');
  await fastify.close();
  process.exit(0);
});

start();

async function setupEventHandlers() {

  eventConsumer.on<BookingCreatedEvent>('BOOKING_CREATED', async (event, fastify) => {
    try {
      fastify.log.info('New booking event received:', event.data.bookingId);

      //const eligiblePartners = await findEligiblePartners(event.data, fastify);

      const eligiblePartners = [
        {
          partnerId: '6899cd47a7086849c63de7cd',
        }
      ]

      if (eligiblePartners.length > 0) {
        const notificationsSent = await websocketManager.broadcastNewBooking({
          booking: event.data,
          eligiblePartners: eligiblePartners.map((p: any) => p.partnerId)
        });

        fastify.log.info(`Booking ${event.data.bookingId} sent to ${notificationsSent} partners`);
      } else {
        fastify.log.info(`No eligible partners found for booking ${event.data.bookingId}`);

        // Publish event for admin notification
        await eventPublisher.publish({
          eventType: 'BOOKING_NO_PARTNERS_AVAILABLE',
          data: {
            bookingId: event.data.bookingId,
            location: event.data.addressDetails,
            services: event.data.serviceDetails,
            timestamp: new Date().toISOString()
          }
        } as any, 'booking.no_partners_available');
      }
    } catch (error) {
      fastify.log.error('Error handling new booking event:', error);
    }
  });

  eventConsumer.on<PartnerAssignedEvent>('PARTNER_ASSIGNED', async (event, fastify) => {
    try {
      const { bookingId, partnerId, userId, userLocation } = event.data;

      websocketManager.sendToPartner(userId, {
        type: 'booking_assigned',
        bookingId,
        message: 'Booking assigned successfully',
        userLocation,
        timestamp: new Date().toISOString(),
      });

      fastify.log.info(`Booking ${bookingId} successfully assigned to partner ${partnerId}`);
    } catch (error) {
      fastify.log.error('Error handling booking assignment success:', error);
    }
  });

  await eventConsumer.startConsuming('partner.events', [
    'booking.created',
    'booking.assignment.success',
    'booking.assignment.failed',
    'payment.completed',
    'booking.*'
  ]);

  fastify.log.info('Event handlers setup completed');
}