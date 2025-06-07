import { FastifyInstance } from "fastify";
import { AggregatorController } from "../controllers/aggregator.controller";
import {
  linkAccountSchema,
  getFaresSchema,
  createBookingSchema,
  getBookingDetailsSchema,
} from "../schemas/aggregator.schema";

export default async function aggregatorRoutes(app: FastifyInstance) {
  app.post(
    "/link",
    { schema: linkAccountSchema },
    AggregatorController.linkAccount
  );

  app.post("/fares", { schema: getFaresSchema }, AggregatorController.getFares);

  app.post(
    "/api/bookings",
    { schema: createBookingSchema },
    AggregatorController.createBooking
  );

  app.post(
    "/api/booking/details",
    { schema: getBookingDetailsSchema },
    AggregatorController.getBookingDetails
  );
}
