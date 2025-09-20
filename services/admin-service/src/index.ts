import Fastify from "fastify";
import "dotenv/config";
import {
  mongoosePlugin,
  rabbitmqPlugin,
  redisPlugin,
  sessionPlugin,
  adminSessionPlugin
} from "@zf/common";
import { adminRoutes } from "./routes/admin.routes";

process.env.TZ = 'Asia/Kolkata';


const PORT = process.env.PORT ? Number(process.env.PORT) : 3004;
const app = Fastify({
  logger: {
    level: 'info',
  }
});

const start = async () => {
  try {
    await app.register(mongoosePlugin, {
      uri: process.env.MONGO_URI!,
      retries: 5
    });
    await new Promise(resolve => setTimeout(resolve, 1000));
    if (!app.mongooseReady()) {
      throw new Error('MongoDB not ready after connection attempt');
    }
    app.log.info(`✅ MongoDB ready. State: ${app.mongooseState()}`);

    await app.register(redisPlugin, { url: process.env.REDIS_URL! });
    await app.register(rabbitmqPlugin, { url: process.env.AMQP_URL! });

    app.get('/admin/health', async () => {
      return {
        status: 'OK',
        service: 'admin-service'
      };
    });

    await app.register(adminSessionPlugin, {
      ttlSeconds: 180 * 24 * 3600,
      allowMultipleSessions: false,
    });

    await app.register(adminRoutes, { prefix: "/admin" });


    await app.listen({ port: PORT });
    app.log.info(`🚀 admin-service running on port ${PORT}`);
  } catch (error) {
  }
}

start();
