import { Partner } from './../models/partner.model';
import { FastifyInstance, FastifyRequest } from 'fastify';
import { WebSocket } from 'ws';
import websocket from '@fastify/websocket';
import { IPartner } from '@zf/types';
import { PartnerEventPublisher } from '../events/publisher';
import { Availability } from '../models/availability.model';
import { PartnerStats } from '../models/partnerStats.model';

export interface PartnerConnection {
  partnerId: string;
  sesssionToken: string;
  socket: WebSocket;
  lastPing: Date;
  isActive: boolean;
  connectedAt: Date;
  hubId?: string;
}

export interface BookingNotification {
  type: 'new_booking';
  bookingId: string;
  services: ServiceDetail[];
  location: LocationDetail;
  schedulingInfo: SchedulingInfo;
  specialInstructions?: string;
  estimatedEarnings: number;
  timestamp: string;
  expiresAt: string;
}

export interface ServiceDetail {
  name: string;
  type: string;
  price: number;
}

export interface LocationDetail {
  address: string;
  coordinates: {
    latitude: number;
    longitude: number;
  };
  houseDetails: {
    bedrooms: number;
    bathrooms: number;
    balconies: number;
    kitchens: number;
    livingRooms: number;
  };
}

export interface SchedulingInfo {
  type: 'instant' | 'scheduled';
  scheduledDate?: string;
  timeSlot?: {
    start: string;
    end: string;
  };
}

export interface WebSocketMessage {
  type: string;
  [key: string]: any;
}

export class WebSocketManager {
  private connections = new Map<string, PartnerConnection>();
  private socketToPartner = new Map<WebSocket, string>();
  private pingInterval: NodeJS.Timeout | null = null;
  private cleanupInterval: NodeJS.Timeout | null = null;
  private eventPublisher: PartnerEventPublisher;

  constructor(private fastify: FastifyInstance) {
    this.eventPublisher = new PartnerEventPublisher(fastify);
    this.startPingInterval();
    this.startCleanupInterval();
  }

  async setupWebSocketServer() {
    await this.fastify.register(websocket);

    this.fastify.get('/partners/ws', { websocket: true }, (connection, request) => {
      this.handleConnection(connection, request);
    });

    this.fastify.log.info('WebSocket server setup completed');
  }

  private async handleConnection(socket: WebSocket, request: FastifyRequest) {
    try {

      const url = new URL(request.url!, `http://localhost`);
      let token = null;
      this.fastify.log.info('🔍 Request object properties:');
      this.fastify.log.info('- request.url:', request.url);
      this.fastify.log.info((request as any).originalUrl);
      this.fastify.log.info('- request.raw.url:', request.raw.url);
      this.fastify.log.info('- request.query:', request.query);
      this.fastify.log.info('- request.params:', request.params);
      this.fastify.log.info('- request.headers:', JSON.stringify(request.headers, null, 2));
      this.fastify.log.info('- request.raw.headers:', JSON.stringify(request.raw.headers, null, 2));

      this.fastify.log.info(request.url);
      if (request.url) {
        const match = request.url.match(/[?&]token=([^&]+)/);
        if (match) {
          token = decodeURIComponent(match[1]);
        }
      }

      this.fastify.log.info('🔍 Extracted token:', token);

      if (!token) {
        this.fastify.log.error('WebSocket connection rejected: No token provided');
        socket.close(1008, 'Authentication token required');
        return;
      }

      const sessionData = await this.verifyToken(token);
      if (!sessionData) {
        this.fastify.log.error('WebSocket connection rejected: Invalid or expired session');
        socket.close(1008, 'Invalid or expired session token');
        return;
      }
      const { userId, role } = sessionData;

      if (role !== 'partner') {
        this.fastify.log.error(`WebSocket connection rejected: Invalid role ${role} for user ${userId}`);
        socket.close(1008, 'Access denied: Partner role required');
        return;
      }

      const partner = await this.getPartnerByUserId(userId);
      if (!partner) {
        this.fastify.log.error(`WebSocket connection rejected: Partner not found for user ${userId}`);
        socket.close(1008, 'Partner not found');
        return;
      }

      const partnerConnection: PartnerConnection = {
        partnerId: partner._id.toString(),
        sesssionToken: token,
        socket: socket,
        lastPing: new Date(),
        isActive: true,
        connectedAt: new Date(),
        hubId: partner.hubId?.toString(),
      };

      this.connections.set(partner._id.toString(), partnerConnection);
      this.socketToPartner.set(socket, partner._id.toString());

      this.fastify.log.info(`✅ Partner ${partner._id} (userId: ${userId}) connected via WebSocket`);

      this.sendToPartner(partner._id.toString(), {
        type: 'connection_established',
        message: 'WebSocket connected successfully',
        partnerInfo: {
          partnerId: partner._id,
          name: partner.personalInfo?.name,
          isOnline: true
        },
        timestamp: new Date().toISOString(),
      });

      await this.updatePartnerOnlineStatus(partner._id.toString(), true);

      socket.on('message', (data) => {
        this.handleMessage(partner._id.toString(), data as Buffer);
      });

      socket.on('pong', () => {
        const conn = this.connections.get(partner._id.toString());
        if (conn) {
          conn.lastPing = new Date();
        }
      });

      socket.on('close', (code, reason) => {
        this.fastify.log.info(`Partner ${partner._id} disconnected. Code: ${code}, Reason: ${reason}`);
        this.handleDisconnection(partner._id.toString());
      });

      socket.on('error', (error) => {
        this.fastify.log.error(`WebSocket error for partner ${partner._id}:`, error);
        this.handleDisconnection(partner._id.toString());
      });


    } catch (error) {
      this.fastify.log.error('Error handling WebSocket connection:', error);
      socket.close(1011, 'Internal server error');
    }
  }

