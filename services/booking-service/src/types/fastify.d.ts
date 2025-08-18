import { Channel, ChannelModel } from "amqplib";
import { BookingsEventPublisher } from "../events/publisher";

declare module "fastify" {
  interface FastifyInstance {
    rabbitmq: {
      connection: ChannelModel;
      channel: Channel;
    };
    mongooseReady: () => boolean;
    mongooseState: () => string;
    bookingEventPublisher: BookingsEventPublisher;
  }
}