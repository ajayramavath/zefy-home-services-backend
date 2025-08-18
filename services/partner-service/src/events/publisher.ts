// src/events/partner-publisher.ts
import { FastifyInstance } from 'fastify';
import { EventPublisher, PartnerLocationUpdatedEvent } from '@zf/common';
import {
  PartnerRegisteredEvent,
  PartnerOnlineEvent,
  PartnerOfflineEvent,
  PartnerBookingRequestedEvent,
  PartnerBookingDeclinedEvent,
  PartnerStatusUpdatedEvent
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

  async publishPartnerBookingAcceptRequested(
    bookingId: string,
    partnerId: string,
    partnerName: string,
    partnerPhotoUrl: string,
    partnerRatings: number,
    partnerReviewCount: number,
    partnerPhoneNumber: string,
  ): Promise<void> {
    const event: PartnerBookingRequestedEvent = {
      eventType: 'PARTNER_BOOKING_REQUESTED',
      data: {
        bookingId,
        partner: {
          id: partnerId,
          name: partnerName,
          photoUrl: partnerPhotoUrl,
          ratings: partnerRatings,
          reviewCount: partnerReviewCount,
          phoneNumber: partnerPhoneNumber,
        },
        requestedAt: new Date().toISOString()
      }
    };

    await this.publish(event, 'partner.booking.accept_requested');
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

  async publishPartnerLocationUpdated(
    partnerId: string,
    location: { latitude: number; longitude: number },
    bookingId?: string,
  ): Promise<void> {
    const event: PartnerLocationUpdatedEvent = {
      eventType: 'PARTNER_LOCATION_UPDATED',
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

    await this.publish(event, 'partner.location.updated');
  }

  async publishPartnerStatusUpdated(
    partnerId: string,
    status: 'enroute' | 'arrived',
    bookingId?: string
  ): Promise<void> {
    const event: PartnerStatusUpdatedEvent = {
      eventType: 'PARTNER_STATUS_UPDATED',
      data: {
        partnerId,
        bookingId,
        partnerStatus: status,
        timestamp: new Date().toISOString()
      }
    };

    await this.publish(event, `partner.status.updated`);
  }
}