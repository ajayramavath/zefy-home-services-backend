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
import registryPlugin from "./plugins/registry";
// import aggregatorRoutes from "./routes/aggregator.routes";
import parcelRoutes from "./routes/Parcel.router";
// import aggregatorWebhookRoutes from "./routes/aggregatorWebhook.routes";
// import sseRoutes from "./routes/sse.routes";
// import { startGozoWebhookConsumer } from "./utils/rabbitmqpublisher";

const PORT = process.env.PORT ? Number(process.env.PORT) : 3000;
const app = Fastify({ logger: true });

// Register plugins
app.register(mongoosePlugin, { uri: process.env.MONGO_URI! });
app.register(redisPlugin, { url: process.env.REDIS_URL! });
app.register(rabbitmqPlugin, { url: process.env.AMQP_URL! });
app.register(registryPlugin);

app.register(sessionPlugin, {
  // e.g. 7 days
  ttlSeconds: 180 * 24 * 3600,
  allowMultipleSessions: false,
});

app.register(swagger, {
  openapi: {
    info: {
      title: "Zefy Backend API",
      description: "Gateway + parcel endpoints",
      version: "1.0.0",
    },
    servers: [{ url: "/", description: "Local dev" }],
  },

  // you can also pass `refResolver`, `security`, `components`, etc.
});

app.register(swaggerUI, {
  routePrefix: "/parcel/docs", // host the interactive UI at /docs
  uiConfig: {
    docExpansion: "none",
    deepLinking: false,
    url: "http://34.93.7.140",
  },
  staticCSP: true,
  transformStaticCSP: (header) => header,
  // if you need to tweak the generated spec before UI renders, use:
  // transformSpecification: (swaggerObject, req, reply) => { …; return swaggerObject; },
});

// Register routes
app.register(parcelRoutes, { prefix: "/parcel" });
// app.register(aggregatorRoutes, { prefix: "/parcel" });
// app.register(favoritesRoutes, { prefix: "/users" });

// Health check
app.get("/health", async () => ({ status: "ok" }));

const start = async () => {
  try {
    await app.listen({ port: PORT, host: "0.0.0.0" });
    app.log.info(`🚀 parcel-service running on port ${PORT}`);

    // await app.ready();
    // const { channel } = app.rabbitmq;

    // await startGozoWebhookConsumer(channel);
    // app.log.info("🎧 Gozo RabbitMQ consumer started");
  } catch (err) {
    app.log.error(err);
    process.exit(1);
  }
};

start();
