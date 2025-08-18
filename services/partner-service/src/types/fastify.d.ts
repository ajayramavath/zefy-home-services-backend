import { IPartner } from "@zf/types";
import { Channel, ChannelModel } from "amqplib";

declare module "fastify" {
  interface FastifyInstance {
    rabbitmq: {
      connection: ChannelModel;
      channel: Channel;
    };
  }

  interface FastifyRequest {
    partner: IPartner;
  }
}