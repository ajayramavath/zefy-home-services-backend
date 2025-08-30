import Fastify from "fastify";
import routes from "./routes";
import "dotenv/config";
import { rabbitmqPlugin, redisPlugin } from "@zf/common";
import cors from '@fastify/cors';

const PORT = process.env.PORT ? Number(process.env.PORT) : 3000;
const app = Fastify({
  logger: {
    level: 'info',
  }
});

const start = async () => {
  try {

    await app.register(cors, {
      origin: true,
      credentials: true
    });

    await app.register(redisPlugin, {
      url: process.env.REDIS_URL || 'redis://localhost:6379'
    });

    await app.register(rabbitmqPlugin, {
      url: process.env.AMQP_URL || 'amqp://admin:password123@localhost:5672'
    });

    await app.register(routes);

    await app.listen({ port: PORT, host: '0.0.0.0' });
    app.log.info(`🚪 Gateway listening on port ${PORT}`);
  } catch (err) {
    app.log.error(err);
    process.exit(1);
  }
};

start();
