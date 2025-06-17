import { FastifyInstance } from "fastify";
import { ParcelController } from "../controllers/parcel.controller";
import {
  cancelOrderSchema,
  createOrderSchema,
  getOrderStatusSchema,
  getQuoteSchema,
} from "../schemas/parcel.schema";

export default async function parcelRoutes(app: FastifyInstance) {
  app.post("/quotes", { schema: getQuoteSchema }, ParcelController.getQuote);
  app.post(
    "/orders/create",
    { schema: createOrderSchema },
    ParcelController.createPorterOrder
  );
  app.post(
    "/orders/status",
    { schema: getOrderStatusSchema },
    ParcelController.getPorterOrderStatus
  );
  app.post(
    "/orders/cancel",
    { schema: cancelOrderSchema },
    ParcelController.cancelPorterOrder
  );
}
