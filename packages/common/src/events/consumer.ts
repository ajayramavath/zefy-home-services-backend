import { FastifyInstance } from 'fastify';
import { ConsumeMessage } from 'amqplib';
import { AppEvent, EXCHANGES, QUEUES } from './types';

export type EventHandler<T extends AppEvent = AppEvent> = (event: T, fastify: FastifyInstance) => Promise<void>;

export class EventConsumer {
  private handlers: Map<string, EventHandler> = new Map();

  constructor(public fastify: FastifyInstance) { }

  on<T extends AppEvent>(eventType: T['eventType'], handler: EventHandler<T>): void {
    this.handlers.set(eventType, handler as EventHandler);
    this.fastify.log.info(`📥 Event handler registered: ${eventType}`);
  }

  async startConsuming(queueName: string, routingKeys: string[]): Promise<void> {
    const { channel } = this.fastify.rabbitmq;

    try {
      await channel.assertExchange(EXCHANGES.ZEFY_EVENTS, 'topic', {
        durable: true
      });

      await channel.assertQueue(queueName, { durable: true });

      for (const routingKey of routingKeys) {
        await channel.bindQueue(queueName, EXCHANGES.ZEFY_EVENTS, routingKey);
        this.fastify.log.info(`🔗 Queue ${queueName} bound to ${routingKey}`);
      }

      await channel.consume(queueName, async (message: ConsumeMessage | null) => {
        if (!message) return;

        try {
          const event: AppEvent = JSON.parse(message.content.toString());
          await this.handleEvent(event);

          channel.ack(message);
        } catch (error) {
          this.fastify.log.error('❌ Error processing event:', error);
          channel.nack(message, false, true);
        }
      });

      this.fastify.log.info(`🎧 Started consuming from queue: ${queueName}`);
    } catch (error) {
      this.fastify.log.error(`❌ Failed to start consuming from ${queueName}:`, error);
      throw error;
    }
  }

  private async handleEvent(event: AppEvent): Promise<void> {
    const handler = this.handlers.get(event.eventType);

    if (!handler) {
      this.fastify.log.warn(`⚠️ No handler found for event: ${event.eventType}`);
      return;
    }

    try {
      await handler(event, this.fastify);
      this.fastify.log.info(`✅ Event processed: ${event.eventType}`);
    } catch (error) {
      this.fastify.log.error(`❌ Event handler failed for ${event.eventType}:`, error);
      throw error;
    }
  }

  async stop(): Promise<void> {
    this.fastify.log.info('🛑 Event consumer stopped');
  }
}