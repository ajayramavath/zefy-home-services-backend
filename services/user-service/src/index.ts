import Fastify from "fastify";
import swagger from "@fastify/swagger";
import swaggerUI from "@fastify/swagger-ui";
import "dotenv/config";
import {
  mongoosePlugin,
  redisPlugin,
  rabbitmqPlugin,
  sessionPlugin,
} from "@zf/common";
import userRoutes from "./routes/user.routes";

const PORT = process.env.PORT ? Number(process.env.PORT) : 3001;
const app = Fastify({ logger: true });

// Register plugins
app.register(mongoosePlugin, { uri: process.env.MONGO_URI! });
app.register(redisPlugin, { url: process.env.REDIS_URL! });
app.register(rabbitmqPlugin, { url: process.env.AMQP_URL! });
app.register(sessionPlugin, {
  // e.g. 7 days
  ttlSeconds: 180 * 24 * 3600,
  allowMultipleSessions: false,
});

app.register(swagger, {
  openapi: {
    info: {
      title: "Zefy Backend API",
      description: "Gateway + aggregation endpoints",
      version: "1.0.0",
    },
    servers: [{ url: "/", description: "Local dev" }],
  },
});

app.register(swaggerUI, {
  routePrefix: "/users/docs",
  uiConfig: {
    docExpansion: "none",
    deepLinking: false,
    url: "http://34.93.7.140",
  },
  staticCSP: true,
  transformStaticCSP: (header) => header,
});

app.register(userRoutes, { prefix: "/users" });
app.get("/users/health", async () => ({ status: "ok", service: "user-service" }));

const start = async () => {
  try {
    await app.listen({ port: PORT, host: "0.0.0.0" });
    app.log.info(`🚀 user-service running on port ${PORT}`);
  } catch (err) {
    app.log.error(err);
    process.exit(1);
  }
};

process.on('SIGINT', async () => {
  app.log.info('Received SIGINT, shutting down gracefully...');
  await app.close();
  process.exit(0);
});

start();
