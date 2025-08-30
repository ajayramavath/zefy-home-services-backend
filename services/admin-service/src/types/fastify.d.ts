import { Channel, ChannelModel } from "amqplib";
import { AdminEventsPublisher } from "../events/publisher";

declare module "fastify" {
  interface FastifyInstance {
    rabbitmq: {
      connection: ChannelModel;
      channel: Channel;
    };
    mongooseReady: () => boolean;
    mongooseState: () => string;
    AdminEventPublisher: AdminEventsPublisher;
  }
}