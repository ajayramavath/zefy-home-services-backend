import fp from "fastify-plugin";
import { BaseProvider } from "../providers/BaseProvider";
import PorterAdapter from "../providers/PorterAdapter";

export default fp(async (app) => {
  const adapters: Record<string, BaseProvider> = {
    // uber: new UberAdapter(app.config.UBER_API_KEY),
    // ola:  new OlaAdapter(app.config.OLA_CLIENT_ID, app.config.OLA_SECRET),
    porter: new PorterAdapter("yes", "http://user-service:3000"),
  };
  app.decorate("parcels", adapters);
});
