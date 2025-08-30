import { Channel, ChannelModel } from "amqplib";

declare module "fastify" {
  interface FastifyInstance {
    rabbitmq: {
      connection: ChannelModel;
      channel: Channel;
    };
  }
}