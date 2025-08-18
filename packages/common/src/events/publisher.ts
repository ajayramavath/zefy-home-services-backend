import { FastifyInstance } from 'fastify';
import { AppEvent, EXCHANGES, QUEUES } from './types';

export class EventPublisher {
  constructor(public fastify: FastifyInstance) { }

  async publish(event: AppEvent, routingKey: string): Promise<void> {
    const { channel } = this.fastify.rabbitmq;

    try {
      const message = JSON.stringify(event);

      const published = channel.publish(
        EXCHANGES.ZEFY_EVENTS,
        routingKey,
        Buffer.from(message),
        {
          persistent: true,
          timestamp: Date.now(),
          messageId: `${event.eventType}-${Date.now()}-${Math.random()}`
        }
      );

      if (!published) {
        throw new Error('Failed to publish message to exchange');
      }

      this.fastify.log.info(`📤 Event published: ${event.eventType} -> ${routingKey}`);
    } catch (error) {
      this.fastify.log.error(`❌ Failed to publish event ${event.eventType}:`, error);
      throw error;
    }
  }

  async publishHubAssigned(userId: string, hubId: string, location: { lat: number; lng: number }, serviceArea: string): Promise<void> {
    const event: AppEvent = {
      eventType: 'HUB_ASSIGNED',
      data: {
        userId,
        hubId,
        location,
        serviceArea,
        timestamp: new Date().toISOString()
      }
    };

    await this.publish(event, 'hub.assigned');
  }

  async publishUserCreated(userId: string, phoneNumber: string): Promise<void> {
    const event: AppEvent = {
      eventType: 'USER_CREATED',
      data: {
        userId,
        phoneNumber,
        timestamp: new Date().toISOString()
      }
    };

    await this.publish(event, 'user.created');
  }
}