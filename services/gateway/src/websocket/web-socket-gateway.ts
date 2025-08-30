import { FastifyInstance } from 'fastify';
import WebSocket from 'ws';
import { EventConsumer, EventPublisher, AdminJobRequestBroadcastData, BookingReadyForAssignmentEvent, PartnerBookingAcceptedData, PartnerBookingRequestedEvent, BookingPartnerAssignedEvent, PartnerEnrouteEvent, PartnerEnrouteData, BookingStatusUpdatedEvent, BookingPartnerLocationUpdatedEvent, PartnerLocationUpdatedData, PartnerLocationUpdatedEvent, UserPartnerArrivedData, UserPartnerArrivedEvent, PartnerArrivedEvent, ServiceStartedEvent, ServiceCompletedEvent, PartnerUpdateAvailabilityData, PartnerUpdateAvailabilityEvent } from '@zf/common';

interface ClientConnection {
  ws: WebSocket;
  userId: string;
  clientType: 'user' | 'partner' | 'admin';
  metadata?: Record<string, any>;
}

interface WSMessage {
  type: string;
  data: any;
  timestamp?: string;
}

export class WebSocketGateway {
  private wss: WebSocket.Server;
  private connections: Map<string, ClientConnection> = new Map();
  private userConnections: Map<string, Set<string>> = new Map(); // userId -> connectionIds
  private consumer: EventConsumer;
  private publisher: EventPublisher;

  constructor(private fastify: FastifyInstance) {
    this.consumer = new EventConsumer(fastify);
    this.publisher = new EventPublisher(fastify);
  }

  async initialize(port: number = 8080) {

    this.wss = new WebSocket.Server({
      port,
      verifyClient: async (info, cb) => {
        const token = this.extractToken(info.req);
        if (!token) {
          cb(false, 401, 'Unauthorized');
          return;
        }

        try {
          const { userId, sessionId, role, isAdmin } = await this.verifyToken(token);
          if (!userId || !sessionId || !role) {
            cb(false, 401, 'Unauthorized');
            return;
          }
          cb(true);
        } catch (error) {
          cb(false, 401, 'Invalid token');
        }
      }
    });

    this.setupWebSocketHandlers();
    await this.setupEventConsumers();

    this.fastify.log.info(`🚀 WebSocket Gateway listening on port ${port}`);
  }

  private extractToken(req: any): string | null {
    const url = new URL(req.url, `http://${req.headers.host}`);
    const token = url.searchParams.get('token');

    if (token) return token;

    const auth = req.headers.authorization;
    if (auth?.startsWith('Bearer ')) {
      return auth.substring(7);
    }

    return null;
  }

  private async verifyToken(token: string): Promise<any> {
    try {
      const adminSessionData = await this.fastify.redis.get(`admin:session:${token}`);
      if (adminSessionData) {
        console.log('sessionData', adminSessionData);
        const { adminId, role } = JSON.parse(adminSessionData);
        return {
          userId: adminId,
          sessionId: token,
          role,
          isAdmin: true
        };
      }

      const userSessionData = await this.fastify.redis.get(`session:${token}`);
      if (userSessionData) {
        console.log('sessionData', userSessionData);
        const { userId, role } = JSON.parse(userSessionData);
        return {
          userId,
          sessionId: token,
          role: role || 'user',
          isAdmin: false
        };
      }

      return null;
    } catch (error) {
      throw new Error('Invalid token');
    }
  }

