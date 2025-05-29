import fp from "fastify-plugin";
import { BaseAggregator } from "../aggregators/BaseAggregator";
// import UberAdapter from '../aggregators/UberAdapter';
// import OlaAdapter  from '../aggregators/OlaAdapter';
import GozoAdapter from "../aggregators/GozoAdapter";

export default fp(async (app) => {
  const adapters: Record<string, BaseAggregator> = {
    // uber: new UberAdapter(app.config.UBER_API_KEY),
    // ola:  new OlaAdapter(app.config.OLA_CLIENT_ID, app.config.OLA_SECRET),
    gozo: new GozoAdapter("yes"),
  };
  app.decorate("aggregators", adapters);
});
