import { FastifyInstance } from "fastify";
import { AggregatorController } from "../controllers/aggregator.controller";
import {
  linkAccountSchema,
  getFaresSchema,
  createBookingSchema,
  getBookingDetailsSchema,
  getCancellationListSchema,
  cancelBookingSchema,
  listBookingsSchema,
} from "../schemas/aggregator.schema";

export default async function aggregatorRoutes(app: FastifyInstance) {
  app.post(
    "/link",
    { schema: linkAccountSchema },
    AggregatorController.linkAccount
  );

  app.post("/fares", { schema: getFaresSchema }, AggregatorController.getFares);

  app.post(
    "/createBooking",
    { schema: createBookingSchema },
    AggregatorController.createBooking
  );

  app.post(
    "/bookingDetails",
    { schema: getBookingDetailsSchema },
    AggregatorController.getBookingDetails
  );

  app.post(
    "/cancellationList",
    { schema: getCancellationListSchema },
    AggregatorController.getCancellationList
  );

  // Cancel a booking
  app.post(
    "/cancelBooking",
    // { schema: cancelBookingSchema },
    AggregatorController.cancelBooking
  );

  app.get(
    "/bookingList",
    { schema: listBookingsSchema },
    AggregatorController.listBookings
  );
}