  private async handleMessage(partnerId: string, data: Buffer) {
    try {
      const message: WebSocketMessage = JSON.parse(data.toString());
      this.fastify.log.info(`Message from partner ${partnerId}:`, message.type);

      switch (message.type) {
        case 'ping':
          this.sendToPartner(partnerId, {
            type: 'pong',
            timestamp: new Date().toISOString()
          });
          break;

        case 'booking_response':
          await this.handleBookingResponse(partnerId, message);
          break;

        case 'location_update':
          await this.handleLocationUpdate(partnerId, message);
          break;

        case 'status_update':
          await this.handleStatusUpdate(partnerId, message);
          break;

        default:
          this.fastify.log.warn(`Unknown message type: ${message.type}`);
      }
    } catch (error) {
      this.fastify.log.error(`Error parsing message from partner ${partnerId}:`, error);
    }
  }

  private async handleBookingResponse(partnerId: string, message: WebSocketMessage) {
    const { bookingId, response } = message;
    const connection = this.connections.get(partnerId);
    if (!connection) return;
    try {
      if (response === 'accept') {
        this.fastify.log.info(`Partner ${partnerId} accepted booking ${bookingId}`);
        const partner = await Partner.findById(partnerId);

        this.fastify.log.info(`found partner`);
        this.fastify.log.info(partner);

        await this.eventPublisher.publishPartnerBookingAcceptRequested(bookingId, partner._id,
          'Ajay', '',
          4.5, 14, '8595085382');

        this.fastify.log.info(`event published`);

        this.sendToPartner(partnerId, {
          type: 'booking_request_acknowledged',
          bookingId,
          message: 'Your request to accept the booking has been received and is being processed',
          timestamp: new Date().toISOString(),
        });
        this.fastify.log.info(`Partner ${partnerId} requested to accept booking ${bookingId}`);
      } else if (response === 'decline') {
        await this.eventPublisher.publishPartnerBookingDeclined(bookingId, partnerId, 'Declined by partner');
        this.fastify.log.info(`Partner ${partnerId} declined booking ${bookingId}`);
      }
    } catch (error) {
      this.fastify.log.error('Error handling booking response:', error);
      this.sendToPartner(partnerId, {
        type: 'error',
        message: 'Failed to process booking response',
        timestamp: new Date().toISOString(),
      });
    }
  }

