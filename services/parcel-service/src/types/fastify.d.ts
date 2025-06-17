import "fastify";
// import { BaseAggregator } from "../aggregators/BaseAggregator";
import { BaseProvider } from "../providers/BaseProvider";
declare module "fastify" {
  interface FastifyInstance {
    /** Map of parcel adapters, registered by our plugin */
    parcels: Record<string, BaseProvider>;
  }
}