  private setupWebSocketHandlers() {
    this.wss.on('connection', async (ws: WebSocket, req: any) => {
      const connectionId = this.generateConnectionId();

      const url = new URL(req.url, `http://${req.headers.host}`);
      const token = url.searchParams.get('token');
      const { userId, sessionId, role, isAdmin } = await this.verifyToken(token);

      let clientType: 'user' | 'partner' | 'admin' = 'user';
      if (isAdmin) {
        clientType = 'admin';
      } else if (role === 'partner') {
        clientType = 'partner';
      }

      const connection: ClientConnection = {
        ws,
        userId: userId,
        clientType: role || 'user',
        metadata: {
          connectedAt: new Date().toISOString(),
          userAgent: req.headers['user-agent'],
          role,
          isAdmin
        }
      };

      this.connections.set(connectionId, connection);

      if (!this.userConnections.has(userId)) {
        this.userConnections.set(userId, new Set());
      }
      this.userConnections.get(userId)!.add(connectionId);

      await this.storeConnectionInRedis(connectionId, connection);

      this.fastify.log.info(`✅ Client connected: ${connectionId} (${connection.clientType}: ${userId})`);

      this.sendToClient(ws, {
        type: 'CONNECTION_ESTABLISHED',
        data: {
          connectionId,
          userId,
          clientType,
          role
        }
      });

      ws.on('message', async (message: WebSocket.Data) => {
        try {
          const data = JSON.parse(message.toString()) as WSMessage;
          await this.handleClientMessage(connectionId, data);
        } catch (error) {
          this.fastify.log.error(error.toString());
          this.fastify.log.error(`Error handling message from ${connectionId}:`, error);
          this.sendToClient(ws, {
            type: 'ERROR',
            data: { message: 'Invalid message format' }
          });
        }
      });

      ws.on('ping', () => {
        ws.send('pong');
      });

      ws.on('pong', () => {
        connection.metadata!.lastPong = new Date().toISOString();
      });

      // Handle disconnection
      ws.on('close', async () => {
        await this.handleDisconnection(connectionId);
      });

      ws.on('error', (error) => {
        this.fastify.log.error(`WebSocket error for ${connectionId}:`, error);
      });
    });

    setInterval(() => {
      this.connections.forEach((connection, id) => {
        if (connection.ws.readyState === WebSocket.OPEN) {
          connection.ws.ping();
        }
      });
    }, 30000);
  }

  private async handleClientMessage(connectionId: string, message: WSMessage) {
    const connection = this.connections.get(connectionId);
    if (!connection) return;

    this.fastify.log.info(`📨 Message from ${connectionId}: ${message.type}`);

    switch (message.type) {
      case 'ADMIN_JOB_REQUEST_BROADCAST':
        this.fastify.log.info(message);
        await this.handleAdminJobRequestBroadcast(connection, message.data);
        break;

      case 'PARTNER_ACCEPTED_JOB':
        await this.handlePartnerAcceptedJob(connection, message.data);
        break;

      case 'PARTNER_ENROUTE':
        this.fastify.log.info("-----------------------------> PARTNER Enroute");
        await this.handlePartnerEnroute(connection, message.data);
        break;

      case 'PARTNER_LOCATION_UPDATE':
        await this.handlePartnerLocationUpdate(connection, message.data);
        break;

      case 'USER_UPDATE_PARTNER_ARRIVED':
        await this.handleUserUpdatePartnerArrived(connection, message.data);
        break;

      case 'PARTNER_UPDATE_AVAILABILITY':
        await this.handlePartnerUpdateAvailability(connection, message.data);

      default:
        return;
    }
  }

  private async handlePartnerUpdateAvailability(connection: ClientConnection, data: PartnerUpdateAvailabilityData) {
    const { partnerId, isOnline } = data;
    const event: PartnerUpdateAvailabilityEvent = {
      eventType: 'PARTNER_UPDATE_AVAILABILITY',
      data: {
        partnerId,
        isOnline,
      }
    }
    this.publisher.publish(event, 'partner.availability.updated');
    this.fastify.log.info(`Partner ${partnerId} availability updated to ${isOnline}`);
  }

