import { EventPublisher } from "@zf/common";
import { FastifyInstance } from "fastify";

export class AdminEventsPublisher extends EventPublisher {
  constructor(fastify: FastifyInstance) {
    super(fastify);
  }
}