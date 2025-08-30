import { FastifyInstance } from "fastify";
import proxy from "@fastify/http-proxy";
import { WebSocketGateway } from "../websocket/web-socket-gateway";

let wsGateway: WebSocketGateway;

export default async function routes(app: FastifyInstance) {

  wsGateway = new WebSocketGateway(app);
  await wsGateway.initialize(Number(process.env.WS_PORT) || 8080);

  app.register(proxy, {
    upstream: process.env.USER_SERVICE_URL || "http://0.0.0.0:3001",
    prefix: "/users",
    rewritePrefix: "/users",
    http2: false,
  });

  app.register(proxy, {
    upstream: process.env.PARTNER_SERVICE_URL || "http://0.0.0.0:3003",
    prefix: "/partners",
    rewritePrefix: "/partners",
    http2: false,
    websocket: true,
  });

  app.register(proxy, {
    upstream: process.env.BOOKING_SERVICE_URL || "http://0.0.0.0:3002",
    prefix: "/bookings",
    rewritePrefix: "/bookings",
    http2: false,
  });

  app.register(proxy, {
    upstream: process.env.ADMIN_SERVICE_URL || "http://0.0.0.0:3004",
    prefix: "/admin",
    rewritePrefix: "/admin",
    http2: false,
  });

  app.get("/health", async () => ({ status: "ok" }));

  app.addHook("onClose", async () => {
    if (wsGateway) {
      await wsGateway.shutdown();
    }
  });
}
