import { FastifyInstance } from "fastify";
import proxy from "@fastify/http-proxy";

export default async function routes(app: FastifyInstance) {
  // Proxy /users/* to the user-service
  app.register(proxy, {
    upstream: process.env.USER_SERVICE_URL || "http://user-service:3000",
    prefix: "/users",
    rewritePrefix: "/users",
    http2: false, // optional: only if you’re not using HTTP/2 for upstream
  });

  app.register(proxy, {
    upstream:
      process.env.AGGREGATOR_SERVICE_URL || "http://aggregator-service:3000",
    prefix: "/aggregator",
    rewritePrefix: "/aggregator",
    http2: false, // optional: only if you’re not using HTTP/2 for upstream
  });

  // Health check
  app.get("/health", async () => ({ status: "ok" }));
}
