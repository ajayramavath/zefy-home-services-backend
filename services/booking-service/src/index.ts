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
import { paymentRoutes } from "./routes/payment.routes";
import { BookingController } from "./controllers/booking.controller";

process.env.TZ = 'Asia/Kolkata';

const PORT = process.env.PORT ? Number(process.env.PORT) : 3002;
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

    const bookingController = new BookingController(app.bookingEventPublisher);
    app.register(hubRoutes, { prefix: "/bookings" });
    app.register(bookingRoutes, { prefix: "/bookings", bookingController });
    app.register(paymentRoutes, { prefix: "/bookings" });

    await app.listen({ port: PORT });
    app.log.info(`🚀 booking-service running on port ${PORT}`);
  } catch (err) {
    app.log.error(err);
    process.exit(1);
  }
};

start();