  private async handleLocationUpdate(partnerId: string, message: WebSocketMessage) {
    const { latitude, longitude } = message;

    try {
      const connection = this.connections.get(partnerId);
      if (!connection) return;

      await this.updatePartnerLocation(connection.partnerId, { latitude, longitude });

      const activeBookingId = await this.getActiveBookingForPartner(connection.partnerId);
      if (activeBookingId) {
        await this.eventPublisher.publishPartnerLocationUpdated(partnerId, { latitude, longitude }, activeBookingId);
      }
      this.fastify.log.info(`Updated location for partner ${partnerId}`);
    } catch (error) {
      this.fastify.log.error('Error handling location update:', error);
    }
  }

  private async handleStatusUpdate(partnerId: string, message: WebSocketMessage) {
    const { status, bookingId } = message;

    try {
      await this.eventPublisher.publishPartnerStatusUpdated(partnerId, status, bookingId);
    } catch (error) {
      this.fastify.log.error('Error handling status update:', error);
    }
  }

  private handleDisconnection(partnerId: string) {
    const connection = this.connections.get(partnerId);
    if (connection) {
      this.fastify.log.info(`Partner ${partnerId} disconnected`);
      this.connections.delete(partnerId);
      this.socketToPartner.delete(connection.socket);

      this.updatePartnerOnlineStatus(connection.partnerId, false);
    }
  }

  public sendToPartner(partnerId: string, message: WebSocketMessage): boolean {
    const connection = this.connections.get(partnerId);
    if (connection && connection.isActive && connection.socket.readyState === WebSocket.OPEN) {
      try {
        connection.socket.send(JSON.stringify(message));
        return true;
      } catch (error) {
        this.fastify.log.error(`Failed to send message to partner ${partnerId}:`, error);
        this.handleDisconnection(partnerId);
        return false;
      }
    }
    return false;
  }

  public async broadcastNewBooking(bookingData: {
    booking: any;
    eligiblePartners: string[];
  }): Promise<number> {
    const { booking, eligiblePartners } = bookingData;

    console.log(booking);

    const notification: BookingNotification = {
      type: 'new_booking',
      bookingId: booking._id || booking.bookingId,
      services: booking.serviceDetails,
      location: {
        address: booking.addressDetails?.fullAddress || '',
        coordinates: booking.addressDetails?.coordinates || { latitude: 0, longitude: 0 },
        houseDetails: booking.addressDetails?.houseDetails || {
          bedrooms: 0,
          bathrooms: 0,
          balconies: 0,
          kitchens: 0,
          livingRooms: 0,
        },
      },
      schedulingInfo: booking.schedulingInfo || { type: 'instant' },
      specialInstructions: booking.specialInstructions,
      estimatedEarnings: booking.amount.totalAmount,
      timestamp: new Date().toISOString(),
      expiresAt: new Date(Date.now() + 5 * 60 * 1000).toISOString(), // 5 minutes
    };

    let notificationsSent = 0;

    for (const partnerFirebaseUid of eligiblePartners) {
      const sent = this.sendToPartner(partnerFirebaseUid, notification);
      if (sent) {
        notificationsSent++;
        this.fastify.log.info(`Booking notification sent to partner ${partnerFirebaseUid}`);
      }
    }

    this.fastify.log.info(`Booking ${booking._id || booking.bookingId} notification sent to ${notificationsSent} partners`);
    return notificationsSent;
  }

  public sendBookingUpdate(firebaseUid: string, updateData: any) {
    this.sendToPartner(firebaseUid, {
      type: 'booking_update',
      ...updateData,
      timestamp: new Date().toISOString(),
    });
  }

  public sendEarningsUpdate(firebaseUid: string, earningsData: any) {
    this.sendToPartner(firebaseUid, {
      type: 'earnings_update',
      ...earningsData,
      timestamp: new Date().toISOString(),
    });
  }

  public getConnectionStats() {
    const connections = Array.from(this.connections.values());
    return {
      totalConnections: connections.length,
      activeConnections: connections.filter(c => c.isActive).length,
      connections: connections.map(c => ({
        partnerId: c.partnerId,
        sessionToken: c.sesssionToken,
        connectedAt: c.connectedAt,
        lastPing: c.lastPing,
        isActive: c.isActive,
        hubId: c.hubId,
      })),
    };
  }