  private async handleUserUpdatePartnerArrived(connection: ClientConnection, data: UserPartnerArrivedData) {
    const { userId, partnerId, bookingId } = data;
    const event: UserPartnerArrivedEvent = {
      eventType: 'USER_PARTNER_ARRIVED',
      data: {
        userId,
        partnerId,
        bookingId,
        timestamp: new Date().toISOString()
      }
    }
    this.publisher.publish(event, 'user.partner.arrived');
  }

  private async handlePartnerLocationUpdate(connection: ClientConnection, data: PartnerLocationUpdatedData) {
    const { partnerId, location } = data;
    this.fastify.log.info(`Partner ${partnerId} location updated to ${location.latitude}, ${location.longitude}`);
    const event: PartnerLocationUpdatedEvent = {
      eventType: 'PARTNER_LOCATION_UPDATED',
      data: {
        partnerId,
        location,
        timestamp: new Date().toISOString()
      }
    }
    this.publisher.publish(event, 'partner.location.updated');
  }

  private async handlePartnerEnroute(connection: ClientConnection, data: PartnerEnrouteData) {
    const { bookingId, partnerId } = data;
    const event: PartnerEnrouteEvent = {
      eventType: 'PARTNER_ENROUTE_EVENT',
      data: {
        bookingId,
        partnerId,
        timestamp: new Date().toISOString(),
        partnerStatus: 'enroute'
      }
    }
    this.publisher.publish(event, 'partner.enroute');
    this.fastify.log.info(`Partner enroute for booking ${bookingId}`);

    const replyMessage: WSMessage = {
      type: 'PARTNER_ENROUTE_UPDATED',
      data: {
        bookingId,
        partnerId,
        timestamp: new Date().toISOString(),
      }
    }
    this.sendToConnection(connection, replyMessage);
  }

  private async handlePartnerAcceptedJob(connection: ClientConnection, data: PartnerBookingAcceptedData) {
    const { id, name, ratings, reviewCount, phoneNumber, photoUrl, userId } = data.partner;
    const event: PartnerBookingRequestedEvent = {
      eventType: 'PARTNER_BOOKING_REQUESTED',
      data: {
        bookingId: data.bookingId,
        partner: {
          id,
          name,
          photoUrl,
          ratings,
          reviewCount,
          phoneNumber,
          userId
        },
        requestedAt: new Date().toISOString()
      }
    }
    this.publisher.publish(event, 'partner.booking.accept_requested');
  }

  private async handleAdminJobRequestBroadcast(connection: ClientConnection, data: AdminJobRequestBroadcastData) {
    this.fastify.log.info(`Broadcasting admin job request to ${data.partner_userIds.length} users`);
    const { partner_userIds, booking } = data;

    const message: WSMessage = {
      type: 'NEW_JOB_REQUEST',
      data: {
        booking,
        timestamp: new Date().toISOString()
      }
    };
    await this.broadcastToUsers(partner_userIds, message);
    this.sendToConnection(connection, {
      type: 'JOB_REQUEST_BROADCAST_SENT',
      data: {
        bookingId: booking.bookingId,
        partnerCount: partner_userIds.length,
        partnerIds: partner_userIds
      }
    });

  }

  private async setupEventConsumers() {
    this.consumer.on('BOOKING_READY_FOR_ASSIGNMENT', async (event: BookingReadyForAssignmentEvent) => {
      await this.sendBookingToSupervisors(event);
    });

    this.consumer.on('BOOKING_PARTNER_ASSIGNED', async (event: BookingPartnerAssignedEvent) => {
      await this.handleBookingPartnerAssigned(event);
    });

    this.consumer.on('BOOKING_STATUS_UPDATED', async (event: BookingStatusUpdatedEvent) => {
      await this.handleBookingStatusUpdated(event);
    })

    this.consumer.on('BOOKING_PARTNER_LOCATION_UPDATED', async (event: BookingPartnerLocationUpdatedEvent) => {
      await this.handleBookingPartnerLocationUpdated(event);
    })

    this.consumer.on('PARTNER_ARRIVED', async (event: PartnerArrivedEvent) => {
      await this.handlePartnerArrived(event);
    })

    this.consumer.on('SERVICE_STARTED', async (event: ServiceStartedEvent) => {
      await this.handleServiceStarted(event);
    })

    this.consumer.on('SERVICE_COMPLETED', async (event: ServiceCompletedEvent) => {
      await this.handleServiceCompleted(event);
    })

    await this.consumer.startConsuming('websocket-gateway', [
      'booking.*',
      'partner.*',
      'service.*',
      'location.*',
      'ws.response.*',
      'booking.partner.assigned',
      'booking.partner.location.updated',
      'booking.status.updated'
    ]);
  }


