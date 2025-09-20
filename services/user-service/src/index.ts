import Fastify from "fastify";
import "dotenv/config";
import {
  mongoosePlugin,
  redisPlugin,
  rabbitmqPlugin,
  sessionPlugin,
} from "@zf/common";
import userRoutes from "./routes/user.routes";
import { EventConsumer } from '@zf/common';
import { handleHubAssigned, setupEventHandlers } from './events/handlers';
import { EVENT_TYPES, QUEUES } from '@zf/common';

process.env.TZ = 'Asia/Kolkata';

const PORT = process.env.PORT ? Number(process.env.PORT) : 3001;
const app = Fastify({
  logger: {
    level: 'info',
  }
});

const start = async () => {
  try {
    await app.register(mongoosePlugin, {
      uri: process.env.MONGO_URI || 'mongodb://localhost:27017/zefy_users',
      retries: 5
    });
    await new Promise(resolve => setTimeout(resolve, 1000));

    if (!app.mongooseReady()) {
      throw new Error('MongoDB not ready after connection attempt');
    }
    app.log.info(`✅ MongoDB ready. State: ${app.mongooseState()}`);


    await app.register(redisPlugin, { url: process.env.REDIS_URL! });
    await app.register(rabbitmqPlugin, { url: process.env.AMQP_URL! });

    await app.register(sessionPlugin, {
      ttlSeconds: 180 * 24 * 3600,
      allowMultipleSessions: false,
    });

    const eventConsumer = new EventConsumer(app);
    eventConsumer.on(EVENT_TYPES.HUB_ASSIGNED, handleHubAssigned);
    app.log.info('User service event handlers are configured!');

    await eventConsumer.startConsuming(QUEUES.USER_EVENTS, [
      'hub.assigned',
      'user.*'
    ]);

    app.register(userRoutes, { prefix: "/users" });
    app.get("/users/health", async () => ({ status: "ok", service: "user-service" }));

    await app.listen({ port: PORT });
    app.log.info(`User Service running on http://localhost:${PORT}`);
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
