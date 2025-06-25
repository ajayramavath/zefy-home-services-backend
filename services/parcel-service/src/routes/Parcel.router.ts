import { FastifyInstance } from "fastify";
import { ParcelController } from "../controllers/parcel.controller";
import {
  cancelOrderSchema,
  createOrderSchema,
  getOrderStatusSchema,
  getParcelOrderByIdSchema,
  getQuoteSchema,
  listParcelOrdersSchema,
} from "../schemas/parcel.schema";

export default async function parcelRoutes(app: FastifyInstance) {
  app.post("/quotes", { schema: getQuoteSchema }, ParcelController.getQuote);
  app.post(
    "/orders/create",
    // { schema: createOrderSchema },
    ParcelController.createPorterOrder
  );
  app.post(
    "/orders/status",
    // { schema: getOrderStatusSchema },
    ParcelController.getPorterOrderStatus
  );
  app.post(
    "/orders/cancel",
    // { schema: cancelOrderSchema },
    ParcelController.cancelPorterOrder
  );

  app.get(
    "/orders/:orderId",
    // { schema: getParcelOrderByIdSchema },
    ParcelController.getParcelOrderById
  );
  app.get(
    "/orders",
    // { schema: listParcelOrdersSchema },
    ParcelController.listParcelOrders
  );
}
