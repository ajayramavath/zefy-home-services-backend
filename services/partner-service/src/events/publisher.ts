import { FastifyInstance } from 'fastify';
import { EventPublisher, PartnerArrivedEvent, PartnerBookingLocationUpdatedEvent, PartnerLocationUpdatedEvent } from '@zf/common';
import {
  PartnerRegisteredEvent,
  PartnerOnlineEvent,
  PartnerOfflineEvent,
  PartnerBookingDeclinedEvent,
} from '@zf/common';

export class PartnerEventPublisher extends EventPublisher {
  constructor(fastify: FastifyInstance) {
    super(fastify);
  }

  async publishPartnerRegistered(
    partnerId: string,
    userId: string,
    hubId: string,
    services: string[]
  ): Promise<void> {
    const event: PartnerRegisteredEvent = {
      eventType: 'PARTNER_REGISTERED',
      data: {
        partnerId,
        userId,
        hubId,
        services,
        timestamp: new Date().toISOString()
      }
    };

    await this.publish(event, 'partner.registered');
  }

  async publishPartnerOnline(
    partnerId: string,
    userId: string,
    hubId?: string
  ): Promise<void> {
    const event: PartnerOnlineEvent = {
      eventType: 'PARTNER_ONLINE',
      data: {
        partnerId,
        userId,
        hubId,
        timestamp: new Date().toISOString()
      }
    };

    await this.publish(event, 'partner.online');
  }

  async publishPartnerOffline(
    partnerId: string,
    userId: string
  ): Promise<void> {
    const event: PartnerOfflineEvent = {
      eventType: 'PARTNER_OFFLINE',
      data: {
        partnerId,
        userId,
        timestamp: new Date().toISOString()
      }
    };

    await this.publish(event, 'partner.offline');
  }

  async publishPartnerBookingDeclined(
    bookingId: string,
    partnerId: string,
    reason?: string
  ): Promise<void> {
    const event: PartnerBookingDeclinedEvent = {
      eventType: 'PARTNER_BOOKING_DECLINED',
      data: {
        bookingId,
        partnerId,
        reason,
        declinedAt: new Date().toISOString()
      }
    };

    await this.publish(event, 'partner.booking.declined');
  }

  async publishPartnerBookingLocationUpdated(
    partnerId: string,
    location: { latitude: number; longitude: number },
    bookingId: string,
  ): Promise<void> {
    const event: PartnerBookingLocationUpdatedEvent = {
      eventType: 'PARTNER_BOOKING_LOCATION_UPDATED',
      data: {
        partnerId,
        bookingId,
        location: {
          latitude: location.latitude,
          longitude: location.longitude
        },
        timestamp: new Date().toISOString()
      }
    };

    await this.publish(event, 'partner.booking.location.updated');
  }

  async publishPartnerArrived(partnerId: string, bookingId: string, partner_userId: string): Promise<void> {
    const event: PartnerArrivedEvent = {
      eventType: 'PARTNER_ARRIVED',
      data: {
        partnerId,
        bookingId,
        partner_userId
      }
    }

    this.publish(event, 'partner.arrived');
  }
}