  private startPingInterval() {
    this.pingInterval = setInterval(() => {
      for (const [firebaseUid, connection] of this.connections) {
        if (connection.isActive && connection.socket.readyState === WebSocket.OPEN) {
          try {
            connection.socket.ping();
          } catch (error) {
            this.fastify.log.error(`Failed to ping partner ${firebaseUid}:`, error);
            this.handleDisconnection(firebaseUid);
          }
        }
      }
    }, 30000); // Ping every 30 seconds
  }

  private startCleanupInterval() {
    this.cleanupInterval = setInterval(() => {
      const now = new Date();
      const staleConnections: string[] = [];

      for (const [firebaseUid, connection] of this.connections) {
        const timeSinceLastPing = now.getTime() - connection.lastPing.getTime();
        if (timeSinceLastPing > 60000 || connection.socket.readyState !== WebSocket.OPEN) { // 1 minute without ping or closed connection
          staleConnections.push(firebaseUid);
        }
      }

      for (const firebaseUid of staleConnections) {
        this.fastify.log.info(`Cleaning up stale connection for partner ${firebaseUid}`);
        this.handleDisconnection(firebaseUid);
      }
    }, 60000); // Cleanup every minute
  }

  public async close() {
    if (this.pingInterval) {
      clearInterval(this.pingInterval);
    }
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
    }

    // Close all connections
    for (const [firebaseUid, connection] of this.connections) {
      try {
        if (connection.socket.readyState === WebSocket.OPEN) {
          connection.socket.close();
        }
      } catch (error) {
        this.fastify.log.error(`Error closing connection for partner ${firebaseUid}:`, error);
      }
    }

    this.connections.clear();
    this.socketToPartner.clear();
  }

  private async verifyToken(token: string): Promise<any> {
    try {
      const sessionData = await this.fastify.redis.get(`session:${token}`);
      if (!sessionData) {
        return null;
      }
      console.log('sessionData', sessionData);
      const { userId, role } = JSON.parse(sessionData);
      console.log('sessionData', userId);
      return { userId, sessionId: token, role };
    } catch (error) {
      return null;
    }
  }

  private async getPartnerByUserId(userId: string): Promise<any> {
    const partner = await Partner.findOne({ userId });
    if (!partner) {
      return null;
    }
    return partner.toJSON();
  }

  private async updatePartnerOnlineStatus(partnerId: string, isOnline: boolean): Promise<void> {
    // Implement database update for partner online status
  }

  private async updatePartnerLocation(partnerId: string, location: { latitude: number; longitude: number }): Promise<void> {
    try {
      const availability = await Availability.findOne({ partnerId: partnerId });
      if (!availability) {
        return;
      }
      availability.location = {
        coordinates: [location.longitude, location.latitude],
        updatedAt: new Date(),
      };
      await availability.save();
      this.fastify.log.info(`Updated location for partner ${partnerId}`);
    } catch (error) {
      this.fastify.log.error(`Error updating location for partner ${partnerId}:`, error);
    }
  }

  private async getActiveBookingForPartner(partnerId: string): Promise<any> {
    try {
      const partnerStats = await PartnerStats.findOne({ partnerId });
      if (!partnerStats) {
        return null;
      }
      return partnerStats.curruntBookingId
    } catch (error) {

    }
  }

  private async assignPartnerToBooking(bookingId: string, partnerId: string): Promise<any> {
    // Implement booking assignment logic
    return { success: false };
  }

  private async storeChatMessage(bookingId: string, partnerId: string, message: string, messageType: string, sender: string): Promise<void> {
    // Implement chat message storage
  }

  private async publishEvent(eventType: string, data: any): Promise<void> {
    // Implement RabbitMQ event publishing
    // Use the rabbitmq instance from your Fastify instance
    const rabbit = this.fastify.rabbitmq.channel;
    if (rabbit) {
      try {
        await rabbit.publish('booking.exchange', eventType, Buffer.from(JSON.stringify(data)));
      } catch (error) {
        this.fastify.log.error('Error publishing event:', error);
      }
    }
  }
}