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
import favoritesRoutes from "./routes/favorites.routes";
import firebasePlugin from "./plugins/firebase";

const PORT = process.env.PORT ? Number(process.env.PORT) : 3000;
const app = Fastify({ logger: true });

// Register plugins
app.register(mongoosePlugin, { uri: process.env.MONGO_URI! });
app.register(redisPlugin, { url: process.env.REDIS_URL! });
app.register(rabbitmqPlugin, { url: process.env.AMQP_URL! });
app.register(firebasePlugin);
app.register(sessionPlugin, {
  // e.g. 7 days
  ttlSeconds: 7 * 24 * 3600,
  allowMultipleSessions: false,
});

app.register(swagger, {
  openapi: {
    info: {
      title: "Zefy Backend API",
      description: "Gateway + aggregation endpoints",
      version: "1.0.0",
    },
    servers: [{ url: "http://localhost:3000", description: "Local dev" }],
  },

  // you can also pass `refResolver`, `security`, `components`, etc.
});

app.register(swaggerUI, {
  routePrefix: "/users/docs", // host the interactive UI at /docs
  uiConfig: {
    docExpansion: "none",
    deepLinking: false,
  },
  staticCSP: true,
  transformStaticCSP: (header) => header,
  // if you need to tweak the generated spec before UI renders, use:
  // transformSpecification: (swaggerObject, req, reply) => { …; return swaggerObject; },
});

// Register routes
app.register(userRoutes, { prefix: "/users" });
app.register(favoritesRoutes, { prefix: "/users" });

// Health check
app.get("/health", async () => ({ status: "ok" }));

const start = async () => {
  try {
    await app.listen({ port: PORT, host: "0.0.0.0" });
    app.log.info(`🚀 user-service running on port ${PORT}`);
  } catch (err) {
    app.log.error(err);
    process.exit(1);
  }
};

start();
