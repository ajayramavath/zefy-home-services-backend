import { FastifyInstance, FastifyRequest } from "fastify";
import { createClient } from "redis";

interface BookingParams {
  bookingId: string;
}

// A server side event endpoint which will update the details of the booking when called
export default async function sseRoutes(app: FastifyInstance) {
  app.get(
    "/booking/:bookingId",
    async (req: FastifyRequest<{ Params: BookingParams }>, reply) => {
      const bookingId = req.params.bookingId;
      const redisUrl = app.redis?.options?.url || process.env.REDIS_URL;

      const subscriber = createClient({ url: redisUrl });
      await subscriber.connect();

      reply.raw.writeHead(200, {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
      });

      const channel = `booking-updates:${bookingId}`;
      await subscriber.subscribe(channel, (message) => {
        reply.raw.write(`data: ${message}\n\n`);
      });

      req.raw.on("close", async () => {
        await subscriber.unsubscribe(channel);
        await subscriber.quit();
      });
    }
  );
}