  private async handleServiceStarted(event: ServiceStartedEvent) {
    const { bookingId, userId, partnerId, startTime, location } = event.data;
    const userMessage: WSMessage = {
      type: 'SERVICE_STARTED',
      data: {
        bookingId,
        userId,
        partnerId,
        startTime,
        location,
      }
    }
    await this.sendToUser(userId, userMessage);
  }

  private async handleServiceCompleted(event: ServiceCompletedEvent) {
    const { bookingId, userId, partnerId, startTime, endTime, duration, finalAmount } = event.data;
    const userMessage: WSMessage = {
      type: 'SERVICE_COMPLETED',
      data: {
        bookingId,
        userId,
        partnerId,
        startTime,
        endTime,
        duration,
        finalAmount,
        timestamp: new Date().toISOString()
      }
    }
    await this.sendToUser(userId, userMessage);
  }

  private async handlePartnerArrived(event: PartnerArrivedEvent) {
    const { partnerId, bookingId, partner_userId } = event.data;
    const partnerMessage: WSMessage = {
      type: 'PARTNER_ALLOWED_TO_START_SERVICE',
      data: {
        partnerId,
        bookingId,
        partner_userId,
      }
    }
    await this.sendToUser(partner_userId, partnerMessage);
    this.fastify.log.info(`Partner ${partnerId} allowed to start service for booking ${bookingId}`);
  }

  private async handleBookingPartnerLocationUpdated(event: BookingPartnerLocationUpdatedEvent) {
    const { bookingId, userId, partnerId, location } = event.data;
    const userMessage: WSMessage = {
      type: 'PARTNER_LOCATION_UPDATE',
      data: {
        bookingId,
        partnerId,
        timestamp: new Date().toISOString(),
        lat: location.latitude,
        lng: location.longitude
      }
    };
    this.fastify.log.info(`Sending ${userMessage.type} to user ${userId}`);
    await this.sendToUser(userId, userMessage);
  }
  private async handleBookingStatusUpdated(event: BookingStatusUpdatedEvent) {
    const { bookingId, partnerId, userId } = event.data;

    const userMessage: WSMessage = {
      type: 'PARTNER_ENROUTE',
      data: {
        bookingId,
        partnerId,
        timestamp: new Date().toISOString(),
        partnerStatus: 'enroute'
      }
    }
    await this.sendToUser(userId, userMessage);
  }

  private async handleBookingPartnerAssigned(event: BookingPartnerAssignedEvent) {
    const { bookingId, partnerId, partnerUserId, partnerDetails, userId, userLocation, scheduledDateTime, serviceIds } = event.data;
    const userMessage: WSMessage = {
      type: 'BOOKING_PARTNER_ASSIGNED',
      data: {
        bookingId,
        partnerDetails,
        partnerId,
        timestamp: new Date().toISOString()
      }
    }
    const partnerMessage: WSMessage = {
      type: 'BOOKING_ASSIGNED',
      data: {
        bookingId,
        userLocation,
        scheduledDateTime,
        serviceIds,
        status: 'assigned',
        assignedAt: new Date().toISOString()
      }
    };
    this.fastify.log.info(`Sending booking assigned message to user ${userId} and partner ${partnerUserId}`);
    await this.sendToUser(partnerUserId, partnerMessage);
    await this.sendToUser(userId, userMessage);
  }

