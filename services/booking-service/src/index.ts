import Fastify from "fastify";
import "dotenv/config";
import {
  mongoosePlugin,
  rabbitmqPlugin,
  redisPlugin,
  sessionPlugin
} from "@zf/common";

const PORT = process.env.PORT ? Number(process.env.PORT) : 3000;
const app = Fastify({ logger: true });

app.register(mongoosePlugin, { uri: process.env.MONGO_URI! });
app.register(redisPlugin, { url: process.env.REDIS_URL! });
app.register(rabbitmqPlugin, { url: process.env.AMQP_URL! });
app.register(sessionPlugin, {
  ttlSeconds: 180 * 24 * 3600,
  allowMultipleSessions: false,
});



// Health check
app.get("/bookings/health", async () => ({ status: "ok", service: "booking-service" }));

const start = async () => {
  try {
    await app.listen({ port: PORT, host: "0.0.0.0" });
    app.log.info(`🚀 booking-service running on port ${PORT}`);
  } catch (err) {
    app.log.error(err);
    process.exit(1);
  }
};

start();