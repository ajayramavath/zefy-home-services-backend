// services/aggregator-service/src/types/fastify.d.ts
import "fastify";
import { BaseAggregator } from "../aggregators/BaseAggregator";

declare module "fastify" {
  interface FastifyInstance {
    /** Map of aggregator adapters, registered by our plugin */
    aggregators: Record<string, BaseAggregator>;
  }
}