  private async sendBookingToSupervisors(event: BookingReadyForAssignmentEvent) {
    const { supervisorIds } = event.data;
    const message: WSMessage = {
      type: 'BOOKING_READY_FOR_ASSIGNMENT',
      data: {
        booking: event.data,
        timestamp: new Date().toISOString()
      }
    };
    await this.broadcastToUsers(supervisorIds, message);
  }

  private async sendToUser(userId: string, message: WSMessage) {
    const connectionIds = this.userConnections.get(userId);
    if (!connectionIds || connectionIds.size === 0) {
      await this.storeOfflineMessage(userId, message);
      return;
    }
    connectionIds.forEach(connectionId => {
      const connection = this.connections.get(connectionId);
      if (connection && connection.ws.readyState === WebSocket.OPEN) {
        this.fastify.log.info(`Sending message to user ${userId}`);
        this.sendToConnection(connection, message);
      }
    });
  }

  private async broadcastToUsers(userIds: string[], message: WSMessage) {
    for (const userId of userIds) {
      await this.sendToUser(userId, message);
    }
  }

  private sendToConnection(connection: ClientConnection, message: WSMessage) {
    if (connection.ws.readyState === WebSocket.OPEN) {
      connection.ws.send(JSON.stringify({
        ...message,
        timestamp: message.timestamp || new Date().toISOString()
      }));
    }
  }

  private sendToClient(ws: WebSocket, message: WSMessage) {
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({
        ...message,
        timestamp: message.timestamp || new Date().toISOString()
      }));
    }
  }

  private async storeConnectionInRedis(connectionId: string, connection: ClientConnection) {
    const data = {
      userId: connection.userId,
      clientType: connection.clientType,
      metadata: connection.metadata,
      serverId: process.env.SERVER_ID || 'gateway-1'
    };

    await this.fastify.redis.setEx(
      `ws:connection:${connectionId}`,
      3600, // 1 hour TTL
      JSON.stringify(data)
    );

    await this.fastify.redis.sAdd(`ws:user:${connection.userId}`, connectionId);
    await this.fastify.redis.expire(`ws:user:${connection.userId}`, 3600 * 24);
  }

  private async removeConnectionFromRedis(connectionId: string) {
    const connData = await this.fastify.redis.get(`ws:connection:${connectionId}`);
    if (connData) {
      const { userId } = JSON.parse(connData);
      await this.fastify.redis.sRem(`ws:user:${userId}`, connectionId);
    }
    await this.fastify.redis.del(`ws:connection:${connectionId}`);
  }

  private async storeOfflineMessage(userId: string, message: WSMessage) {
    const key = `offline:messages:${userId}`;
    await this.fastify.redis.rPush(key, JSON.stringify(message));
    await this.fastify.redis.expire(key, 86400);
  }

  private generateConnectionId(): string {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  private async handleDisconnection(connectionId: string) {
    const connection = this.connections.get(connectionId);
    if (!connection) return;

    this.connections.delete(connectionId);
    const userConnections = this.userConnections.get(connection.userId);
    if (userConnections) {
      userConnections.delete(connectionId);
      if (userConnections.size === 0) {
        this.userConnections.delete(connection.userId);
      }
    }

    await this.removeConnectionFromRedis(connectionId);

    this.fastify.log.info(`❌ Client disconnected: ${connectionId} (${connection.clientType}: ${connection.userId})`);
  }

  async shutdown() {
    this.fastify.log.info('🛑 Shutting down WebSocket Gateway...');

    this.connections.forEach((connection, id) => {
      connection.ws.close(1001, 'Server shutting down');
    });

    this.wss.close();

    await this.consumer.stop();

    this.fastify.log.info('✅ WebSocket Gateway shut down');
  }
}