import Fastify from "fastify";
import "dotenv/config";
import {
  mongoosePlugin,
  rabbitmqPlugin,
  redisPlugin,
  sessionPlugin
} from "@zf/common";
import { hubRoutes } from "./routes/hub.routes";
import eventPublisher from "./plugins/eventPublisher";
import { Hub } from './models/hub.model'
import { bookingRoutes } from "./routes/booking.routes";
import { BookingsEventPublisher } from "./events/publisher";
import { BookingEventConsumer } from "./events/consumer";

const PORT = process.env.PORT ? Number(process.env.PORT) : 3000;
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

    await app.register(sessionPlugin, {
      ttlSeconds: 180 * 24 * 3600,
      allowMultipleSessions: false,
    });

    await app.register(eventPublisher);

    const bookingEventPublisher = new BookingsEventPublisher(app);
    const bookingEventConsumer = new BookingEventConsumer(app, bookingEventPublisher);
    await bookingEventConsumer.setUpEventListeners();

    app.get("/bookings/health", async () => ({ status: "ok", service: "booking-service" }));

    app.register(hubRoutes, { prefix: "/bookings" });
    app.register(bookingRoutes, { prefix: "/bookings" });

    await app.listen({ port: PORT, host: '0.0.0.0' });
    app.log.info(`🚀 booking-service running on port ${PORT}`);
  } catch (err) {
    app.log.error(err);
    process.exit(1);
  }
};

start();
