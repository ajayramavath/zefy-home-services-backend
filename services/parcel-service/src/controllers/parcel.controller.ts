import { FastifyReply, FastifyRequest } from "fastify";
import { OrderRequest, QuoteRequest } from "@zf/types";
import { PorterStatus } from "../providers/PorterAdapter";
import {
  GetQuotesResponse,
  CreateOrderResponse,
  OrderStatusResponse,
  CancelOrderResponse,
  ErrorResponse,
} from "../types/provider";
import mongoose from "mongoose";
import { ParcelOrder } from "../models/ParcelOrder.model";

export class ParcelController {
  static async getQuote(
    req: FastifyRequest<{ Body: QuoteRequest }>,
    reply: FastifyReply
  ): Promise<GetQuotesResponse> {
    const adapters = req.server.parcels;
    const quotePromises = Object.values(adapters).map((adapter) =>
      adapter.getQuote(req.body).then(
        (quote) => ({ provider: adapter.name, quote }),
        (err) => ({ provider: adapter.name, error: err.message })
      )
    );

    const results = await Promise.all(quotePromises);
    console.log("controller results---->", JSON.stringify(results));
    return reply.send({ success: true, data: results });
  }

  static async createPorterOrder(
    req: FastifyRequest<{ Body: OrderRequest }>,
    reply: FastifyReply
  ): Promise<CreateOrderResponse | ErrorResponse> {
    const { provider } = req.body;
    const userId = req.session.userId;
    console.log("session userId---->", userId);
    const adapter = req.server.parcels[provider];

    if (!adapter) {
      return reply.status(400).send({
        success: false,
        message: "Invalid provider",
      });
    }

    const order = await adapter.createPorterOrder(req.body, userId);
    return reply.send({ success: true, data: order });
  }

  static async getPorterOrderStatus(
    req: FastifyRequest<{ Body: PorterStatus }>,
    reply: FastifyReply
  ): Promise<OrderStatusResponse | ErrorResponse> {
    const { provider, orderId } = req.body;
    const userId = req.session.userId;
    console.log("session userId---->", userId);
    const adapter = req.server.parcels[provider];

    if (!adapter) {
      return reply.status(400).send({
        success: false,
        message: "Invalid provider",
      });
    }

    const status = await adapter.getPorterOrderStatus(
      {
        provider,
        orderId,
      },
      userId
    );
    return reply.send({ success: true, data: status });
  }

  static async cancelPorterOrder(
    req: FastifyRequest<{ Body: PorterStatus }>,
    reply: FastifyReply
  ): Promise<CancelOrderResponse | ErrorResponse> {
    const { provider, orderId } = req.body;
    const userId = req.session.userId;
    console.log("session userId---->", userId);
    const adapter = req.server.parcels[provider];

    if (!adapter) {
      return reply.status(400).send({
        success: false,
        message: "Invalid provider",
      });
    }

    const result = await adapter.cancelPorterOrder(
      {
        provider,
        orderId,
      },
      userId
    );
    return reply.send({ success: true, data: result });
  }

  static async getParcelOrderById(
    req: FastifyRequest<{ Params: { orderId: string } }>,
    reply: FastifyReply
  ) {
    const { orderId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(orderId)) {
      return reply.status(400).send({ error: "Invalid order ID" });
    }

    try {
      const order = await ParcelOrder.findById(orderId).lean();
      if (!order) {
        return reply.status(404).send({ error: "Order not found" });
      }
      return reply.send({ success: true, data: order });
    } catch (err: any) {
      req.log.error(err);
      return reply.status(500).send({
        success: false,
        message: "Failed to fetch the parcel order",
      });
    }
  }

  static async listParcelOrders(
    req: FastifyRequest<{ Querystring: { limit?: string; cursor?: string } }>,
    reply: FastifyReply
  ) {
    const userId = req.session?.userId;
    if (!userId) {
      return reply.status(401).send({ error: "Unauthorized" });
    }

    const limit = Math.min(parseInt(req.query.limit || "10", 10), 50); // max 50
    const cursor = req.query.cursor ? new Date(req.query.cursor) : null;

    const query: any = { userId };
    if (cursor) {
      query.createdAt = { $lt: cursor }; // fetch older than cursor
    }

    try {
      const orders = await ParcelOrder.find(query)
        .sort({ createdAt: -1 })
        .limit(limit + 1) // fetch one extra to check if more exist
        .lean();

      const hasMore = orders.length > limit;
      const trimmed = hasMore ? orders.slice(0, limit) : orders;

      return reply.send({
        success: true,
        data: trimmed,
        meta: {
          limit,
          nextCursor: hasMore ? trimmed[trimmed.length - 1].createdAt : null,
          hasMore,
        },
      });
    } catch (err: any) {
      req.log.error(err);
      return reply.status(500).send({
        success: false,
        message: "Failed to fetch parcel orders",
      });
    }
  }
}
