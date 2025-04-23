import Fastify from "fastify";
import "dotenv/config";
import mongoosePlugin from "./plugins/mongoose";
import redisPlugin from "./plugins/redis";
import rabbitmqPlugin from "./plugins/rabbitmq";
import userRoutes from "./routes/user.routes";

const PORT = process.env.PORT ? Number(process.env.PORT) : 3000;
const app = Fastify({ logger: true });

// Register plugins
app.register(mongoosePlugin, { uri: process.env.MONGO_URI! });
app.register(redisPlugin, { url: process.env.REDIS_URL! });
app.register(rabbitmqPlugin, { url: process.env.AMQP_URL! });

// Register routes
app.register(userRoutes, { prefix: "/users" });

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
